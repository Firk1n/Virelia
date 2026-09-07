# Entry metadata contract

`entry-meta.json` is the small, hand-maintained bridge between the book and
the map. It must never contain an entry's prose: prose lives only in
`Virelia.txt`.

Each entry requires:

- `id`: the existing, stable `wikiData` key.
- `heading`: the exact standalone heading in `Virelia.txt`.
- `type`: currently `region`; retained so this file can later cover cities,
  factions, races, and points of interest.
- `aliases`: explicit alternate and adjectival forms that should link to this
  entry. Add only unambiguous names.

Map coordinates, images, and eventual `regionGeometry` remain in
`wiki-data.js` until the frontend migration moves them into dedicated map
metadata. This separation prevents a book rebuild from erasing hand-drawn
boundaries or map artwork.
