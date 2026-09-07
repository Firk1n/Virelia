"""Drive Photoshop from Python to export flattened PNGs out of the map PSD.

Photoshop registers a COM automation server on Windows, so we can hand it an
ExtendScript job without any pip dependencies -- PowerShell creates the COM
object for us. The point is to open the (very large) PSD exactly once and pull
every variant out of that single session.
"""

import json
import os
import subprocess
import tempfile

PS_PROGID = "Photoshop.Application"


class PhotoshopError(RuntimeError):
    pass


def _jsx_string(value):
    return json.dumps(str(value))


LIST_JSX = r"""
#target photoshop
app.displayDialogs = DialogModes.NO;
var doc = openDoc(%(psd)s);
var names = [];
for (var i = 0; i < doc.layers.length; i++) names.push(doc.layers[i].name);
if (WE_OPENED_IT) doc.close(SaveOptions.DONOTSAVECHANGES);
names.join("\n");
"""

EXPORT_JSX = r"""
#target photoshop
app.displayDialogs = DialogModes.NO;

var doc = openDoc(%(psd)s);
var jobs = %(jobs)s;

// Exporting toggles layer visibility and restores it in the finally block below,
// which still counts as an edit as far as Photoshop is concerned -- so an already
// open document ends up flagged as modified even though nothing really changed.
// Worth saying out loud, but not worth refusing to run over.
var dirty = (!WE_OPENED_IT && !doc.saved);

var tops = [];
for (var i = 0; i < doc.layers.length; i++) tops.push(doc.layers[i]);

var original = [];
for (var i = 0; i < tops.length; i++) original.push(tops[i].visible);

var done = [];
try {
    for (var j = 0; j < jobs.length; j++) {
        for (var i = 0; i < tops.length; i++) tops[i].visible = false;
        for (var k = 0; k < jobs[j].show.length; k++) tops[jobs[j].show[k]].visible = true;

        var opts = new PNGSaveOptions();
        opts.compression = 6;
        opts.interlaced = false;
        doc.saveAs(new File(jobs[j].file), opts, true);
        done.push(jobs[j].name);
    }
} finally {
    for (var i = 0; i < tops.length; i++) tops[i].visible = original[i];
}
if (WE_OPENED_IT) doc.close(SaveOptions.DONOTSAVECHANGES);
"OK " + (dirty ? "DIRTY " : "CLEAN ") + done.join(",");
"""


TREE_JSX = r"""
#target photoshop
app.displayDialogs = DialogModes.NO;

var doc = openDoc(%(psd)s);
var out = [];
var seen = {};
var topIndex = 0;

function pad(s, n) {
    s = String(s);
    while (s.length < n) s += " ";
    return s;
}

function walk(layers, indent, isTop) {
    for (var i = 0; i < layers.length; i++) {
        var layer = layers[i];
        var isGroup = (layer.typename == "LayerSet");
        var line = indent + (isGroup ? "[+] " : "    ") + layer.name;
        if (isTop) {
            seen[layer.name] = (seen[layer.name] || 0) + 1;
            var selector = layer.name;
            if (seen[layer.name] > 1) selector += "#" + seen[layer.name];
            line = pad(topIndex, 4) + pad(line, 44) + '  ->  "' + selector + '"';
            topIndex++;
        }
        if (!layer.visible) line += "   (hidden)";
        out.push(line);
        if (isGroup && %(deep)s) walk(layer.layers, indent + "    ", false);
    }
}

walk(doc.layers, "", true);
if (WE_OPENED_IT) doc.close(SaveOptions.DONOTSAVECHANGES);
out.join("\n");
"""

OPEN_DOC_JSX = r"""
var WE_OPENED_IT = false;
function openDoc(path) {
    var f = new File(path);
    if (!f.exists) throw new Error("PSD not found: " + path);
    for (var i = 0; i < app.documents.length; i++) {
        var d = app.documents[i];
        try {
            if (d.fullName.fsName == f.fsName) { app.activeDocument = d; return d; }
        } catch (e) {}
    }
    WE_OPENED_IT = true;
    var d = app.open(f);
    app.activeDocument = d;
    return d;
}
"""


def _run_jsx(source, timeout):
    """Execute ExtendScript inside Photoshop and return whatever it evaluates to."""
    jsx = tempfile.NamedTemporaryFile("w", suffix=".jsx", delete=False,
                                      encoding="utf-8", newline="\n")
    jsx.write(OPEN_DOC_JSX + source)
    jsx.close()

    ps1 = tempfile.NamedTemporaryFile("w", suffix=".ps1", delete=False,
                                      encoding="utf-8", newline="\r\n")
    # Photoshop's COM server rejects calls while it is busy (RPC_E_CALL_REJECTED /
    # RPC_E_SERVERCALL_RETRYLATER) -- opening a huge PSD does exactly that -- and
    # can also refuse to launch while it is still booting. Retry those instead of
    # failing the build.
    ps1.write(f"""$ErrorActionPreference = 'Stop'
$busy = @(-2147417846, -2147418111, -2146959355, -2147417851)
function Test-Busy($err) {{
    $e = $err.Exception
    while ($e) {{
        if ($busy -contains $e.HResult) {{ return $true }}
        $e = $e.InnerException
    }}
    return $false
}}
$code = Get-Content -Raw -Encoding UTF8 '{jsx.name}'
$deadline = (Get-Date).AddSeconds({timeout})
$app = $null
while ($true) {{
    try {{ $app = New-Object -ComObject {PS_PROGID}; break }}
    catch {{
        if (-not (Test-Busy $_) -or (Get-Date) -gt $deadline) {{ throw }}
        Start-Sleep -Seconds 2
    }}
}}
while ($true) {{
    try {{ $out = $app.DoJavaScript($code); break }}
    catch {{
        if (-not (Test-Busy $_) -or (Get-Date) -gt $deadline) {{ throw }}
        Start-Sleep -Seconds 3
    }}
}}
Write-Output $out
""")
    ps1.close()

    try:
        proc = subprocess.run(
            ["powershell.exe", "-NoProfile", "-NonInteractive",
             "-ExecutionPolicy", "Bypass", "-File", ps1.name],
            capture_output=True, text=True, timeout=timeout + 120,
        )
    finally:
        for path in (jsx.name, ps1.name):
            try:
                os.unlink(path)
            except OSError:
                pass

    if proc.returncode != 0:
        raise PhotoshopError((proc.stderr or proc.stdout).strip())
    return proc.stdout.strip()


def list_tree(psd, deep=True, timeout=1800):
    """Render the layer tree the way scripts/list_layers.jsx does."""
    out = _run_jsx(
        TREE_JSX % {"psd": _jsx_string(psd), "deep": "true" if deep else "false"},
        timeout,
    )
    return out.splitlines()


def list_top_level(psd, timeout=1800):
    out = _run_jsx(LIST_JSX % {"psd": _jsx_string(psd)}, timeout)
    return [line.strip() for line in out.splitlines() if line.strip()]


def resolve(selectors, names):
    """Map config names ('Contour', 'Labels#2') to top-level layer indices."""
    indices = []
    for selector in selectors:
        wanted, _, nth = selector.partition("#")
        nth = int(nth) if nth else 1
        matches = [i for i, n in enumerate(names) if n == wanted]
        if len(matches) < nth:
            raise PhotoshopError(
                f"layer group {selector!r} not found in PSD.\n"
                "Top-level groups are:\n  " + "\n  ".join(
                    f"{i}: {n}" for i, n in enumerate(names))
            )
        indices.append(matches[nth - 1])
    return indices


def export(psd, jobs, timeout=3600):
    """jobs: [{'name': str, 'file': path, 'show': [layer indices]}]

    Returns True if the document was already open with unsaved changes, so the
    caller can mention that Photoshop will now ask about saving on close.
    """
    payload = json.dumps([
        {"name": j["name"], "file": str(j["file"]).replace("\\", "/"), "show": j["show"]}
        for j in jobs
    ])
    out = _run_jsx(EXPORT_JSX % {"psd": _jsx_string(psd), "jobs": payload}, timeout)
    if not out.startswith("OK"):
        raise PhotoshopError(f"Photoshop returned: {out!r}")
    return out.split()[1] == "DIRTY"
