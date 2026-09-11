#!/usr/bin/env node
/* Check that the map, the book and the audio still agree.
 *
 *   node scripts/audit.mjs
 *
 * Exits non-zero on anything that would show a reader the wrong thing:
 * generated data that no longer matches the source, metadata pointing at an
 * entry that does not exist, an alias that could mean two places, a
 * cross-link that resolves nowhere, geometry that is not a valid region
 * border. Missing narration audio is reported as pending rather than failed --
 * rendering it takes a GPU and an afternoon, and the site works without it.
 */
import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { extractSections, parseBlocks, renderEntry, splitMechanicsAppendix, stripTableOfContents } from './parse-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const notes = [];

const fail = message => problems.push(message);
const note = message => notes.push(message);

async function loadScript(file, expose) {
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(await readFile(path.join(root, file), 'utf8') +
    `\n;globalThis.__exported = typeof ${expose} !== 'undefined' ? ${expose} : (window.${expose} || null);`,
    context, { filename: file });
  return context.__exported;
}

async function exists(file) {
  try { await stat(path.join(root, file)); return true; } catch { return false; }
}

const meta = JSON.parse(await readFile(path.join(root, 'content', 'entry-meta.json'), 'utf8'));
const wikiData = await loadScript('wiki-data.js', 'wikiData');
const overrides = await loadScript('generated/wiki-overrides.js', 'WIKI_ENTRY_OVERRIDES');
const geometry = await loadScript('region-geometry.js', 'REGION_GEOMETRY');
const manifest = JSON.parse(await readFile(path.join(root, 'generated', 'narration-manifest.json'), 'utf8'));

// Match the browser runtime: map entries are enriched, while book-only
// entries such as races and factions are created from their generated data.
for (const [id, override] of Object.entries(overrides || {})) {
  wikiData[id] = { ...(wikiData[id] || {}), ...override };
}

/* -------------------------------------------------- 1. generated data is fresh */

{
  // Same two steps as scripts/build-wiki.mjs, in the same order: this check is
  // only worth anything if it reads the source the way the build does.
  const book = stripTableOfContents(
    (await readFile(meta.source, 'utf8')).replace(/\r\n/g, '\n'),
    meta.entries.map(entry => entry.heading));
  const sections = extractSections(book, meta.entries, meta.terminator || null);
  for (const section of sections) {
    const split = String(section.type).toLowerCase() === 'race'
      ? splitMechanicsAppendix(section.body, section.appendixStarts)
      : { lore: section.body };
    const { segments } = renderEntry(section.title, parseBlocks(split.lore));
    const text = segments.map(s => s.text).join('\n');
    const textHash = createHash('sha256').update(text).digest('hex');
    const current = manifest.entries[section.id];
    if (!current) fail(`narration manifest has no entry for "${section.id}".`);
    else if (current.textHash !== textHash) {
      fail(`"${section.id}" is stale in the generated artifacts. Run: node scripts/build-wiki.mjs`);
    }
  }
}

/* --------------------------------------- 2. every metadata entry exists in wikiData */

for (const entry of meta.entries) {
  if (!wikiData[entry.id]) fail(`entry-meta.json entry "${entry.id}" has no wikiData entry.`);
}
for (const id of Object.keys(overrides || {})) {
  if (!wikiData[id]) fail(`generated override "${id}" has no wikiData entry.`);
}

/* --------------------------------------------------------- 3. no ambiguous aliases */

const byName = new Map();
for (const [id, entry] of Object.entries(wikiData)) {
  const names = [entry.title, ...(overrides?.[id]?.aliases || entry.aliases || [])];
  for (const name of names) {
    if (!name) continue;
    const key = name.toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    if (!byName.get(key).includes(id)) byName.get(key).push(id);
  }
}
for (const [name, ids] of byName) {
  if (ids.length > 1) fail(`alias "${name}" is ambiguous between ${ids.join(', ')}. Rename it in content/entry-meta.json or wiki-data.js.`);
}

/* ------------------------------- 4. generated cross-links resolve, and none self-link */

function decode(html) {
  return html.replace(/&(amp|lt|gt|quot|#39);/g,
    (_, name) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[name]));
}

{
  const linkable = [...byName.keys()].filter(k => byName.get(k).length === 1)
    .sort((a, b) => b.length - a.length);
  const pattern = new RegExp(
    `(?<![\\w'’])(${linkable.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?!\\w)`,
    'gi');
  let links = 0;
  let selfLinks = 0;
  for (const [id, entry] of Object.entries(overrides || {})) {
    // Only the text the page would actually linkify: strip markup, then decode
    // entities, so this sees the same characters the DOM does. Skipping the
    // decode counts "Remosa&#39;s" as a plain "Remosa" and reports links the
    // page does not draw.
    const sourceHtml = entry.content || wikiData[id]?.content || '';
    const text = decode(sourceHtml.replace(/<[^>]+>/g, ' '));
    for (const match of text.matchAll(pattern)) {
      const target = byName.get(match[1].toLowerCase())[0];
      if (target === id) { selfLinks += 1; continue; }
      if (!wikiData[target]) fail(`"${id}" links to unknown entry "${target}".`);
      links += 1;
    }
  }
  note(`${links} cross-links resolve; ${selfLinks} self-references correctly left unlinked.`);
}

/* ------------------------------------------------ 5. narration audio and timings */

{
  const pending = [];
  for (const [id, entry] of Object.entries(manifest.entries)) {
    const hasAudio = await exists(entry.audioSrc);
    const hasTimings = await exists(entry.timingSrc);
    if (!hasAudio || !hasTimings) { pending.push(id); continue; }

    const timings = JSON.parse(await readFile(path.join(root, entry.timingSrc), 'utf8'));
    if (timings.version !== 1) fail(`${entry.timingSrc}: unsupported version ${timings.version}.`);
    if (timings.entryId !== id) fail(`${entry.timingSrc}: entryId is "${timings.entryId}", expected "${id}".`);
    if (timings.textHash !== entry.textHash) {
      fail(`${entry.timingSrc}: textHash does not match the current build. Re-render "${id}".`);
    }
    const ids = new Set(entry.segments.map(s => s.id));
    const timed = new Set((timings.segments || []).map(s => s.id));
    for (const segmentId of ids) {
      if (!timed.has(segmentId)) fail(`${entry.timingSrc}: no timing for segment ${segmentId}.`);
    }
    for (const segmentId of timed) {
      if (!ids.has(segmentId)) fail(`${entry.timingSrc}: timing for unknown segment ${segmentId}.`);
    }
  }
  if (pending.length) note(`narration pending (no audio rendered yet): ${pending.join(', ')}`);
}

/* ------------------------------------------------------------ 6. region geometry */

{
  const regions = Object.entries(wikiData)
    .filter(([, entry]) => String(entry.type).toLowerCase() === 'region')
    .map(([id]) => id);
  const traced = Object.keys(geometry?.regions || {});

  for (const id of traced) {
    if (!wikiData[id]) { fail(`region-geometry.js has a border for unknown entry "${id}".`); continue; }
    if (!regions.includes(id)) fail(`region-geometry.js has a border for "${id}", which is a ${wikiData[id].type}, not a region.`);
    const shape = geometry.regions[id];
    const polygons = shape.type === 'Polygon' ? [shape.coordinates]
      : shape.type === 'MultiPolygon' ? shape.coordinates : null;
    if (!polygons) { fail(`"${id}" geometry is ${shape.type}; expected Polygon or MultiPolygon.`); continue; }
    for (const polygon of polygons) {
      const ring = polygon?.[0];
      if (!Array.isArray(ring) || ring.length < 4) { fail(`"${id}" geometry needs at least three distinct points.`); continue; }
      const [firstLng, firstLat] = ring[0];
      const [lastLng, lastLat] = ring[ring.length - 1];
      if (firstLng !== lastLng || firstLat !== lastLat) fail(`"${id}" geometry ring is not closed.`);
      for (const [lng, lat] of ring) {
        // GeoJSON is [longitude, latitude]; a ring authored the Leaflet way
        // round-trips silently and then draws in the wrong hemisphere.
        if (lat < -90 || lat > 90) fail(`"${id}" has latitude ${lat} out of range -- are the coordinates [lng, lat]?`);
        if (lng < -180 || lng > 180) fail(`"${id}" has longitude ${lng} out of range.`);
      }
    }
  }
  const untraced = regions.filter(id => !traced.includes(id));
  if (untraced.length) note(`region borders not yet traced (${untraced.length}): ${untraced.join(', ')}`);
}

/* ---------------------------------------------------------- 7. book images */

{
  // Virelia.txt carries no images, so they are imported from the .docx and
  // anchored to the paragraph each one follows. An image whose anchor stops
  // matching -- because that paragraph was edited -- would otherwise just stop
  // appearing, with nothing to notice it.
  let manifest = null;
  try {
    manifest = JSON.parse(await readFile(path.join(root, 'generated', 'book-images.json'), 'utf8'));
  } catch { /* not imported; the wiki is text-only, which is a valid state */ }

  if (manifest?.images?.length) {
    const book = await loadScript('generated/book.js', 'VIRELIA_BOOK');
    const rendered = new Set();
    for (const chapter of book?.chapters || []) {
      for (const match of chapter.html.matchAll(/<img src="([^"]+)"/g)) rendered.add(match[1]);
    }
    const missing = manifest.images.filter(image => !rendered.has(image.src));
    if (missing.length) {
      fail(`${missing.length} book image(s) no longer place. Re-run: ` +
        'python scripts/import-docx-images.py && node scripts/build-book.mjs');
      for (const image of missing.slice(0, 5)) {
        fail(`  anchored to: ${image.anchor.slice(0, 70)}`);
      }
    } else {
      note(`${manifest.images.length} book images placed from the .docx.`);
    }
  }
}

/* ------------------------------------------------------------------- report */

for (const line of notes) console.log(`note: ${line}`);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const line of problems) console.error(`  - ${line}`);
  process.exit(1);
}
console.log('\nAudit passed.');
