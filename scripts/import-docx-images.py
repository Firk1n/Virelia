"""Pull the book's images out of Virelia.docx and say where each one belongs.

Virelia.txt is a text export, so it has no images at all -- it does not even
leave a marker where one was, only a run of blank lines. Sixty-eight pictures
are missing from the wiki that way, and some of them carry information rather
than atmosphere: the Greywater Compact's board roster is a picture of a table,
not a table.

So the prose still comes from Virelia.txt, and this script adds the one thing
that export cannot carry. Placement is matched, not guessed: every image is
anchored to the exact text of the paragraph it follows in the .docx, and the
build inserts it after the paragraph carrying that same text. An image whose
anchor cannot be found is reported rather than dropped somewhere plausible.

    python scripts/import-docx-images.py

Writes assets/book/<hash>.webp and generated/book-images.json.
"""
import hashlib
import io
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
META = ROOT / "content" / "entry-meta.json"
OUT_DIR = ROOT / "assets" / "book"
MANIFEST = ROOT / "generated" / "book-images.json"

W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
R = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
A = "{http://schemas.openxmlformats.org/drawingml/2006/main}"
WP = "{http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing}"

# Word measures a drawing's placed size in EMUs. 914400 to the inch, 96 CSS
# pixels to the inch.
EMU_PER_PX = 9525

# The wiki column is 450px and the book page about 800px, so 1400 is already
# generous on a 2x display. The originals are up to 5 MB of PNG each.
MAX_WIDTH = 1400
QUALITY = 80


def normalize(text):
    """The join between a .docx paragraph and a Virelia.txt line."""
    return re.sub(r"\s+", " ", text).strip()


def paragraph_text(node):
    """The paragraph's own text, not a text box's.

    A floating diagram is a <w:drawing> inside an otherwise empty paragraph,
    and its caption lives in a <w:txbxContent> underneath. Reading straight
    through with iter() merges that caption into the paragraph and anchors the
    image to its own label -- a string that appears nowhere in the prose.
    """
    parts = []

    def collect(current):
        for child in current:
            if child.tag == W + "txbxContent":
                continue
            if child.tag == W + "t":
                parts.append(child.text or "")
            else:
                collect(child)

    collect(node)
    return "".join(parts)


def blips(node):
    """Yield (rel-id, placed size in CSS px or None) for each drawing, in order.

    The placed size is the one that matters. A faction sigil is a 1074px file
    set on the page at about 2.7 inches, and taking the file's own dimensions
    is why the wiki showed it four times the size it is in the document. Word
    keeps the placed size in <wp:extent> beside the picture reference, so it
    costs nothing to carry it through.
    """
    for drawing in node.iter(W + "drawing"):
        size = None
        extent = drawing.find(".//" + WP + "extent")
        if extent is not None:
            cx, cy = extent.get("cx"), extent.get("cy")
            if cx and cy and int(cx) > 0 and int(cy) > 0:
                size = (round(int(cx) / EMU_PER_PX), round(int(cy) / EMU_PER_PX))
        for blip in drawing.iter(A + "blip"):
            embed = blip.get(R + "embed")
            if embed:
                yield embed, size
                break          # one picture per drawing


def walk_body(node):
    """Yield ('text', str) and ('image', rel-id) in document order.

    A table is opaque: its images are still reported where the table sits, but
    its cells are never used as anchors. Cell text is short, repetitive, and
    never appears as a standalone paragraph in the text export -- anchoring to
    "Work in progress" or "Brenst" leaves the image with nowhere to land.
    """
    for child in node:
        if child.tag == W + "p":
            text = normalize(paragraph_text(child))
            if text:
                yield "text", text
            for embed in blips(child):
                yield "image", embed
        elif child.tag == W + "tbl":
            for embed in blips(child):
                yield "image", embed
        else:
            yield from walk_body(child)


def column_width(document):
    """The document's text column, in CSS px, from its section settings.

    Needed to tell a symbol from an illustration. Virelia's images are placed
    either across the full column and beyond (scene art, bleeding into the
    margins) or at roughly half of it (faction sigils, race marks). The ratio
    survives being read on a phone; a pixel count does not.
    """
    section = document.find(".//" + W + "sectPr")
    if section is None:
        return None
    size = section.find(W + "pgSz")
    margin = section.find(W + "pgMar")
    if size is None or margin is None:
        return None
    try:
        width = int(size.get(W + "w"))
        left = int(margin.get(W + "left"))
        right = int(margin.get(W + "right"))
    except (TypeError, ValueError):
        return None
    twips = width - left - right
    return round(twips / 1440 * 96) if twips > 0 else None


def relationships(archive):
    rels = {}
    root = ElementTree.fromstring(archive.read("word/_rels/document.xml.rels"))
    for node in root.iter(REL + "Relationship"):
        rels[node.get("Id")] = node.get("Target")
    return rels


def convert(raw, destination):
    """Downscale to something a web page can actually use, and keep it stable."""
    image = Image.open(io.BytesIO(raw))
    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")
    if image.width > MAX_WIDTH:
        height = round(image.height * MAX_WIDTH / image.width)
        image = image.resize((MAX_WIDTH, height), Image.LANCZOS)
    image.save(destination, "WEBP", quality=QUALITY, method=6)
    return image.width, image.height


def main():
    meta = json.loads(META.read_text(encoding="utf-8"))
    docx = Path(meta["source"]).with_suffix(".docx")
    if not docx.exists():
        sys.exit(f"No .docx beside the configured source: {docx}")

    archive = zipfile.ZipFile(docx)
    rels = relationships(archive)
    document = ElementTree.fromstring(archive.read("word/document.xml"))
    body = document.find(W + "body")
    column = column_width(document)

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    anchor = None
    before = None          # the paragraph before the anchor, to disambiguate
    seen = {}
    entries = []
    orphans = 0
    for kind, value in walk_body(body):
        if kind == "text":
            before, anchor = anchor, value
            continue
        embed, placed = value
        target = rels.get(embed)
        if not target:
            orphans += 1
            continue
        if anchor is None:
            orphans += 1
            continue

        raw = archive.read("word/" + target.lstrip("/"))
        digest = hashlib.sha1(raw).hexdigest()[:12]
        if digest not in seen:
            name = digest + ".webp"
            width, height = convert(raw, OUT_DIR / name)
            seen[digest] = {"src": f"assets/book/{name}", "width": width, "height": height}
        record = dict(seen[digest])
        if placed:
            # Never upscale past the file we actually have: the document can
            # afford to stretch a small picture across a page, a screen cannot.
            record["displayWidth"] = min(placed[0], record["width"])
            record["displayHeight"] = round(
                record["height"] * record["displayWidth"] / record["width"])
            # A mark rather than a scene -- a sigil, a rune -- which wants to
            # stay small however wide the column it lands in. Two tests, and
            # both are needed: set well inside the column, and not taller than
            # it is wide. Width alone also catches the race portraits, which
            # are narrow only because they are tall.
            if (column and placed[0] < 0.75 * column
                    and placed[0] >= 0.9 * placed[1]):
                record["symbol"] = True
        # "Core Mechanics:" heads seven different race chapters, so the
        # preceding paragraph comes along as a tiebreak. Matching one line is
        # ambiguous; matching two has been unique across the whole book.
        entries.append(dict(record, anchor=anchor, after=before))

    # Two images can share an anchor (a pair under one paragraph); that is
    # fine and they are emitted in order.
    counts = {}
    for item in entries:
        counts[item["anchor"]] = counts.get(item["anchor"], 0) + 1

    manifest = {
        "version": 1,
        "source": str(docx),
        "sourceHash": hashlib.sha256(docx.read_bytes()).hexdigest(),
        "columnWidth": column,
        "images": entries,
    }
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(manifest, indent=1, ensure_ascii=False) + "\n",
                        encoding="utf-8")

    total = sum((OUT_DIR / Path(v["src"]).name).stat().st_size for v in seen.values())
    print(f"Source: {docx}")
    print(f"Images: {len(entries)} placements, {len(seen)} unique files, "
          f"{total / 1e6:.1f} MB")
    if orphans:
        print(f"Unanchored images skipped: {orphans}")
    stacked = {a: n for a, n in counts.items() if n > 1}
    if stacked:
        print(f"Anchors carrying more than one image: {len(stacked)}")


if __name__ == "__main__":
    main()
