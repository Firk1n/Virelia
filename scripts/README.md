# Virelia workflows

This folder is the single home for every project-maintenance script. The map
and website themselves stay in the repository root; generated outputs stay in
`generated/`, `audio/`, and the tile folders.

## Everyday content update

After editing `C:\Users\Ofek\Downloads\Virelia\Virelia.txt`:

```powershell
npm run plan                 # list the entries whose narration needs work
npm run build                # rebuild wiki entries and the whole-book reader
cd C:\Users\Ofek\Downloads\Virelia\audio
.v312\Scripts\python.exe render_entries.py  # render only the queued entries
cd C:\Users\Ofek\Desktop\dnd-map
npm test
```

`npm run serve` opens the map at `http://localhost:8123`. The full source and
narration contract are documented in [CONTENT_PIPELINE.md](../CONTENT_PIPELINE.md).

### Narration repair audit

The renderer rejects newly generated clips whose transcription repeats a
phrase not repeated in the source. To inspect older clips made before that
check existed (without rendering anything):

```powershell
cd C:\Users\Ofek\Downloads\Virelia\audio
.v312\Scripts\python.exe audit_entry_repetitions.py --all
```

It writes `entry-repetition-audit.json`, with the exact entry and segment IDs
to repair. Re-render only those segments, then test the affected entry:

```powershell
.v312\Scripts\python.exe render_entries.py --entry knotsreach --retry-segment s-0002
```

## Region borders from Photoshop

In `virelia_detailed.psd`, place one opaque painted or shape layer per region
inside the top-level **Regions** group. Name each layer with the displayed
region name (`Remosa`) or its entry id (`remosa`), save the PSD, then run:

```powershell
C:\Users\Ofek\Downloads\Virelia\audio\.v312\Scripts\python.exe scripts\import-photoshop-regions.py
```

It creates a camera-fit geometry and exports the actual painted Photoshop
overlay as temporary transparent map tiles, preserving any geometry not present
in Photoshop. From this folder, `./import-photoshop-regions.py` also works: it
automatically switches to the required Python environment. Use `--dry-run` to
preview. See
[REGIONS.md](../REGIONS.md) for the full contract and the manual fallback.

## Map artwork and tiles

| Command | Purpose |
|---|---|
| `python scripts/build_map.py` | export the PSD and rebuild every tile set |
| `python scripts/build_map.py labels` | rebuild only the label overlay |
| `python scripts/build_map.py --list` | list PSD top-level groups |
| `python scripts/build_map.py --list --tree` | list every nested Photoshop layer |
| `python scripts/build_map.py --tiles-only` | rebuild tiles from existing PNG exports |
| `python scripts/build_map.py --force` | rebuild tiles even if the export is unchanged |

`map_layers.json` configures the PSD path and which groups belong to each tile
set. `list_layers.jsx` is the Photoshop-side alternative for listing layers.
The map exporter restores layer visibility and does not save the PSD.

## Script inventory

| Script | Role |
|---|---|
| `build-wiki.mjs` | parses source prose into entries, HTML segments, cross-links, and the narration manifest |
| `build-region-bounds.mjs` | reduces `region-geometry.js` to the twelve boxes the page reads (832 KB -> 1 KB) |
| `build-social-card.py` | stitches `assets/social-card.jpg` from the map tiles, for link previews |
| `build-book.mjs` | builds the whole-book reader data |
| `parse-source.mjs` | shared source parser |
| `audit.mjs` | validates generated data, links, timing contracts, and region geometry |
| `import-photoshop-regions.py` | turns Photoshop region masks into map geometry |
| `build_map.py` | exports artwork from Photoshop and retiles it |
| `photoshop.py`, `tiler.py` | helpers used by the map exporter |
