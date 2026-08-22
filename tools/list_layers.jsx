// Dump the layer tree of the open document to a text file.
//
// Run it from Photoshop: File > Scripts > Browse..., pick this file.
// (Or `python tools/build_map.py --list --tree`, which does the same thing
// without leaving the terminal.)
//
// Top-level entries are numbered and show the exact name to paste into
// tools/map_layers.json. Where a name is used twice, the second one is
// written as "Name#2", which is what the config expects.

#target photoshop

var OUTPUT = "~/Desktop/layers_export.txt";

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
        var isGroup = (layer.typename === "LayerSet");
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
        if (isGroup) walk(layer.layers, indent + "    ", false);
    }
}

var doc = app.activeDocument;
walk(doc.layers, "", true);

var header = [
    doc.name + "   " + doc.width.value + " x " + doc.height.value,
    "",
    'Top-level groups are numbered. The quoted name on the right is what goes',
    'into the "show" lists in tools/map_layers.json.',
    "",
    ""
].join("\n");

var file = new File(OUTPUT);
file.encoding = "UTF-8";      // the old version used the system codepage, which
file.lineFeed = "Unix";       // mangled curly quotes and accented names
file.open("w");
file.write(header + out.join("\n") + "\n");
file.close();

alert("Saved " + out.length + " layers to:\n" + file.fsName);
