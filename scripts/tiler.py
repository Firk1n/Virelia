"""Slice a flat PNG into a TMS tile pyramid.

Produces byte-equivalent output to `gdal2tiles --profile raster --zoom 0-N`,
which is how tiles/, tiles-topo/ and tiles-labels/ were originally built in
QGIS. Reimplemented here so the map can be rebuilt without QGIS or GDAL.

The two rules that make it match gdal2tiles:

  * TMS layout - tile row 0 is the BOTTOM of the image, and the tile grid is
    anchored to the image's bottom-left corner. An 8096x4048 source therefore
    pads to 8192x4096 with the padding on the TOP and the RIGHT.
  * "average" resampling that IGNORES fully transparent source pixels. Each
    overview pixel is the mean of whichever of its four children have alpha>0
    (rounded half up); if all four are transparent the result is (0,0,0,0).
    Averaging them in would drag the colour of every label edge toward
    whatever junk RGB sits under the transparent parts of the PNG.
"""

import math
import os
import shutil

import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None

TILE = 256


def _pad_to_grid(img):
    """Place the source on a whole number of tiles, padding top and right."""
    w, h = img.size
    nx, ny = math.ceil(w / TILE), math.ceil(h / TILE)
    canvas = Image.new("RGBA", (nx * TILE, ny * TILE), (0, 0, 0, 0))
    canvas.paste(img, (0, ny * TILE - h))
    return canvas


def _downsample(arr):
    """Halve an RGBA array, averaging only over pixels with alpha > 0."""
    quads = [arr[j::2, i::2, :].astype(np.uint32) for j in (0, 1) for i in (0, 1)]
    mask = [(q[:, :, 3] > 0).astype(np.uint32) for q in quads]

    count = sum(mask)
    out = np.zeros(quads[0].shape, dtype=np.uint8)
    contributing = count > 0
    denom = np.where(contributing, count, 1)

    for band in range(4):
        total = sum(q[:, :, band] * m for q, m in zip(quads, mask))
        # floor((2*total + count) / (2*count)) == round-half-up of total/count
        value = (2 * total + denom) // (2 * denom)
        out[:, :, band] = np.where(contributing, value, 0).astype(np.uint8)
    return out


FORMATS = {
    "png": (".png", "image/png", {}),
    # Lossless WebP: identical pixels, ~37% smaller than PNG on this artwork.
    # method is the encoder effort knob; measured per 256px tile of the land map:
    #   0 -> 94.9 KB @ 6ms    2 -> 91.4 KB @ 19ms
    #   4 -> 88.3 KB @ 117ms  6 -> 87.9 KB @ 1544ms   (PNG for comparison: 133.8 KB)
    # 2 gets almost all of the saving for a sixth of the time, so it is the default.
    #
    # "lossless" here means every visible pixel is preserved exactly. The encoder
    # does rewrite the RGB hidden underneath fully transparent pixels, because
    # discarding it compresses better -- verified against the PNG build, alpha is
    # identical everywhere and RGB matches wherever alpha > 0. Overview levels are
    # unaffected either way: they are averaged from the source image in memory,
    # before anything is encoded. Add "exact": True to keep the hidden RGB too.
    "webp": (".webp", "image/webp", {"lossless": True, "quality": 100, "method": 2}),
}


def _tilemapresource(w, h, minz, maxz, title, ext="png", mime="image/png"):
    sets = "\n".join(
        '        <TileSet href="{z}" units-per-pixel="{u:.14f}" order="{z}"/>'.format(
            z=z, u=2.0 ** (maxz - z)
        )
        for z in range(minz, maxz + 1)
    )
    return f"""<?xml version="1.0" encoding="utf-8"?>
    <TileMap version="1.0.0" tilemapservice="http://tms.osgeo.org/1.0.0">
      <Title>{title}</Title>
      <Abstract></Abstract>
      <SRS></SRS>
      <BoundingBox minx="0.00000000000000" miny="-{h}.00000000000000" maxx="{w}.00000000000000" maxy="0.00000000000000"/>
      <Origin x="0.00000000000000" y="-{h}.00000000000000"/>
      <TileFormat width="{TILE}" height="{TILE}" mime-type="{mime}" extension="{ext.lstrip('.')}"/>
      <TileSets profile="raster">
{sets}
      </TileSets>
    </TileMap>"""


def build(src_png, out_dir, min_zoom=0, max_zoom=None, title="Virelia", clean=True,
          fmt="png", log=print):
    """Write a TMS pyramid for `src_png` into `out_dir`."""
    if fmt not in FORMATS:
        raise ValueError(f"unknown tile format {fmt!r}; expected one of {sorted(FORMATS)}")
    ext, mime, save_opts = FORMATS[fmt]

    img = Image.open(src_png).convert("RGBA")
    w, h = img.size

    if max_zoom is None:
        max_zoom = math.ceil(math.log2(max(w, h) / TILE))

    if clean and os.path.isdir(out_dir):
        for z in os.listdir(out_dir):
            if z.isdigit():
                shutil.rmtree(os.path.join(out_dir, z))
    os.makedirs(out_dir, exist_ok=True)

    arr = np.asarray(_pad_to_grid(img))
    log(f"  source {w}x{h} -> grid {arr.shape[1]}x{arr.shape[0]}, zoom {min_zoom}-{max_zoom}")

    written = 0
    for z in range(max_zoom, min_zoom - 1, -1):
        nx = math.ceil(w / TILE / 2 ** (max_zoom - z))
        ny = math.ceil(h / TILE / 2 ** (max_zoom - z))

        # Lower zooms round up to a full tile; anchor the content bottom-left.
        if arr.shape[0] < ny * TILE or arr.shape[1] < nx * TILE:
            padded = np.zeros((ny * TILE, nx * TILE, 4), dtype=np.uint8)
            padded[ny * TILE - arr.shape[0]:, : arr.shape[1]] = arr
            arr = padded

        for tx in range(nx):
            col = os.path.join(out_dir, str(z), str(tx))
            os.makedirs(col, exist_ok=True)
            for ty in range(ny):
                top = (ny - 1 - ty) * TILE
                tile = arr[top:top + TILE, tx * TILE:(tx + 1) * TILE]
                Image.fromarray(tile, "RGBA").save(
                    os.path.join(col, f"{ty}{ext}"), **save_opts)
                written += 1
        log(f"  z{z}: {nx}x{ny} tiles")

        if z > min_zoom:
            arr = _downsample(arr)

    with open(os.path.join(out_dir, "tilemapresource.xml"), "w", encoding="utf-8") as f:
        f.write(_tilemapresource(w, h, min_zoom, max_zoom, title, ext, mime))

    return written
