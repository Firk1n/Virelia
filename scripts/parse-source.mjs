/* Structural parser for Virelia.txt.
 *
 * One module, three consumers: the wiki build (scripts/build-wiki.mjs), the
 * whole-book reader build (scripts/build-book.mjs), and the audits
 * (scripts/audit.mjs). It is deterministic and offline by construction: no
 * network, no AI, no manual copying.
 *
 * The structural rules are ported from the audiobook pipeline
 * (Virelia/audio/virelia_text.py) so that the page and the narration agree
 * about what is a heading, an epigraph, or a table. Where they disagree the
 * page would highlight the wrong line during read-along.
 */

// A real heading in the .docx is followed by a horizontal rule, which the text
// export renders as a run of underscores -- sometimes on its own line, more
// often glued onto the end of the preceding line.
const RULE = /_{10,}/;

// The prose book embeds playable 5e material after several race entries. It
// is useful reference material, but it is not lore and the established
// audiobook deliberately excludes it. Keep it available as an appendix
// without letting it inflate the entry narration.
const MECH_HEADS = new Set([
  'core mechanics:', 'race features:', 'material subraces:',
  'while saturated:', 'the cabinet:', 'riftmark anomalies (d100):',
  'mirror school spells', 'rift taxonomy', 'ancient lastragan'
]);
const MECH_LINE = /^\s*\+\d\s*(Any|Other|Str|Dex|Con|Int|Wis|Cha)\b|^\s*\d+\.\t|^\s*(Ability Score Increase|Size\/Speed|Alignment|Languages|Creature Type)\s*:/i;

/** Lines the exporter left as pure rule/whitespace carry no words. */
function isBlank(line) {
  const s = line.trim();
  return !s || /^_+$/.test(s);
}

function stripRule(line) {
  return line.replace(/_{4,}/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ------------------------------------------------------------------ headings */

// Ported from virelia_text.is_section, with one deliberate difference: a
// trailing question mark is allowed. "Beyond Luznica?" is a section heading in
// Knotsreach and the Python rule rejects it. Other terminal punctuation still
// disqualifies a line, which is what keeps short prose sentences out.
function isSectionHeading(s) {
  if (!s || s.length > 58) return false;
  if ('.,;:!"\''.includes(s[s.length - 1])) return false;
  const words = s.split(/\s+/);
  if (words.length > 8) return false;
  const caps = words.filter(w => /^[A-Z]/.test(w)).length;
  return caps >= Math.max(1, words.length - 3);
}

/* ------------------------------------------------------------------ sections */

function findHeading(text, heading, from = 0) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escaped}\\s*$`, 'gm');
  const slice = text.slice(from);
  let match;
  while ((match = pattern.exec(slice)) !== null) {
    const at = from + match.index;
    const lines = text.slice(at).split('\n');
    const near = text.slice(Math.max(0, at - 800), at + 800).split('\n');
    const anchored = lines.slice(1, 5).some(line => RULE.test(line));
    const inTable = near.some(line => line.includes('\t'));
    // Race names also occur in the table of contents and race summary table.
    // A real chapter is either anchored by a rule or outside tabular content.
    if (anchored || !inTable) return at;
  }
  throw new Error(`Could not find standalone heading: ${heading}`);
}

/**
 * Slice the book into the body text of each configured entry. `terminator` is
 * optionally the heading that closes the last entry's section; omitting it
 * lets the final configured entry run to the end of the source.
 */
export function extractSections(book, entries, terminator) {
  const starts = entries
    .map(entry => ({ entry, start: findHeading(book, entry.heading) }))
    .sort((a, b) => a.start - b.start);
  return starts.map((item, index) => {
    const end = index + 1 < starts.length
      ? starts[index + 1].start
      : terminator
        ? findHeading(book, terminator, item.start + item.entry.heading.length)
        : book.length;
    const body = book.slice(item.start + item.entry.heading.length, end);
    if (!body.trim()) throw new Error(`${item.entry.heading} has no body text.`);
    return { ...item.entry, title: item.entry.title || item.entry.heading, body };
  });
}

/** Split a race chapter into narrated lore and its non-narrated mechanics. */
export function splitMechanicsAppendix(body, extraStarts = []) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex(line => {
    const text = line.trim().replace(/\s+/g, ' ').toLowerCase();
    return MECH_HEADS.has(text) || MECH_LINE.test(line) ||
      extraStarts.some(start => text.startsWith(String(start).toLowerCase()));
  });
  if (start < 0) return { lore: body, appendix: '' };
  return {
    lore: lines.slice(0, start).join('\n'),
    appendix: lines.slice(start).join('\n')
  };
}

/* -------------------------------------------------------------------- blocks */

function findOpener(lines) {
  // The opening quotation is closed by the rule. Find it, then decide whether
  // the line carrying the rule is a citation of a quote above it or the
  // section's own tagline.
  for (let j = 0; j < Math.min(lines.length, 9); j++) {
    if (!RULE.test(lines[j])) continue;
    if (!/^\s*_+\s*$/.test(lines[j])) return { openerEnd: j, citation: j };
    for (let k = j - 1; k >= 0; k--) {
      if (!isBlank(lines[k])) return { openerEnd: j, citation: k };
    }
    return { openerEnd: j, citation: -1 };
  }
  // Molakar's opener has no rule at all -- the exporter dropped it. Fall back
  // to the structure the rule would have marked: everything above the first
  // section heading is the opener, and its last line is the citation.
  const opener = [];
  for (let j = 0; j < Math.min(lines.length, 9); j++) {
    if (isBlank(lines[j])) continue;
    if (isSectionHeading(lines[j].trim().replace(/\s+/g, ' '))) break;
    opener.push(j);
  }
  if (!opener.length) return { openerEnd: -1, citation: -1 };
  return { openerEnd: opener[opener.length - 1], citation: opener[opener.length - 1] };
}

/**
 * Turn a section body into typed blocks.
 *
 * Block kinds: epigraph, attribution, tagline, heading, para, table, rumors,
 * rumor. Everything the author wrote lands in exactly one block; nothing is
 * dropped except the exporter's rule characters.
 */
export function parseBlocks(body) {
  const lines = body.replace(/\r\n/g, '\n').split('\n');
  const { openerEnd, citation } = findOpener(lines);
  const quoteLines = new Set();
  for (let k = 0; k < citation; k++) if (!isBlank(lines[k])) quoteLines.add(k);

  const blocks = [];
  let inRumors = false;
  let table = null;        // the open table, if any
  let width = 0;           // its column count, taken from the header row

  // A wrapped grid cell lands on its own physical line, sometimes with tabs
  // and sometimes without. A physical line continues the current logical row
  // until that row has as many cells as the header; only then does a new row
  // start. Without this, "Law, archives" -- the tail of one Nonagon seat's
  // domain -- reads as a section heading.
  function feedTable(cells) {
    const row = table.rows[table.rows.length - 1];
    if (!row || (row.length >= width && cells[0])) { table.rows.push(cells); return; }
    if (cells[0]) row[row.length - 1] = `${row[row.length - 1]} ${cells[0]}`.trim();
    for (const cell of cells.slice(1)) row.push(cell);
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (isBlank(raw)) continue;

    if (i <= openerEnd) {
      const text = stripRule(raw);
      if (!text) continue;
      if (i === citation) {
        blocks.push({ kind: quoteLines.size ? 'attribution' : 'tagline', text });
      } else if (quoteLines.has(i)) {
        blocks.push({ kind: 'epigraph', text });
      }
      continue;
    }

    // A tab-delimited run is a table. It is shown but never narrated: read
    // aloud, a table is a list of disconnected fragments.
    if (raw.includes('\t')) {
      const cells = raw.replace(/\s+$/, '').split('\t').map(c => c.replace(/\s+/g, ' ').trim());
      if (!table) {
        table = { kind: 'table', rows: [cells] };
        width = cells.length;
        blocks.push(table);
      } else {
        feedTable(cells);
      }
      continue;
    }

    const s = raw.trim().replace(/\s+/g, ' ');

    if (table) {
      const row = table.rows[table.rows.length - 1];
      if (row.length < width) { feedTable([s]); continue; }
      table = null;
    }

    if (/^Rumors:\s*$/i.test(s)) {
      blocks.push({ kind: 'rumors' });
      inRumors = true;
      continue;
    }

    if (isSectionHeading(s)) {
      blocks.push({ kind: 'heading', text: s });
      inRumors = false;
      continue;
    }

    // Inside a Rumors block every line is "Title: body". The label is bolded
    // rather than promoted to a heading, because it is read aloud as part of
    // the same sentence.
    if (inRumors) {
      const m = /^([^:]{1,60}):\s+(.+)$/.exec(s);
      if (m) {
        blocks.push({ kind: 'rumor', label: m[1], text: m[2] });
        continue;
      }
    }

    blocks.push({ kind: 'para', text: s });
  }
  return blocks;
}

/* ------------------------------------------------------------------ segments */

// A segment is the unit of both highlighting and synthesis. Sentence-grouped
// rather than word-level: word karaoke needs forced alignment, and phrase
// highlighting is what actually helps someone follow a page of prose.
const MAX_GROUP_CHARS = 290;
const MAX_EPIGRAPH_CHARS = 500;

const SENTENCE_BREAK =
  /(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bvs)(?<!\be\.g)(?<!\bi\.e)(?<=[.!?]["'”’]?)\s+(?=[A-Z"'“‘])/;

function sentences(paragraph) {
  const out = [];
  for (const part of paragraph.split(SENTENCE_BREAK)) {
    let s = part.trim();
    if (!s) continue;
    // A sentence longer than the model holds together is cut at a comma. The
    // comma stays with the left half; only the following space is dropped,
    // which a join(' ') puts back.
    while (s.length > 300) {
      const cut = s.slice(0, 300).lastIndexOf(', ');
      if (cut < 100) break;
      out.push(s.slice(0, cut + 1));
      s = s.slice(cut + 2);
    }
    out.push(s);
  }
  return out;
}

/** Group whole sentences up to `limit` characters, preserving every word. */
function groupSentences(paragraph, limit = MAX_GROUP_CHARS) {
  const groups = [];
  let cur = '';
  for (const s of sentences(paragraph)) {
    if (cur && cur.length + 1 + s.length > limit) { groups.push(cur); cur = s; }
    else cur = cur ? `${cur} ${s}` : s;
  }
  if (cur) groups.push(cur);
  // The page renders these spans back to back; if they no longer reconstruct
  // the author's paragraph, the split ate something.
  if (groups.join(' ') !== paragraph) {
    throw new Error(`Segmentation is lossy for paragraph: ${paragraph.slice(0, 80)}...`);
  }
  return groups;
}

// Reused by the map-only adapter. Paragraphs stay the author's prosodic unit;
// this only introduces a natural sentence boundary when a paragraph is too
// long for reliable synthesis.
export function groupNarrationSentences(paragraph, limit = MAX_GROUP_CHARS) {
  return groupSentences(paragraph, limit);
}

/* -------------------------------------------------------------------- render */

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Render parsed blocks to HTML, wrapping every narrated span of text in
 * `<span class="seg" data-seg="s-NNNN">`.
 *
 * The spans are the whole point: read-along highlighting then needs no fuzzy
 * matching between audio and page, because the renderer that produced the
 * markup also produced the synthesis units. `segments` comes back in spoken
 * order and is what the audio renderer consumes.
 *
 * The title is segment 1 and has no span here -- the sidebar renders the
 * title itself and stamps the id onto its heading.
 */
export function renderEntry(title, blocks, options = {}) {
  const narrate = options.narrate !== false;
  const segments = narrate ? [{ id: 's-0001', role: 'title', text: title }] : [];
  const html = [];
  let n = 1;

  // Virelia.txt is a text export and carries no images, not even a marker
  // where one was. scripts/import-docx-images.py reads them out of the .docx
  // and records the exact paragraph each one follows; here they are put back.
  // Matching on the anchor text rather than counting blank lines is what makes
  // the placement exact instead of plausible.
  const images = options.images || new Map();
  // Shared across a whole build so that each image is emitted exactly once,
  // even though "Core Mechanics:" heads seven different race chapters.
  const placed = options.placed || new Set();
  // A race chapter's mechanics are rendered separately from its lore, so the
  // caller hands the tail of one render to the head of the next; otherwise the
  // first image in the appendix has no predecessor to check against.
  let previousText = options.previousText || null;
  // The book heading is "Orrak (plural: Orraks)" but the chapter is titled
  // "Orrak", so compare the two the same way build-book derives the title.
  const asAnchor = text => String(text || '').replace(/\s*\(plural:.*\)\s*$/, '').trim();
  const figures = (anchor, isTitle) => {
    const found = images.get(anchor);
    if (found) {
      for (const image of found) {
        if (placed.has(image)) continue;
        // The importer records the paragraph before the anchor too. A chapter
        // title has no meaningful predecessor, so it matches on the title alone.
        if (!isTitle && image.after && asAnchor(image.after) !== asAnchor(previousText)) continue;
        placed.add(image);
        html.push(`<figure class="entry-figure">` +
          `<img src="${escapeHtml(image.src)}" width="${image.width}" height="${image.height}"` +
          ` loading="lazy" alt="Illustration from ${escapeHtml(title)}"></figure>`);
      }
    }
    previousText = anchor;
  };

  // `last` marks the final segment of its block. The audio renderer uses it
  // for pacing: a full stop between paragraphs, a shorter breath inside one.
  const seg = (role, text, last) => {
    if (!narrate) return null;
    n += 1;
    const id = `s-${String(n).padStart(4, '0')}`;
    segments.push({ id, role, text, last: last !== false });
    return id;
  };
  // A paragraph becomes one or more spans laid out back to back; joined with
  // a single space they reproduce the author's paragraph exactly.
  const spans = (role, text, limit, decorate) => {
    const groups = groupSentences(text, limit);
    return groups.map((group, i) => {
      const id = seg(role, group, i === groups.length - 1);
      const body = decorate && i === 0 ? decorate(group) : escapeHtml(group);
      return narrate ? `<span class="seg" data-seg="${id}">${body}</span>` : body;
    }).join(' ');
  };

  let epigraph = [];
  const flushEpigraph = () => {
    if (!epigraph.length) return;
    html.push(`<blockquote class="entry-epigraph">${epigraph.join('\n')}</blockquote>`);
    epigraph = [];
  };

  // A continuation render (a race's mechanics appendix) picks up where the
  // lore left off, so it must not re-run the chapter-title hook -- doing so
  // would overwrite the predecessor the caller just handed us.
  if (!options.previousText) figures(title, true);

  for (const block of blocks) {
    switch (block.kind) {
      case 'epigraph':
        epigraph.push(`<p>${spans('epigraph', block.text, MAX_EPIGRAPH_CHARS)}</p>`);
        figures(block.text);
        break;
      case 'attribution':
        epigraph.push(`<p class="entry-cite">${spans('attribution', block.text)}</p>`);
        flushEpigraph();
        figures(block.text);
        break;
      case 'tagline':
        epigraph.push(`<p class="entry-tagline">${spans('tagline', block.text)}</p>`);
        flushEpigraph();
        figures(block.text);
        break;
      case 'heading':
        flushEpigraph();
        {
          const id = seg('heading', block.text);
          const text = escapeHtml(block.text);
          html.push(`<h3 class="entry-section">${narrate ? `<span class="seg" data-seg="${id}">${text}</span>` : text}</h3>`);
        }
        figures(block.text);
        break;
      case 'para':
        flushEpigraph();
        html.push(`<p>${spans('prose', block.text)}</p>`);
        figures(block.text);
        break;
      case 'rumors':
        flushEpigraph();
        {
          const id = seg('heading', 'Rumors');
          html.push(`<h3 class="entry-section">${narrate ? `<span class="seg" data-seg="${id}">Rumors</span>` : 'Rumors'}</h3>`);
        }
        break;
      case 'rumor': {
        flushEpigraph();
        const label = `${block.label}:`;
        const body = spans('rumor', `${label} ${block.text}`, MAX_GROUP_CHARS, group =>
          `<strong>${escapeHtml(label)}</strong>${escapeHtml(group.slice(label.length))}`);
        html.push(`<p class="entry-rumor">${body}</p>`);
        figures(`${label} ${block.text}`);
        break;
      }
      case 'table': {
        flushEpigraph();
        const [head, ...body] = block.rows;
        const row = (cells, tag) =>
          `<tr>${cells.map(c => `<${tag}>${escapeHtml(c)}</${tag}>`).join('')}</tr>`;
        html.push('<div class="entry-table-wrap"><table class="entry-table">' +
          `<thead>${row(head, 'th')}</thead>` +
          `<tbody>${body.map(r => row(r, 'td')).join('')}</tbody>` +
          '</table></div>');
        break;
      }
      default:
        throw new Error(`Unknown block kind: ${block.kind}`);
    }
  }
  flushEpigraph();
  return { html: html.join('\n'), segments, placed, lastText: previousText };
}

/**
 * Index the imported book images by the paragraph each one follows.
 *
 * Pass the result to renderEntry as `options.images`. Anchors are the exact
 * normalised paragraph text from the .docx, which is the same string the
 * parser produces for that line of Virelia.txt.
 */
export function indexImages(manifest) {
  const byAnchor = new Map();
  for (const image of manifest?.images || []) {
    if (!byAnchor.has(image.anchor)) byAnchor.set(image.anchor, []);
    byAnchor.get(image.anchor).push(image);
  }
  return byAnchor;
}
