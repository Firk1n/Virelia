# Region borders

## Import from Photoshop (preferred)

The source of truth can be a top-level layer group named **Regions** in
`C:\Users\Ofek\Downloads\Virelia\virelia map\virelia_detailed.psd`.
Each direct child is one region mask: paint or fill the whole region on a
transparent layer, and name it either with the website id (`remosa`) or its
visible name (`Remosa`). The layer may be hidden in Photoshop; it is never
part of the website's map artwork.

After saving the PSD, import all changed masks with:

```
C:\Users\Ofek\Downloads\Virelia\audio\.v312\Scripts\python.exe scripts\import-photoshop-regions.py
```

The importer does two things for every region in the group: it traces a
land-clipped geometry for camera fitting, and exports the actual Photoshop
layer as transparent map tiles. Opening the region uses that exact painted
overlay, rather than attempting to restyle a vector border in the browser.
Existing manually traced regions remain intact. Use `--dry-run` to preview the
result first. The outputs are `region-geometry.js`, `region-overlays.js`, and
`region-overlays/<id>/`; run `npm test` after import.

## Manual tracing (fallback)

Twelve regions have a marker on the map. None of them has a border yet, and
none can be generated: where Haldrith stops and Rivhalde begins is a judgement
about a painted map, and a script that guesses it would draw a confident wrong
line over the artwork. So the borders are traced by hand, once, and reviewed
by eye.

Until a region is traced, opening it pans to its marker and pulses. Once it is
traced, opening it fits the border into view and draws it as a translucent
dashed outline — and only while that entry is open. No border is ever shown
by default.

## Tracing one

1. Open the map with `?edit`:

   ```
   http://localhost:8123/?edit
   ```

   Edit mode needs the File System Access API, so use Chrome or Edge.

2. Press **Region border** in the toolbar, and pick the region from the
   dropdown. Regions already traced are marked `(traced)`; picking one loads
   its outline for adjustment and fits it into view.

3. Click along the region's edge to drop points. A dozen or two is plenty —
   the outline reads as a boundary, not a survey.

   - drag any point to move it
   - right-click a point to delete it
   - **Undo point** removes the last one, **Clear** removes them all

4. Press **Save border**. It writes `region-geometry.js` (keeping a `.bak`)
   and reloads.

To remove a border, clear all its points and save.

## The file

`region-geometry.js` is data, not generated output. `node scripts/build-wiki.mjs`
never writes it, so rebuilding the book cannot erase a trace.

Coordinates are GeoJSON order — `[longitude, latitude]` — which is the reverse
of the `[lat, lng]` pairs in `wiki-data.js`. Leaflet's `L.geoJSON` handles the
swap. `npm test` fails on a ring that is not closed, on a border for something
that is not a region, and on latitudes outside ±90 (which is what a ring
authored the Leaflet way looks like).

Editing the file by hand is fine; keep the first ring closed, with the last
point equal to the first.

## Review

Traced borders are worth a second look at zoom 3 and at zoom 5: an outline
that reads well fitted to the screen can cut through a town at close range.
`npm test` lists which regions are still untraced.
