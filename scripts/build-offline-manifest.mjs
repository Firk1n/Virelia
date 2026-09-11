import { createHash } from 'node:crypto';
import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const include = ['assets', 'audio', 'tiles', 'tiles-labels', 'tiles-topo', 'book', 'generated'];
const core = ['/', '/index.html', '/style.css', '/main.js', '/regions.js', '/wiki-runtime.js', '/wiki-data.js', '/region-overlays.js', '/generated/region-bounds.js', '/generated/wiki-overrides.js', '/generated/book.js', '/narration.js', '/reader.js', '/book.js', '/search.js', '/offline.js', '/manifest.webmanifest', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'];
async function walk(dir) { const entries = await readdir(path.join(root, dir), { withFileTypes: true }); const out = []; for (const entry of entries) { const relative = path.join(dir, entry.name).replaceAll('\\', '/'); if (relative === 'generated/offline-manifest.js') continue; if (entry.isDirectory()) out.push(...await walk(relative)); else out.push(relative); } return out; }
const files = (await Promise.all(include.map(walk))).flat().sort();
const bytes = (await Promise.all(files.map(async file => (await stat(path.join(root, file))).size))).reduce((a, b) => a + b, 0);
const assets = [...core, ...files.map(file => '/' + file)];
const version = createHash('sha256').update(JSON.stringify(assets)).digest('hex').slice(0, 12);
await writeFile(path.join(root, 'generated', 'offline-manifest.js'), `window.VIRELIA_OFFLINE_MANIFEST=${JSON.stringify({ version, bytes, assets })};\n`);
console.log(`Offline pack: ${(bytes / 1e6).toFixed(0)} MB, ${files.length} files.`);
