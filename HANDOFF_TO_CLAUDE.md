# Implementation handoff: Virelia interactive wiki

You are implementing the user-facing features of a static Leaflet site. Do
not replace the source-first pipeline that already exists. Work in
`C:\Users\Ofek\Desktop\dnd-map`; the established local narration project is
`C:\Users\Ofek\Downloads\Virelia\audio`.

## Source of truth and non-negotiable contracts

- `C:\Users\Ofek\Downloads\Virelia\Virelia.docx` is the author's rich
  writing master. They manually copy its prose into
  `C:\Users\Ofek\Downloads\Virelia\Virelia.txt`, intentionally flattening
  images and formatting. The TXT is the source for wiki prose and narration;
  never auto-extract or overwrite it from the DOCX.
- Never hand-edit generated entry prose in `wiki-data.js`.
- Run `node scripts/build-wiki.mjs` after changing the book. It updates:
  `generated/wiki-overrides.js`, `generated/narration-manifest.json`, and
  `generated/build-report.json`.
- `wiki-data.js` retains hand-maintained map data: IDs, coordinates, images,
  and future region borders. Generated overrides must be **merged** into each
  existing `wikiData[id]`, not used to replace the entire object.
- `content/entry-meta.json` owns aliases. Add explicit forms there; do not
  invent a name stemmer.

## Required implementation

### 1. Generated-content integration

Load `generated/wiki-overrides.js` after `wiki-data.js` and before `main.js`.
Merge every `window.WIKI_ENTRY_OVERRIDES[id]` into `wikiData[id]`. Show a
visible development error when an override refers to an unknown entry ID.
The legacy region prose must then be replaced by the source-derived prose.

Improve `textToHtml` in `scripts/build-wiki.mjs` only if needed, while keeping
it deterministic and keeping narration derived from `narration.text` rather
than its HTML. Preserve all source words, quotations, subsections, and Rumors
blocks. Keep the source parser and metadata generic enough to add races,
factions, and locations later.

### 2. Links and navigation

Build a deterministic entity index from `wikiData` titles plus `aliases`.
When rendering an entry, link unambiguous mentions in text nodes only. Do not
touch existing anchors, tags, attributes, code, or image URLs. Match longest
valid aliases first, preserve display capitalization, and never link the
open entry to itself. Ambiguous aliases must be reported by an audit command,
not linked arbitrarily.

Use the History API. A click on a generated link must push a state containing
the target entry and the map view. The sidebar Back control must return to
the immediately prior entry and its map position; browser Back/Forward must
also restore entry, view, and active map highlight. Do not rely only on an
in-memory stack.

### 3. Read aloud and synchronized reading

Use only pre-rendered local MP3 assets, never browser speech synthesis. Each
entry uses the paths in `generated/narration-manifest.json`:

```
audio/<id>.mp3
audio/<id>.timings.json
```

Add play/pause, seek, elapsed/duration, error state, and automatic stop on
navigation. Split the rendered body into stable readable segments and map
timing records to those segments. Highlight the active phrase/sentence and
scroll it into view only when it would otherwise be off-screen. Clear the
highlight when paused, stopped, closed, or the entry changes.

Use this timing JSON contract:

```json
{
  "version": 1,
  "entryId": "haldrith",
  "textHash": "the matching narration manifest hash",
  "segments": [
    { "id": "s-0001", "start": 0.0, "end": 4.2, "text": "Exact spoken phrase." }
  ]
}
```

The text hash must be checked before playback; stale timings should disable
read-along with a useful error, not highlight the wrong text.

Create an incremental entry renderer in the audio project which consumes
`generated/narration-manifest.json`, keys output by `textHash`, renders only
selected/stale entries with the existing Chatterbox narrator setup, and emits
the MP3 plus timing JSON. Reuse the existing voice configuration and QC
standards in `render.py`; do not change its book-render behavior. A phrase or
sentence timing granularity is preferred over word karaoke timing. The build
report's `changed` array is the default render queue.

### 4. Map focus and regional outlines

On opening a point entry, pan/fit the map and show a temporary, accessible
visual pulse. On a region, show only while active a translucent outlined
polygon and fit it into view. Clear the old highlight when the entry changes
or closes. No region border may appear permanently by default.

Keep geometry separate from book text, in standard GeoJSON `[longitude,
latitude]` coordinates keyed by entry ID. Extend the existing `?edit` mode
with a map-native polygon-drawing/editing workflow and explicit Save/Cancel.
Avoid a dependency that requires a server. Do not overwrite geometry from the
content build. The twelve initial region borders need manual tracing and
author review; provide a clear workflow rather than guessing their shape.

### 5. Whole-book reader and validation

Add an in-site, keyboard-accessible full-book reader using the PDF exported
from the DOCX master, preserving its illustrations and page design. Never
silently present an old `Virelia.pdf`; record/display its source revision or
last-export status. The TXT is intentionally formatting-free, so an HTML
reader built from it is not a substitute for the illustrated book. Closing
the reader must return to the same entry/map state.

Add commands/tests that verify:

- generated data is fresh: `node scripts/build-wiki.mjs --check`;
- every metadata entry exists in `wikiData`;
- no aliases are ambiguous;
- all generated cross-links resolve and no self-links are emitted;
- every current narration manifest item has matching audio and timings (or is
  reported as pending);
- every region geometry is valid and corresponds to a region.

Do not delete user changes, alter unrelated map tile behavior, commit source
audio references, or attempt an all-book narration re-render unless asked.

## Acceptance flow

1. Edit three region passages in `Virelia.txt`.
2. `node scripts/build-wiki.mjs --dry-run` lists exactly those IDs.
3. Build; only those narration hashes change.
4. Render only those entries; their text and timing hashes match.
5. Load the static site and verify cross-link navigation/back, narrated
highlighting, map focus, region overlay, and reader return state.
