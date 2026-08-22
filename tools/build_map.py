#!/usr/bin/env python
"""Rebuild the Virelia map tiles from the Photoshop source in one command.

    python tools/build_map.py            # export from the PSD, then re-tile
    python tools/build_map.py --list     # print the PSD's top-level groups
    python tools/build_map.py --tiles-only   # skip Photoshop, re-tile the PNGs
    python tools/build_map.py labels     # only rebuild the labels overlay

Replaces the old manual loop of: toggle layers in Photoshop, save a PNG, load
it into QGIS, run gdal2tiles at zoom 0-5 with the raster profile, three times
over. tiler.py is a verified drop-in for that gdal2tiles step -- it reproduces
the committed tiles pixel-for-pixel.
"""

import argparse
import hashlib
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import photoshop
import tiler

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONFIG = os.path.join(ROOT, "tools", "map_layers.json")
STAMPS = os.path.join(ROOT, "tools", ".build-stamps.json")


def digest(path):
    """Fingerprint a PNG by its pixels, not its bytes.

    Photoshop does not write byte-identical PNGs for the same image twice, so
    hashing the file would mark every export as changed and re-tile all three
    pyramids every run.
    """
    import numpy as np
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    with Image.open(path) as im:
        return hashlib.sha1(np.asarray(im.convert("RGBA")).tobytes()).hexdigest()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("only", nargs="*", metavar="NAME",
                    help="limit to these outputs (default: all)")
    ap.add_argument("--list", action="store_true",
                    help="print the PSD's top-level layer groups and exit")
    ap.add_argument("--tree", action="store_true",
                    help="with --list, show every nested layer too")
    ap.add_argument("--out", metavar="FILE",
                    help="with --list, also write the listing to FILE (UTF-8)")
    ap.add_argument("--tiles-only", action="store_true",
                    help="re-tile the existing PNGs without opening Photoshop")
    ap.add_argument("--force", action="store_true",
                    help="re-tile even if the PNG has not changed")
    ap.add_argument("--config", default=CONFIG)
    args = ap.parse_args()

    with open(args.config, encoding="utf-8") as f:
        cfg = json.load(f)

    psd = cfg["psd"]
    export_dir = cfg["export_dir"]
    outputs = [o for o in cfg["outputs"] if not args.only or o["name"] in args.only]
    if args.only and not outputs:
        sys.exit(f"no output named {args.only}; have: "
                 + ", ".join(o["name"] for o in cfg["outputs"]))

    if args.list:
        lines = photoshop.list_tree(psd, deep=args.tree)
        for line in lines:
            print(line)
        if args.out:
            with open(args.out, "w", encoding="utf-8") as f:
                for line in lines:
                    print(line, file=f)
            print("written to " + args.out)
        return

    os.makedirs(export_dir, exist_ok=True)
    for o in outputs:
        o["png"] = os.path.join(export_dir, o["name"] + ".png")

    if not args.tiles_only:
        print(f"Photoshop: opening {os.path.basename(psd)} (this is the slow part)")
        names = photoshop.list_top_level(psd)
        jobs = []
        for o in outputs:
            show = photoshop.resolve(o["show"], names)
            print(f"  {o['name']:8s} <- " + ", ".join(names[i] for i in show))
            jobs.append({"name": o["name"], "file": o["png"], "show": show})
        t = time.time()
        was_dirty = photoshop.export(psd, jobs)
        print(f"  exported {len(jobs)} PNG(s) in {time.time() - t:.0f}s")
        if was_dirty:
            print("  note: the PSD was open with unsaved changes. Layer visibility "
                  "was put back\n        exactly as it was, but Photoshop will still "
                  "ask about saving on close.")

    for o in outputs:
        if not os.path.exists(o["png"]):
            sys.exit(f"missing {o['png']} -- run without --tiles-only first")

    stamps = {}
    if os.path.exists(STAMPS):
        with open(STAMPS, encoding="utf-8") as f:
            stamps = json.load(f)

    for o in outputs:
        stamp = digest(o["png"])
        out_dir = os.path.join(ROOT, o["tiles"])
        if not args.force and stamps.get(o["name"]) == stamp and os.path.isdir(out_dir):
            print(f"{o['name']}: unchanged, skipping tiles")
            continue
        print(f"{o['name']}: tiling -> {o['tiles']}/")
        t = time.time()
        n = tiler.build(o["png"], out_dir, title=cfg.get("title", "Virelia"),
                        fmt=cfg.get("format", "png"))
        print(f"  {n} tiles in {time.time() - t:.0f}s")
        stamps[o["name"]] = stamp

    with open(STAMPS, "w", encoding="utf-8") as f:
        json.dump(stamps, f, indent=2)
    print("done")


if __name__ == "__main__":
    main()
