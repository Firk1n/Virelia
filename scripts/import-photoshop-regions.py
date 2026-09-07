"""Import region-highlight geometry from painted layers in the Virelia PSD.

Each direct child of a top-level Photoshop layer group is one region. Its name
may be the entry id (``remosa``) or the visible entry name (``Remosa``). The
opaque pixels are traced into a simplified GeoJSON MultiPolygon and merged into
region-geometry.js. Existing geometry for regions not present in the PSD is
left alone, so this can coexist with hand-drawn exceptions.

Requires ``psd-tools`` in the Python environment used to run this script.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import subprocess
import sys
import tempfile
from pathlib import Path

# Windows opens .py files with the system Python, which intentionally has none
# of the heavy narration/PSD dependencies. Re-launch through the project's
# existing audio environment before importing either optional package, so both
# `.\import-photoshop-regions.py` and the documented explicit command work.
PROJECT = Path(__file__).resolve().parent.parent
VIRELIA_PYTHON = Path(r"C:\Users\Ofek\Downloads\Virelia\audio\.v312\Scripts\python.exe")
if VIRELIA_PYTHON.exists() and Path(sys.executable).resolve() != VIRELIA_PYTHON.resolve():
    raise SystemExit(subprocess.call([str(VIRELIA_PYTHON), str(Path(__file__).resolve()), *sys.argv[1:]]))

import numpy as np
from PIL import Image
from psd_tools import PSDImage
import tiler


HERE = PROJECT
DEFAULT_PSD = Path(r"C:\Users\Ofek\Downloads\Virelia\virelia map\virelia_detailed.psd")
DEFAULT_OUT = HERE / "region-geometry.js"
OVERLAY_ROOT = HERE / "region-overlays"
OVERLAY_MANIFEST = HERE / "region-overlays.js"
META = HERE / "content" / "entry-meta.json"

# `tiler.py` writes 256px source tiles, while Leaflet displays them at 128px
# with zoomOffset: 1. At map zoom 4 that is a 4096px Web Mercator world. The
# 8096x4048 PSD is padded to 8192x4096: right padding horizontally, *top*
# padding vertically. This is deliberately shared math, not a linear map-bbox
# interpolation; latitude in Leaflet's default CRS is Web Mercator.
SOURCE_TILE = 256
LEAFLET_TILE = 128
MAP_ZOOM = 4


def key(value: str) -> str:
    """Normalise a Photoshop layer name into an entry-like identifier."""
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def region_names() -> dict[str, str]:
    meta = json.loads(META.read_text(encoding="utf-8"))
    names: dict[str, str] = {}
    for entry in meta["entries"]:
        if entry.get("type") != "region":
            continue
        names[key(entry["id"])] = entry["id"]
        names[key(entry.get("heading", entry["id"]))] = entry["id"]
    return names


def mask_pixels(layer, psd_width: int, psd_height: int) -> np.ndarray | None:
    """Return a full-canvas Photoshop layer mask, when one is enabled."""
    if not layer.mask or layer.mask.disabled:
        return None
    image = layer.mask.topil()
    if image is None:
        return None
    left, top, right, bottom = layer.mask.bbox
    pixels = np.asarray(image.convert("L"))
    # Photoshop stores only the mask's non-default bounds. Reconstructing the
    # full canvas with its declared background makes black/white masks and
    # cropped masks behave exactly like they do in the PSD.
    output = np.full((psd_height, psd_width), layer.mask.background_color, dtype=np.uint8)
    x0, y0 = max(0, left), max(0, top)
    x1, y1 = min(psd_width, right), min(psd_height, bottom)
    if x1 > x0 and y1 > y0:
        output[y0:y1, x0:x1] = pixels[y0 - top:y1 - top, x0 - left:x1 - left]
    return output


def render_layer(layer, psd_width: int, psd_height: int):
    """Render raw pixels and explicitly apply Photoshop's standard mask."""
    image = layer.composite(force=True) if layer.is_group() else layer.topil()
    if image is None:
        raise ValueError("Photoshop returned no rendered layer pixels")
    image = image.convert("RGBA")
    left, top, _right, _bottom = layer.bbox
    mask = mask_pixels(layer, psd_width, psd_height)
    if mask is not None:
        rgba = np.asarray(image).copy()
        local_mask = mask[top:top + rgba.shape[0], left:left + rgba.shape[1]]
        rgba[:, :, 3] = (rgba[:, :, 3].astype(np.uint16) * local_mask.astype(np.uint16) // 255).astype(np.uint8)
        image = Image.fromarray(rgba, "RGBA")
    return image, left, top


def alpha_mask(layer, psd_width: int, psd_height: int, land: np.ndarray | None = None) -> tuple[np.ndarray, int, int]:
    """Return an alpha mask and its PSD-space top-left origin."""
    # A group can contain a shape layer plus a clipping mask; compositing it is
    # the right interpretation. A single painted layer is faster via topil().
    image, left, top = render_layer(layer, psd_width, psd_height)
    rgba = np.asarray(image)
    mask = rgba[:, :, 3] > 16
    if land is not None:
        mask &= land[top:top + mask.shape[0], left:left + mask.shape[1]]
    return mask, left, top


def land_alpha(psd) -> np.ndarray:
    """Build a full-canvas land mask from the Photoshop Land group.

    Region overlays are painted generously and can feather over water. The
    actual land artwork is the authoritative coastline, so intersecting with
    it prevents a website border from taking shortcuts through the sea.
    """
    groups = [layer for layer in psd if layer.is_group() and key(layer.name) == "land"]
    if len(groups) != 1:
        raise ValueError("expected one top-level Photoshop group named 'Land'")
    output = np.zeros((psd.height, psd.width), dtype=bool)
    for layer in groups[0]:
        if layer.kind not in {"pixel", "smartobject", "shape"}:
            continue
        image = layer.topil()
        if image is None:
            continue
        mask = np.asarray(image.convert("RGBA"))[:, :, 3] > 16
        left, top, right, bottom = layer.bbox
        x0, y0 = max(0, left), max(0, top)
        x1, y1 = min(psd.width, right), min(psd.height, bottom)
        if x1 > x0 and y1 > y0:
            output[y0:y1, x0:x1] |= mask[y0 - top:y1 - top, x0 - left:x1 - left]
    if not output.any():
        raise ValueError("the Photoshop Land group contains no visible alpha mask")
    return output


def downsample(mask: np.ndarray, step: int) -> np.ndarray:
    """Conservatively downsample while keeping narrow painted edges."""
    height = (mask.shape[0] + step - 1) // step * step
    width = (mask.shape[1] + step - 1) // step * step
    padded = np.pad(mask, ((0, height - mask.shape[0]), (0, width - mask.shape[1])))
    return padded.reshape(height // step, step, width // step, step).any(axis=(1, 3))


def boundary_loops(mask: np.ndarray) -> list[list[tuple[int, int]]]:
    """Trace grid-cell exterior edges. Loops are clockwise in image space."""
    edges: dict[tuple[int, int], list[tuple[int, int]]] = {}

    def add(a: tuple[int, int], b: tuple[int, int]) -> None:
        edges.setdefault(a, []).append(b)

    height, width = mask.shape
    for y, x in np.argwhere(mask):
        if y == 0 or not mask[y - 1, x]:
            add((x, y), (x + 1, y))
        if x == width - 1 or not mask[y, x + 1]:
            add((x + 1, y), (x + 1, y + 1))
        if y == height - 1 or not mask[y + 1, x]:
            add((x + 1, y + 1), (x, y + 1))
        if x == 0 or not mask[y, x - 1]:
            add((x, y + 1), (x, y))

    loops: list[list[tuple[int, int]]] = []
    while edges:
        start = next(iter(edges))
        point = start
        loop = [start]
        while True:
            choices = edges.get(point)
            if not choices:
                break
            nxt = choices.pop()
            if not choices:
                del edges[point]
            point = nxt
            loop.append(point)
            if point == start:
                loops.append(loop)
                break
    return loops


def signed_area(points: list[tuple[float, float]]) -> float:
    return sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(points, points[1:])) / 2


def point_distance(point, a, b) -> float:
    dx, dy = b[0] - a[0], b[1] - a[1]
    if dx == 0 and dy == 0:
        return ((point[0] - a[0]) ** 2 + (point[1] - a[1]) ** 2) ** 0.5
    t = max(0, min(1, ((point[0] - a[0]) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy)))
    return ((point[0] - (a[0] + t * dx)) ** 2 + (point[1] - (a[1] + t * dy)) ** 2) ** 0.5


def simplify_open(points: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    if len(points) < 3:
        return points
    farthest, distance = -1, 0.0
    for index in range(1, len(points) - 1):
        candidate = point_distance(points[index], points[0], points[-1])
        if candidate > distance:
            farthest, distance = index, candidate
    if distance <= tolerance:
        return [points[0], points[-1]]
    return simplify_open(points[:farthest + 1], tolerance)[:-1] + simplify_open(points[farthest:], tolerance)


def simplify_ring(ring: list[tuple[float, float]], tolerance: float) -> list[tuple[float, float]]:
    # Split at the furthest point so Douglas–Peucker can operate on a closed ring.
    open_ring = ring[:-1]
    anchor = min(range(len(open_ring)), key=lambda i: (open_ring[i][0], open_ring[i][1]))
    rotated = open_ring[anchor:] + open_ring[:anchor] + [open_ring[anchor]]
    simplified = simplify_open(rotated, tolerance)
    return simplified[:-1] + [simplified[0]]


def psd_to_latlng(x: float, y: float, psd_width: int, psd_height: int) -> list[float]:
    grid_width = math.ceil(psd_width / SOURCE_TILE) * SOURCE_TILE
    grid_height = math.ceil(psd_height / SOURCE_TILE) * SOURCE_TILE
    scale = LEAFLET_TILE / SOURCE_TILE
    world = SOURCE_TILE * (2 ** MAP_ZOOM)

    # The source is bottom-left anchored by tiler._pad_to_grid(). Its first
    # painted row therefore begins below the unused northern half of Leaflet's
    # world and below this particular file's 48px top padding.
    world_x = x * scale
    world_y = world - grid_height * scale + (grid_height - psd_height + y) * scale
    lng = world_x / world * 360.0 - 180.0
    lat = math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * world_y / world))))
    return [round(lng, 5), round(lat, 5)]


def geojson_for(layer, psd_width: int, psd_height: int, step: int, tolerance: float,
                land: np.ndarray | None) -> tuple[dict, dict]:
    mask, left, top = alpha_mask(layer, psd_width, psd_height, land)
    sampled = downsample(mask, step)
    loops = boundary_loops(sampled)
    exteriors = [loop for loop in loops if signed_area(loop) > 0]
    if not exteriors:
        raise ValueError("no painted exterior was found")

    def convert(point):
        x = left + point[0] * step
        y = top + point[1] * step
        return psd_to_latlng(x, y, psd_width, psd_height)

    rings = []
    for loop in exteriors:
        # Skip specks smaller than 0.01% of the PSD; Photoshop's anti-aliased
        # edge can otherwise create tiny disconnected contours.
        if abs(signed_area(loop)) * step * step < psd_width * psd_height * 0.0001:
            continue
        ring = simplify_ring([convert(point) for point in loop], tolerance)
        if len(ring) >= 4:
            rings.append([ring])
    if not rings:
        raise ValueError("only tiny painted fragments were found")
    geometry = ({"type": "Polygon", "coordinates": rings[0]}
                if len(rings) == 1 else {"type": "MultiPolygon", "coordinates": rings})
    return geometry, {
        "pixels": int(mask.sum()), "components": len(rings), "vertices": sum(len(r[0]) for r in rings)
    }


def read_existing(path: Path) -> dict:
    if not path.exists():
        return {"version": 1, "regions": {}}
    source = path.read_text(encoding="utf-8")
    match = re.search(r"window\.REGION_GEOMETRY\s*=\s*(\{.*\})\s*;\s*$", source, re.S)
    if not match:
        raise ValueError(f"could not parse existing geometry from {path}")
    return json.loads(match.group(1))


def read_overlay_manifest() -> dict:
    if not OVERLAY_MANIFEST.exists():
        return {"version": 1, "regions": {}}
    source = OVERLAY_MANIFEST.read_text(encoding="utf-8")
    match = re.search(r"window\.REGION_OVERLAYS\s*=\s*(\{.*\})\s*;\s*$", source, re.S)
    if not match:
        raise ValueError(f"could not parse existing overlay manifest from {OVERLAY_MANIFEST}")
    return json.loads(match.group(1))


def export_overlay(layer, entry_id: str, psd_width: int, psd_height: int) -> None:
    """Tile the actual Photoshop overlay, preserving its exact painted look."""
    image, left, top = render_layer(layer, psd_width, psd_height)
    canvas = Image.new("RGBA", (psd_width, psd_height), (0, 0, 0, 0))
    canvas.alpha_composite(image, (left, top))
    with tempfile.TemporaryDirectory(prefix="virelia-region-") as temp:
        source = Path(temp) / f"{entry_id}.png"
        canvas.save(source)
        tiler.build(str(source), str(OVERLAY_ROOT / entry_id), title=f"Virelia: {entry_id}", fmt="webp")


def css_blend_mode(photoshop_mode) -> str:
    """Return the closest portable browser blend mode for a PSD group mode."""
    name = getattr(photoshop_mode, "name", str(photoshop_mode)).upper()
    return {
        "LINEAR_BURN": "multiply",  # closest CSS equivalent; CSS lacks linear-burn
        "MULTIPLY": "multiply",
        "SCREEN": "screen",
        "OVERLAY": "overlay",
        "DARKEN": "darken",
        "LIGHTEN": "lighten",
        "COLOR_BURN": "color-burn",
        "COLOR_DODGE": "color-dodge",
        "SOFT_LIGHT": "soft-light",
        "HARD_LIGHT": "hard-light",
        "DIFFERENCE": "difference",
        "EXCLUSION": "exclusion",
    }.get(name, "normal")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_PSD)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--group", default="regions", help="top-level Photoshop group to import (case-insensitive)")
    parser.add_argument("--step", type=int, default=8, help="PSD pixels per trace cell (default: 8)")
    parser.add_argument("--tolerance", type=float, default=0.08, help="GeoJSON simplification tolerance")
    parser.add_argument("--no-land-clip", action="store_true", help="do not clip overlays to the Photoshop Land group")
    parser.add_argument("--no-raster-overlay", action="store_true", help="update only GeoJSON, not the exact Photoshop overlay tiles")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    if args.step < 1:
        parser.error("--step must be at least 1")

    psd = PSDImage.open(args.source)
    groups = [layer for layer in psd if layer.is_group() and key(layer.name) == key(args.group)]
    if len(groups) != 1:
        found = ", ".join(repr(layer.name) for layer in psd if layer.is_group()) or "none"
        raise SystemExit(f"expected one top-level group named {args.group!r}; found {len(groups)} (top-level groups: {found})")

    known = region_names()
    data = read_existing(args.output)
    data.setdefault("version", 1)
    data.setdefault("regions", {})
    land = None if args.no_land_clip else land_alpha(psd)
    imported = []
    imported_layers = []
    for layer in groups[0]:
        region_id = known.get(key(layer.name))
        if not region_id:
            print(f"skipped {layer.name!r}: not a region entry")
            continue
        if layer.kind == "type":
            print(f"skipped {layer.name!r}: it is text, not a painted region mask")
            continue
        geometry, stats = geojson_for(layer, psd.width, psd.height, args.step, args.tolerance, land)
        data["regions"][region_id] = geometry
        imported.append(region_id)
        imported_layers.append((region_id, layer))
        print(f"{region_id}: {stats['components']} component(s), {stats['vertices']} vertices")

    if not imported:
        raise SystemExit("no region masks were imported")
    if args.dry_run:
        print("dry run: region-geometry.js not changed")
        return

    header = "/* Generated from Photoshop region masks. See REGIONS.md. */\n"
    args.output.write_text(header + "window.REGION_GEOMETRY = " + json.dumps(data, indent=2) + ";\n", encoding="utf-8")
    if not args.no_raster_overlay:
        overlays = read_overlay_manifest()
        overlays.setdefault("version", 1)
        overlays.setdefault("regions", {})
        group_style = {
            "blendMode": css_blend_mode(groups[0].blend_mode),
            "opacity": round(groups[0].opacity / 255, 4),
        }
        for region_id, layer in imported_layers:
            export_overlay(layer, region_id, psd.width, psd.height)
            overlays["regions"][region_id] = {"src": f"region-overlays/{region_id}", **group_style}
            print(f"exported Photoshop overlay tiles for {region_id}")
        OVERLAY_MANIFEST.write_text(
            "/* Generated from Photoshop region overlays. See scripts/import-photoshop-regions.py. */\n"
            + "window.REGION_OVERLAYS = " + json.dumps(overlays, indent=2) + ";\n",
            encoding="utf-8")
    print(f"wrote {args.output} ({', '.join(imported)})")


if __name__ == "__main__":
    main()
