"""Stitch the social preview card from the map's own tiles.

A link to Virelia pasted into Discord or a chat is, without this, a bare URL.
The card is the map itself -- base tiles plus the painted labels, the same two
layers the site opens with -- so the preview shows the thing being linked to
rather than a generic banner.

    python scripts/build-social-card.py

Writes assets/social-card.jpg at 1200x630, the size every scraper crops to.
Level 3 of the pyramid is used because it is the smallest level that still
carries legible place names.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LEVEL = 3
TILE = 256
OUT = ROOT / "assets" / "social-card.jpg"
SIZE = (1200, 630)


def stitch(directory: Path) -> Image.Image | None:
    """Compose one TMS pyramid level into a single image, or None if absent."""
    level = directory / str(LEVEL)
    if not level.is_dir():
        return None

    columns = sorted(int(p.name) for p in level.iterdir() if p.name.isdigit())
    if not columns:
        return None
    rows = sorted(
        int(p.stem) for p in (level / str(columns[0])).glob("*.webp") if p.stem.isdigit()
    )
    if not rows:
        return None

    canvas = Image.new("RGBA", (len(columns) * TILE, len(rows) * TILE), (0, 0, 0, 0))
    top = max(rows)
    for x in columns:
        for y in rows:
            tile = level / str(x) / f"{y}.webp"
            if not tile.exists():
                continue
            with Image.open(tile) as img:
                # TMS counts y from the bottom; the canvas counts from the top.
                canvas.paste(img.convert("RGBA"), ((x - columns[0]) * TILE, (top - y) * TILE))
    return canvas


def main() -> None:
    base = stitch(ROOT / "tiles")
    if base is None:
        raise SystemExit("No tiles/%d found. Build the map first." % LEVEL)

    labels = stitch(ROOT / "tiles-labels")
    if labels is not None:
        base = Image.alpha_composite(base, labels)

    # Crop to the card's aspect ratio around the middle before scaling, so the
    # map is not squashed and the scraper's own crop has nothing left to cut.
    want = SIZE[0] / SIZE[1]
    width, height = base.size
    if width / height > want:
        keep = int(height * want)
        box = ((width - keep) // 2, 0, (width - keep) // 2 + keep, height)
    else:
        keep = int(width / want)
        box = (0, (height - keep) // 2, width, (height - keep) // 2 + keep)

    card = base.crop(box).resize(SIZE, Image.LANCZOS)
    # The ocean colour from style.css, so any transparent margin matches the page.
    flat = Image.new("RGB", SIZE, (0x6D, 0x74, 0x6B))
    flat.paste(card, (0, 0), card)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    flat.save(OUT, "JPEG", quality=86, optimize=True, progressive=True)
    print("Wrote %s (%dx%d, %.0f KB)" % (
        OUT.relative_to(ROOT), SIZE[0], SIZE[1], OUT.stat().st_size / 1024))


if __name__ == "__main__":
    main()
