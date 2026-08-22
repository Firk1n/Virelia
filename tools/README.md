# Map build tools

Rebuilds `tiles/`, `tiles-topo/` and `tiles-labels/` straight from the Photoshop
source. Replaces the manual loop of "toggle layers, save a PNG, load it into
QGIS, run gdal2tiles, repeat three times".

```bash
python tools/build_map.py
```

That opens the PSD once, saves the three PNGs by toggling top-level group
visibility, and slices each into a zoom 0-5 TMS pyramid. Nothing in the PSD is
saved — visibility is restored when it finishes.

## Commands

| | |
|---|---|
| `python tools/build_map.py` | full rebuild |
| `python tools/build_map.py labels` | just the labels overlay |
| `python tools/build_map.py --list` | print the PSD's top-level groups, with indices |
| `python tools/build_map.py --list --tree` | ...and every nested layer under them |
| `python tools/build_map.py --list --tree --out layers.txt` | ...and write it to a UTF-8 file |
| `python tools/build_map.py --tiles-only` | re-tile the existing PNGs, no Photoshop |
| `python tools/build_map.py --force` | re-tile even if a PNG is unchanged |

Exported PNGs are fingerprinted by their pixels between runs, so re-tiling is
skipped for anything that did not actually change. (By pixels, not by file bytes
-- Photoshop does not write byte-identical PNGs twice for the same image.)

The PSD itself is never saved. Layer visibility is snapshotted before the export
and restored afterwards, even if the export fails partway. Photoshop still counts
that as an edit, though, so a document you already had open will be flagged as
modified when the build finishes; the build says so when it happens.

## Configuration

`map_layers.json` holds the PSD path, where the exported PNGs go, the tile image
format, and which
top-level groups each output turns on. Names must match the layer panel exactly;
where a name appears twice, `Name#2` means the second one from the top. Run
`--list` to see the live names.

`list_layers.jsx` prints the same listing from inside Photoshop
(File > Scripts > Browse...) for when you would rather not touch the terminal.
Both reuse the document if it is already open, so listing a PSD you are working
on is instant.

## Tile format

`"format": "webp"` writes lossless WebP instead of PNG -- identical pixels,
measured 36% smaller across the three pyramids (203 MB -> 130 MB), and 45%
smaller on the labels overlay. Alpha survives intact. The tile URLs in `main.js`
carry the extension, so switch both together.

Encoding is slower than PNG (about 16s per pyramid against 7s). That is with
the encoder's `method` set to 2, which gets nearly all of the size saving for a
sixth of the time -- see the table in `tiler.py`.

## Why not gdal2tiles

`tiler.py` reimplements `gdal2tiles --profile raster --zoom 0-5`, so QGIS and
GDAL are no longer needed — only Pillow and numpy. It was checked against all
three committed pyramids (683 tiles each) and reproduces every tile
pixel-for-pixel. Two details make that work:

* **TMS layout.** Row 0 is the bottom of the image and the grid is anchored to
  the bottom-left corner, so an 8096x4048 source pads to 8192x4096 with the
  padding on the *top* and *right*.
* **Alpha-aware averaging.** Overview pixels average only the children with
  alpha > 0. Averaging transparent pixels in would smear whatever junk RGB sits
  under the transparent parts of the PNG into every label edge.

## Requirements

Photoshop (driven over its COM automation server via PowerShell — no pip
install needed), plus `pillow` and `numpy`.
