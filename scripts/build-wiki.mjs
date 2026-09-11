#!/usr/bin/env node
/* Build source-derived wiki artifacts without changing map-specific metadata.
 *
 * Writes generated/wiki-overrides.js (merged into wikiData at load),
 * generated/narration-manifest.json (the audio render contract), and
 * generated/build-report.json (whose `changed` array is the render queue).
 *
 * Each entry is hashed independently, so editing three regions queues three
 * narrations rather than the whole book.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { extractSections, groupNarrationSentences, indexImages, parseBlocks, renderEntry, splitMechanicsAppendix, stripTableOfContents } from './parse-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metaPath = path.join(root, 'content', 'entry-meta.json');
const generatedDir = path.join(root, 'generated');
const outputPaths = {
  overrides: path.join(generatedDir, 'wiki-overrides.js'),
  narration: path.join(generatedDir, 'narration-manifest.json'),
  report: path.join(generatedDir, 'build-report.json')
};
const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--')));
const dryRun = flags.has('--dry-run');
const check = flags.has('--check');
const sourceFlag = args.indexOf('--source');

for (const flag of flags) {
  if (!['--dry-run', '--check', '--source'].includes(flag)) {
    throw new Error('Usage: node scripts/build-wiki.mjs [--dry-run] [--check] [--source PATH]');
  }
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function readJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); } catch { return fallback; }
}

async function readWikiData() {
  const source = await readFile(path.join(root, 'wiki-data.js'), 'utf8');
  const context = { window: {}, console };
  vm.createContext(context);
  vm.runInContext(`${source}\n;globalThis.__wikiData = wikiData;`, context, { filename: 'wiki-data.js' });
  return context.__wikiData;
}

// A page opened directly from disk cannot use fetch(file://...) in Chrome.
// Mirror timing JSON as tiny executable data files so narration.js can load
// them with a normal <script> tag in that case. The renderer writes the same
// companion file after future renders; doing it here also upgrades existing
// audio without a GPU pass.
async function writeTimingScriptCompanions() {
  const audioDir = path.join(root, 'audio');
  let files;
  try { files = await readdir(audioDir); } catch { return; }
  const timingFiles = files.filter(name => name.endsWith('.timings.json'));
  await Promise.all(timingFiles.map(async name => {
    const source = await readFile(path.join(audioDir, name), 'utf8');
    const timing = JSON.parse(source);
    const jsName = name.replace(/\.json$/, '.js');
    const payload = JSON.stringify(timing);
    await writeFile(path.join(audioDir, jsName),
      `window.VIRELIA_TIMINGS = window.VIRELIA_TIMINGS || {};\n` +
      `window.VIRELIA_TIMINGS[${JSON.stringify(timing.entryId)}] = ${payload};\n`);
  }));
}

function decodeHtml(text) {
  const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', bull: '•' };
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code) => {
    const key = code.toLowerCase();
    if (named[key] !== undefined) return named[key];
    if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16));
    if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10));
    return entity;
  });
}

function normalizedText(text) { return decodeHtml(text).replace(/\s+/g, ' ').trim(); }
function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, char =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function manualSegments(title, html) {
  const segments = [{ id: 's-0001', role: 'title', text: title }];
  const tokens = String(html || '').match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) || [];
  const rendered = [];
  const tags = [];
  let awaitingAttribution = false;
  let n = 1;
  for (const token of tokens) {
    if (token.startsWith('<')) {
      const close = /^<\s*\/\s*([\w-]+)/.exec(token);
      const open = /^<\s*([\w-]+)/.exec(token);
      if (close) {
        const name = close[1].toLowerCase();
        const index = tags.lastIndexOf(name);
        if (index >= 0) tags.splice(index, 1);
        if (name === 'em') awaitingAttribution = true;
      } else if (open && !/\/>\s*$/.test(token)) {
        tags.push(open[1].toLowerCase());
      }
      rendered.push(token);
      continue;
    }
    const text = normalizedText(token);
    if (!text) { rendered.push(token); continue; }
    // Hand-authored map prose uses <em> for an epigraph, followed immediately
    // by a <strong> attribution. Preserve paragraph context, while applying
    // the book pipeline's proven size ceiling for synthesis reliability.
    let role = 'prose';
    if (tags.includes('em')) role = 'epigraph';
    else if (awaitingAttribution && tags.includes('strong')) {
      role = 'attribution';
      awaitingAttribution = false;
    }
    const groups = groupNarrationSentences(text, role === 'epigraph' ? 500 : 290);
    const spans = [];
    for (let i = 0; i < groups.length; i++) {
      n += 1;
      const id = `s-${String(n).padStart(4, '0')}`;
      segments.push({ id, role,
        text: groups[i], last: i === groups.length - 1 });
      spans.push(`<span class="seg" data-seg="${id}">${escapeHtml(groups[i])}</span>`);
    }
    rendered.push(spans.join(' '));
  }
  return { segments, html: rendered.join('') };
}

const meta = await readJson(metaPath, null);
if (!meta?.entries?.length) throw new Error(`Invalid metadata: ${metaPath}`);
const sourcePath = sourceFlag >= 0 ? args[sourceFlag + 1] : meta.source;
if (!sourcePath) throw new Error('No source configured. Set entry-meta.json.source or pass --source PATH.');
// The metadata now covers the history, regions, races, and factions. The
// final faction runs to EOF, so a terminator is optional rather than inferred.
const terminator = meta.terminator || null;

// The Index sits inside The Fractured Era's section and is not part of it.
// Dropping it before the split is what keeps a page of prose from ending in
// the book's whole table of contents.
const book = stripTableOfContents(
  (await readFile(sourcePath, 'utf8')).replace(/\r\n/g, '\n'),
  meta.entries.map(entry => entry.heading));
const sections = extractSections(book, meta.entries, terminator);
const previous = await readJson(outputPaths.narration, { entries: {} });
const wikiData = await readWikiData();
// The .txt export drops every image; scripts/import-docx-images.py puts them
// back, anchored to the paragraph each one follows.
const imageManifest = await readJson(path.join(generatedDir, 'book-images.json'), { images: [] });
const images = indexImages(imageManifest);
const placedImages = new Set();   // shared: one emission per image per build

const entries = {};
for (const section of sections) {
  const split = String(section.type).toLowerCase() === 'race'
    ? splitMechanicsAppendix(section.body, section.appendixStarts)
    : { lore: section.body, appendix: '' };
  const blocks = parseBlocks(split.lore);
  const { html, segments, lastText } = renderEntry(section.title, blocks, { images, placed: placedImages });
  let appendix = '';
  if (split.appendix.trim()) {
    appendix = renderEntry(section.title, parseBlocks(split.appendix),
      { narrate: false, images, placed: placedImages, previousText: lastText }).html;
  }
  // The narration text is the segments themselves, not the raw section: it is
  // what will actually be spoken, so hashing it means audio is invalidated by
  // changes that reach the microphone and nothing else.
  const narrationText = segments.map(s => s.text).join('\n');
  entries[section.id] = {
    id: section.id,
    title: section.title,
    type: section.type,
    aliases: section.aliases || [],
    sourceHash: hash(section.body.replace(/\s+/g, ' ').trim()),
    narration: {
      text: narrationText,
      textHash: hash(narrationText),
      audioSrc: `audio/${section.id}.mp3`,
      timingSrc: `audio/${section.id}.timings.json`,
      segments
    },
    content: appendix
      ? `${html}\n<details class="entry-appendix"><summary>Game mechanics appendix</summary><div class="entry-appendix-body">${appendix}</div></details>`
      : html
  };
}

// Map-only cities, towns, and POIs remain hand-authored in wiki-data.js.
// Preserve their HTML and add their text nodes to the same narration queue.
for (const [id, entry] of Object.entries(wikiData)) {
  if (entries[id] || !entry.title || !entry.content) continue;
  const manual = manualSegments(entry.title, entry.content);
  const segments = manual.segments;
  const narrationText = segments.map(s => s.text).join('\n');
  // Unlike book entries, these include a hand-authored epigraph structure.
  // Include roles in the contract so a changed cast correctly queues a render.
  const narrationContract = segments.map(s => `${s.role}\t${s.text}`).join('\n');
  entries[id] = {
    id, title: entry.title, type: entry.type || 'location', aliases: entry.aliases || [],
    sourceHash: hash(String(entry.content)), manualNarration: true,
    content: manual.html,
    narration: {
      text: narrationText, textHash: hash(narrationContract),
      audioSrc: `audio/${id}.mp3`, timingSrc: `audio/${id}.timings.json`, segments
    }
  };
}

const changed = Object.values(entries)
  .filter(entry => previous.entries?.[entry.id]?.textHash !== entry.narration.textHash)
  .map(entry => entry.id);

const narration = {
  version: 1,
  source: sourcePath,
  entries: Object.fromEntries(Object.values(entries).map(entry => [entry.id, {
    title: entry.title,
    text: entry.narration.text,
    textHash: entry.narration.textHash,
    audioSrc: entry.narration.audioSrc,
    timingSrc: entry.narration.timingSrc,
    segments: entry.narration.segments
  }]))
};

const report = {
  version: 1,
  source: sourcePath,
  sourceHash: hash(book),
  entries: Object.values(entries).map(entry => ({
    id: entry.id,
    title: entry.title,
    sourceHash: entry.sourceHash,
    textHash: entry.narration.textHash,
    segments: entry.narration.segments.length
  })),
  changed
};

// The site consumes the overrides as a plain script tag, so it must not carry
// the narration text twice; the manifest is the audio contract and this is the
// page contract. Segments stay, because the page needs the ids to highlight.
const forSite = Object.fromEntries(Object.values(entries).map(entry => [entry.id, {
  id: entry.id,
  title: entry.title,
  type: entry.type,
  aliases: entry.aliases,
  ...(entry.content ? { content: entry.content } : {}),
  ...(entry.manualNarration ? { manualNarration: true } : {}),
  narration: {
    textHash: entry.narration.textHash,
    audioSrc: entry.narration.audioSrc,
    timingSrc: entry.narration.timingSrc,
    segments: entry.narration.segments.map(s => ({ id: s.id, role: s.role }))
  }
}]));
const overrides = '/* Generated by scripts/build-wiki.mjs; do not edit. */\n' +
  `window.WIKI_ENTRY_OVERRIDES = ${JSON.stringify(forSite, null, 2)};\n`;

const totalSegments = Object.values(entries).reduce((n, e) => n + e.narration.segments.length, 0);
console.log(`Source: ${sourcePath}`);
console.log(`Entries: ${Object.keys(entries).length}; segments: ${totalSegments}`);
console.log(`Changed narration: ${changed.length ? changed.join(', ') : 'none'}`);

// An image whose anchor paragraph is not in the prose would otherwise vanish
// without a word, which is the failure this whole import exists to fix.
{
  const missing = imageManifest.images.filter(image => !placedImages.has(image));
  // Not every image belongs to a map entry -- the preface has one and is not
  // one. generated/book.js covers every chapter, so that is where the audit
  // insists on a full set.
  console.log(`Images: ${placedImages.size}/${imageManifest.images.length} placed in entries`);
  for (const image of missing.slice(0, 6)) {
    console.log(`  not in any entry: ${image.anchor.slice(0, 80)}`);
  }
  if (missing.length > 6) console.log(`  ...and ${missing.length - 6} more`);
}

if (dryRun) process.exit(0);

if (check) {
  const current = await readJson(outputPaths.report, null);
  // `changed` records the previous build's work queue, so it is expected to
  // be stale on a verification run. Compare source identity and the derived
  // entry hashes instead.
  if (!current || current.sourceHash !== report.sourceHash ||
      JSON.stringify(current.entries) !== JSON.stringify(report.entries)) {
    console.error('Generated wiki artifacts are stale. Run: node scripts/build-wiki.mjs');
    process.exit(1);
  }
  console.log('Generated wiki artifacts are current.');
  process.exit(0);
}

await mkdir(generatedDir, { recursive: true });
  await Promise.all([
  writeFile(outputPaths.overrides, overrides),
  writeFile(outputPaths.narration, JSON.stringify(narration, null, 2) + '\n'),
  writeFile(outputPaths.report, JSON.stringify(report, null, 2) + '\n'),
  writeTimingScriptCompanions()
  ]);
