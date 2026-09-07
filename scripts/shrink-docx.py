"""Prepare the copy of Virelia.docx that gets exported to the Book PDF.

The document is 108 MB, and 100 MB of that is thirty-four photographic
illustrations stored as lossless RGBA PNGs at roughly 1800px. That is more
than a website should ever hand a reader, and Word cannot export it under
automation -- ninety minutes on the full file without finishing, twelve
minutes without even reaching page four.

So the print copy re-encodes those to JPEG at the *same pixel dimensions* --
nothing is resized, nothing moves, the layout is untouched -- and leaves alone
anything whose alpha channel is actually doing work, like the faction sigils.
108 MB becomes 29 MB, which Word exports interactively without complaint.

    python scripts/shrink-docx.py

Writes build/Virelia-print.docx and prints the one manual step that follows.
Nothing here writes to the author's .docx.
"""
import io
import json
import re
import shutil
import sys
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
META = ROOT / "content" / "entry-meta.json"
OUT = ROOT / "build" / "Virelia-print.docx"

QUALITY = 88          # visually indistinguishable at print size; ~20x smaller
MIN_BYTES = 300_000   # below this the saving is not worth a re-encode


def has_real_alpha(image):
    """True when the alpha channel actually varies -- a sigil, not a photo."""
    if image.mode not in ("RGBA", "LA", "P"):
        return False
    if image.mode == "P":
        if "transparency" not in image.info:
            return False
        image = image.convert("RGBA")
    alpha = image.getchannel("A")
    low, high = alpha.getextrema()
    return low < 250


def to_jpeg(image):
    if image.mode != "RGB":
        image = image.convert("RGB")
    buffer = io.BytesIO()
    image.save(buffer, "JPEG", quality=QUALITY, optimize=True, progressive=True)
    return buffer.getvalue()


def main():
    meta = json.loads(META.read_text(encoding="utf-8"))
    source = Path(meta["source"]).with_suffix(".docx")
    if not source.exists():
        sys.exit(f"No .docx beside the configured source: {source}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    archive = zipfile.ZipFile(source)

    # media name -> replacement name, for the parts that reference them
    renamed = {}
    payloads = {}
    kept = 0
    for name in archive.namelist():
        if not name.startswith("word/media/"):
            continue
        raw = archive.read(name)
        if name.lower().endswith((".jpg", ".jpeg")) or len(raw) < MIN_BYTES:
            kept += 1
            continue
        try:
            image = Image.open(io.BytesIO(raw))
            image.load()
        except Exception:
            kept += 1
            continue
        if has_real_alpha(image):
            kept += 1
            continue
        data = to_jpeg(image)
        if len(data) >= len(raw):
            kept += 1
            continue
        target = re.sub(r"\.[^.]+$", ".jpeg", name)
        renamed[name] = target
        payloads[target] = data

    if not renamed:
        print("Nothing worth re-encoding; copying as-is.")
        shutil.copyfile(source, OUT)
        next_step()
        return

    short = {Path(k).name: Path(v).name for k, v in renamed.items()}

    def rewrite(text):
        # Relationship targets are written as "media/imageN.png", so match on
        # the bare filename rather than the full part path.
        for old, new in short.items():
            text = text.replace(old, new)
        return text

    before = source.stat().st_size
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as out:
        for item in archive.infolist():
            name = item.filename
            if name in renamed:
                out.writestr(renamed[name], payloads[renamed[name]])
                continue
            data = archive.read(name)
            if name == "[Content_Types].xml":
                text = data.decode("utf-8")
                if 'Extension="jpeg"' not in text:
                    text = re.sub(
                        r"(<Types[^>]*>)",
                        r'\1<Default Extension="jpeg" ContentType="image/jpeg"/>',
                        text, count=1)
                data = text.encode("utf-8")
            elif name.endswith(".rels"):
                data = rewrite(data.decode("utf-8")).encode("utf-8")
            out.writestr(item, data)

    after = OUT.stat().st_size
    print(f"Source: {source}")
    print(f"Re-encoded {len(renamed)} images to JPEG q{QUALITY}; kept {kept} as they were")
    print(f"Wrote {OUT}  ({before / 1e6:.0f} MB -> {after / 1e6:.0f} MB)")
    next_step()


def next_step():
    """Word does the conversion, and it has to be Word doing it interactively.

    scripts/export-book-pdf.ps1 drives the same export over COM and is left in
    the repo, but on this document it does not finish in any usable time. The
    interactive path takes a couple of minutes.
    """
    print()
    print("Now, in Word:")
    print(f"  File > Open     {OUT}")
    print(f"  File > Save As  {ROOT / 'book' / 'Virelia.pdf'}  (type: PDF)")
    print()
    print("The site's Book button picks it up as soon as the file is there.")


if __name__ == "__main__":
    main()
