# Incremental wiki-content pipeline

The site offers two things made from one document:

| | from | built by |
|---|---|---|
| **Wiki** | `Virelia.txt`, plus the images in `Virelia.docx` | `npm run build`, `npm run images` |
| **Book** | `Virelia.docx` | `npm run pdf` |

The Wiki is the prose made navigable: cross-linked, tied to the map, narrated.
The Book is the document itself, with its layout and artwork intact. Both are
generated from the current source, so the two cannot disagree.

`C:\Users\Ofek\Downloads\Virelia\Virelia.txt` is the source of truth for
book prose, generated region prose, and their narration text. Map-only
entries (cities, towns, and landmarks which do not have a book entry) remain
in `wiki-data.js`; the builder preserves their HTML and derives narration
segments directly from it. Do not edit generated region prose in
`wiki-data.js`.

## Normal update workflow

1. Edit `Virelia.txt`.
2. Preview the impact:

   ```powershell
   node scripts/build-wiki.mjs --dry-run
   ```

   It prints exactly which entries need their narration re-rendered. Editing
   three regions lists three ids.

3. Generate the changed wiki artifacts and the book view:

   ```powershell
   npm run build
   ```

4. Re-render only the queued narrations, on the machine with the GPU:

   ```powershell
   cd C:\Users\Ofek\Downloads\Virelia\audio
   .v312\Scripts\python.exe render_entries.py
   ```

   With no arguments it renders exactly `generated/build-report.json`'s
   `changed` list, skipping anything whose rendered audio already matches.
   `--all` sweeps for any stale entry; `--entry <id>` renders one.
   Output lands in `audio/<id>.mp3` and `audio/<id>.timings.json`.

   These are committed and deployed, so the narration plays on the live site.
   That is a deliberate reversal of `Virelia/audio/README.md`, which says the
   cloned-narrator renders stay on the machine that made them — decided on
   2026-09-07. Anything rendered from that voice is public once pushed.

   If a listener reports a repeated phrase, audit the existing cached clips
   before rerolling anything:

   ```powershell
   .v312\Scripts\python.exe audit_entry_repetitions.py --all
   ```

   The report names exact entry/segment pairs. Repair only each reported
   segment with `render_entries.py --entry <id> --retry-segment <segment>`.
   New takes are automatically rejected when their transcription repeats a
   phrase not repeated in the requested text.

5. Check everything still agrees:

   ```powershell
   npm test
   ```

6. Commit the edited source and all changed generated artifacts together.

### When the .docx changes too

`Virelia.txt` is a text export and carries **no images** — not even a marker
where one was, only a run of blank lines. Sixty-seven pictures live only in the
`.docx`, and some of them carry information rather than atmosphere. One extra
step picks those up:

```powershell
npm run images
```

That extracts them to `assets/book/`, each anchored to the exact paragraph it
follows. Run `npm run build` afterwards so the wiki picks up the new
placements. `npm test` fails if an image stops placing — which is what happens
when the paragraph it was anchored to gets edited.

### Re-exporting the Book PDF

```powershell
npm run pdf
```

That rewrites `build/Virelia-print.docx`: the same document with its
photographic PNGs re-encoded as JPEG at identical pixel dimensions, which
takes it from 108 MB to 29 MB without moving anything on the page. Then it
prints the one manual step:

> **File → Open** `build/Virelia-print.docx`, **File → Save As**
> `book/Virelia.pdf` (type: PDF).

Word has to do the conversion, and it has to be Word doing it *interactively*.
`scripts/export-book-pdf.ps1` drives the identical export over COM and is kept
in the repo, but on this document it never finishes in a usable time — ninety
minutes on the full file, twelve without reaching page four of a four-page
range, because it repaginates the whole document either way. The interactive
export takes a couple of minutes.

The Book button reports the file as missing rather than showing a browser
error, so a fresh clone is honest about it until the PDF is exported.

To look at the site locally (the narration and the book view are fetched, so
`file://` will not do):

```powershell
npm run serve
```

## Contracts another implementer must preserve

- `generated/wiki-overrides.js` exports `window.WIKI_ENTRY_OVERRIDES`.
  Each override is merged into, not substituted for, the map's existing
  `wikiData[id]` (`wiki-runtime.js` does this); otherwise images, coordinates,
  and region geometry vanish.
- `generated/narration-manifest.json` is the audio job contract. An entry is
  stale exactly when its `textHash` differs from the `textHash` in its
  rendered `audio/<id>.timings.json`.
- **Segments are the shared unit.** `scripts/build-wiki.mjs` splits each entry
  into sentence-grouped segments, stamps them into the HTML as
  `<span class="seg" data-seg="s-NNNN">`, and lists them in the manifest. The
  renderer synthesises one clip per segment and writes its timings against the
  same ids, so read-along highlighting needs no alignment step and cannot
  drift. Changing the segmentation changes every `textHash`, which correctly
  queues a full re-render.
- Timing files follow this contract, and playback refuses any file whose
  `textHash` does not match the current build:

  ```json
  {
    "version": 1,
    "entryId": "haldrith",
    "textHash": "…the matching narration manifest hash…",
    "segments": [{ "id": "s-0001", "start": 0.6, "end": 1.4, "text": "Haldrith" }]
  }
  ```

- **The build is author-side and must never run on the host.**
  `scripts/build-wiki.mjs` reads `Virelia.txt` from a path on the authoring
  machine, so `npm run build` cannot succeed anywhere else. Every artifact it
  produces is committed under `generated/`, which makes the deployed site pure
  static files. `vercel.json` sets an empty `buildCommand` to say so; without
  it Vercel sees the `build` script in `package.json`, runs it, and the deploy
  fails with ENOENT on a `C:\Users\...` path.
- `generated/region-bounds.js` exports `window.REGION_BOUNDS` as
  `{ id: [[south, west], [north, east]] }` and is what the *page* frames a
  region with. `region-geometry.js` holds the traced polygons and is loaded
  only under `?edit`, so `regions.js` prefers the full geometry when it is
  present and falls back to the generated boxes otherwise. Re-trace a border
  and you must run `npm run bounds`, or the page keeps framing the old shape.
- The page must stay free of build instructions. `reportBuildError(message,
  detail)` and `narration.js`'s `refuse(reader, detail)` both take the
  reader's sentence first and the maintainer's second; only the first is ever
  shown, and the second goes to the console. A visitor handed
  "Run: node scripts/build-book.mjs" learns nothing and concludes the site is
  broken.
- `entry-meta.json` owns aliases. Do not infer adjectival forms with a stemmer:
  fantasy names create false links. Never create a self-link.
- Race mechanics are rendered in a collapsed **Game mechanics appendix** and
  are deliberately omitted from narration. Lore remains the entry's narrated
  text, matching the existing audiobook policy.
- Region geometry (`region-geometry.js`) and map metadata are manual data. A
  text build must never overwrite them. See [REGIONS.md](REGIONS.md).

## What each file is

| file | role |
|---|---|
| `content/entry-meta.json` | hand-maintained: which book heading is which map entry, and its aliases |
| `scripts/parse-source.mjs` | the structural parser; one module, shared by every tool below |
| `scripts/build-wiki.mjs` | entry prose, segments and the narration manifest |
| `scripts/build-book.mjs` | `generated/book.js`, the wiki overlay's content |
| `scripts/import-docx-images.py` | the 67 images the .txt export drops, and where each belongs |
| `scripts/shrink-docx.py` | the print copy the Book PDF is exported from |
| `scripts/audit.mjs` | the invariants, run by `npm test` |
| `wiki-runtime.js` | merges generated content, cross-links entries, owns history |
| `narration.js` | the read-aloud player and read-along highlighting |
| `regions.js` | map focus, the pulse, and region outlines |
| `reader.js` | the Wiki overlay |
| `book.js` | the Book overlay, which shows `book/Virelia.pdf` |
| `edit.js` | `?edit` mode: markers, entry editing, region border tracing |

## Scope

The parser handles the twelve region headings for the map, and every chapter
in the book for the reader. Add races, factions, cities, and locations to the
map by appending metadata entries once each has a stable wiki ID and an exact
book heading — no parser change is needed. The build is deterministic: no AI
calls, network access, or manual text copying occur in the normal update path.
