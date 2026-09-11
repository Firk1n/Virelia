#!/usr/bin/env node
/* Build the in-site wiki from Virelia.txt.
 *
 * Every chapter, in order, rendered with the same parser the map entries use,
 * plus the images imported from the .docx. This is the wiki -- the prose made
 * navigable. The book is the PDF, exported separately by
 * scripts/export-book-pdf.ps1; the site offers both.
 *
 * Writes generated/book.js (window.VIRELIA_BOOK).
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexImages, parseBlocks, renderEntry, stripTableOfContents } from './parse-source.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const metaPath = path.join(root, 'content', 'entry-meta.json');
const outPath = path.join(root, 'generated', 'book.js');

const args = process.argv.slice(2);
const check = args.includes('--check');
const sourceFlag = args.indexOf('--source');

// The chapter list is a whitelist, not a heuristic: "Rumors:" recurs thirteen
// times and every race name reappears as the first column of a summary table,
// so a short-line rule invents chapters. Mirrors virelia_text.py.
const PARTS = ['The Regions of Virelia', 'The Races of Virelia', 'The factions of Virelia'];
const CHAPTERS = [
  'Knotsreach', 'Molakar', 'Southfield', 'Myrskov', 'Lastrago', 'Tintbent',
  'Kelarra Peaks', 'Tavernash', 'Haldrith', 'Rivhalde', 'Remosa', 'Trefgann',
  'Duskwalker', 'Graith', 'Myrrkin', 'Orrak', 'Nirath', 'Varn', 'Karex',
  'The Weave', 'Greywater Compact', 'The Zwigots', 'The Speculars',
  'The Halcyon League'
];
const FRONT = [
  'The Shining Age', 'The Sundering', 'The Age of Silence',
  'The Fracture Wars', 'The Fractured Era (The Current Day)'
];
const RULE = /_{10,}/;

const known = new Map();
for (const name of PARTS) known.set(name.toLowerCase(), 'part');
for (const name of [...CHAPTERS, ...FRONT]) known.set(name.toLowerCase(), 'chapter');

function headingKind(line) {
  if (line.length >= 70) return null;
  const bare = line.replace(/\s*\(plural:.*\)\s*$/, '').trim();
  for (const candidate of [line, bare]) {
    const kind = known.get(candidate.toLowerCase());
    if (kind) return { title: candidate, kind };
  }
  return null;
}

function slug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** Split the whole book into chapters, dropping only the table of contents. */
function splitBook(text) {
  const lines = stripTableOfContents(text, PARTS).split('\n');

  const chapters = [{ title: 'Preface', kind: 'front', part: null, lines: [] }];
  let part = null;
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (!s) { chapters[chapters.length - 1].lines.push(lines[i]); continue; }
    const hit = headingKind(s);
    if (hit) {
      // A whitelisted name is also a table's first column. A real heading is
      // either anchored by the rule below it, or simply nowhere near a
      // tab-delimited row.
      const anchored = lines.slice(i + 1, i + 5).some(l => RULE.test(l));
      const inTable = lines.slice(Math.max(0, i - 4), i + 5).some(l => l.includes('\t'));
      if (anchored || !inTable) {
        if (hit.kind === 'part') part = hit.title;
        chapters.push({ title: hit.title, kind: hit.kind, part, lines: [] });
        continue;
      }
    }
    chapters[chapters.length - 1].lines.push(lines[i]);
  }
  return chapters.filter(c => c.lines.some(l => l.trim()));
}

const meta = JSON.parse(await readFile(metaPath, 'utf8'));
const sourcePath = sourceFlag >= 0 ? args[sourceFlag + 1] : meta.source;
const raw = (await readFile(sourcePath, 'utf8')).replace(/\r\n/g, '\n');

// Which chapter is which map entry, so the reader can offer "open on the map".
const entryByHeading = new Map(meta.entries.flatMap(e => [
  [e.heading.toLowerCase(), e.id],
  [(e.title || e.heading).toLowerCase(), e.id]
]));

// The .txt export carries no images. scripts/import-docx-images.py reads them
// out of the .docx along with the paragraph each one follows; this view covers
// every chapter, so it is where an unplaceable image gets noticed.
let imageManifest = { images: [] };
try {
  imageManifest = JSON.parse(await readFile(path.join(root, 'generated', 'book-images.json'), 'utf8'));
} catch { /* not imported yet; the wiki is simply text-only until it is */ }
const images = indexImages(imageManifest);
const placedImages = new Set();   // shared: one emission per image per build

const chapters = splitBook(raw).map(chapter => {
  const blocks = parseBlocks(chapter.lines.join('\n'));
  // renderEntry's segment ids are per-entry and meaningless here, but the
  // markup it produces is exactly the markup the sidebar uses, so the wiki
  // page and the entry view cannot drift apart in styling or structure.
  const { html } = renderEntry(chapter.title, blocks, { images, placed: placedImages });
  return {
    id: slug(chapter.title),
    title: chapter.title,
    kind: chapter.kind,
    part: chapter.part,
    entryId: entryByHeading.get(chapter.title.toLowerCase()) || null,
    html
  };
});

const book = {
  version: 1,
  source: sourcePath,
  sourceHash: createHash('sha256').update(raw).digest('hex'),
  chapters
};
const output = '/* Generated by scripts/build-book.mjs; do not edit. */\n' +
  `window.VIRELIA_BOOK = ${JSON.stringify(book, null, 1)};\n`;

const words = chapters.reduce((n, c) => n + c.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length, 0);
console.log(`Source: ${sourcePath}`);
console.log(`Chapters: ${chapters.length}; words: ${words}`);
{
  const missing = imageManifest.images.filter(image => !placedImages.has(image));
  console.log(`Images: ${placedImages.size}/${imageManifest.images.length} placed`);
  for (const image of missing) console.warn(`  unplaced after: ${image.anchor.slice(0, 80)}`);
}

if (check) {
  let current = null;
  try { current = await readFile(outPath, 'utf8'); } catch { /* not built yet */ }
  if (current !== output) {
    console.error('generated/book.js is stale. Run: node scripts/build-book.mjs');
    process.exit(1);
  }
  console.log('generated/book.js is current.');
  process.exit(0);
}

await mkdir(path.dirname(outPath), { recursive: true });
await writeFile(outPath, output);
