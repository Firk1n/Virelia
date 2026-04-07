// === EDIT MODE ===
// Activated when the URL has ?edit. Lets you place new markers, drag them
// into position, fill out a form, and save back to wiki-data.js + assets/.
// Uses the File System Access API (Chrome/Edge). No server required.

(function () {
    if (!/[?&]edit(=|&|$)/.test(window.location.search)) return;

    if (!window.showDirectoryPicker) {
        alert("Edit mode requires the File System Access API (use Chrome or Edge).");
        return;
    }

    var dirHandle = null;     // user-granted handle to the project folder
    var tempMarker = null;    // the draggable marker being placed/edited
    var armedType = null;     // pointType selected from the toolbar (for new entries)
    var editingId = null;     // id of the entry being edited, or null for new
    var pickedImageFile = null;

    var editMode = {
        active: true,
        loadEntry: function (id) { openEditorForExisting(id); }
    };
    window.editMode = editMode;

    // ---------- UI ----------

    function buildUI() {
        var toolbar = document.createElement('div');
        toolbar.id = 'edit-toolbar';
        toolbar.innerHTML = '<div class="edit-toolbar-label">EDIT MODE</div>';

        // Dynamic type buttons from the registry
        pointTypes.forEach(function (pt) {
            var btn = document.createElement('button');
            btn.className = 'edit-type-btn type-' + pt.id;
            btn.dataset.typeId = pt.id;
            btn.title = 'Place a ' + pt.label;
            btn.innerHTML = '<span class="edit-type-swatch type-' + pt.id + '"></span>' + pt.label;
            btn.onclick = function () { armType(pt.id); };
            toolbar.appendChild(btn);
        });

        var hint = document.createElement('div');
        hint.id = 'edit-hint';
        hint.textContent = 'Pick a type, then click the map. Or click an existing marker to edit it.';
        toolbar.appendChild(hint);

        document.body.appendChild(toolbar);

        var panel = document.createElement('div');
        panel.id = 'edit-panel';
        panel.style.display = 'none';
        panel.innerHTML =
            '<div class="edit-panel-header">' +
                '<span id="edit-panel-title">New Entry</span>' +
                '<span class="edit-panel-close" id="edit-panel-close">&times;</span>' +
            '</div>' +
            '<div class="edit-panel-body">' +
                '<label>ID <small>(lowercase, underscores)</small></label>' +
                '<input type="text" id="edit-id" />' +
                '<label>Title</label>' +
                '<input type="text" id="edit-title" />' +
                '<label>Type</label>' +
                '<select id="edit-type"></select>' +
                '<label>Coordinates <small>(drag the marker on the map)</small></label>' +
                '<input type="text" id="edit-coords" readonly />' +
                '<label>Image <small>(optional — copied into assets/ as &lt;Title&gt;.&lt;ext&gt;)</small></label>' +
                '<input type="file" id="edit-image" accept="image/*" />' +
                '<div id="edit-image-current"></div>' +
                '<label>Content <small>(paste pre-formatted HTML)</small></label>' +
                '<textarea id="edit-content" rows="14"></textarea>' +
                '<div class="edit-panel-actions">' +
                    '<button id="edit-save" class="edit-btn-primary">Save</button>' +
                    '<button id="edit-delete" class="edit-btn-danger">Delete</button>' +
                    '<button id="edit-cancel">Cancel</button>' +
                '</div>' +
                '<div id="edit-status"></div>' +
            '</div>';
        document.body.appendChild(panel);

        // Populate type dropdown
        var typeSelect = document.getElementById('edit-type');
        pointTypes.forEach(function (pt) {
            var opt = document.createElement('option');
            opt.value = pt.id;
            opt.textContent = pt.label;
            typeSelect.appendChild(opt);
        });

        // Title-auto-derive id (only when creating)
        document.getElementById('edit-title').addEventListener('input', function (e) {
            if (editingId !== null) return;
            var slug = e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
            document.getElementById('edit-id').value = slug;
        });

        // Type change → swap temp marker icon live
        typeSelect.addEventListener('change', function (e) {
            if (tempMarker) {
                tempMarker.setIcon(getPointType(e.target.value).icon);
            }
        });

        document.getElementById('edit-image').addEventListener('change', function (e) {
            pickedImageFile = e.target.files[0] || null;
        });

        document.getElementById('edit-panel-close').onclick = closeEditor;
        document.getElementById('edit-cancel').onclick = closeEditor;
        document.getElementById('edit-save').onclick = saveEntry;
        document.getElementById('edit-delete').onclick = deleteEntry;
    }

    function armType(typeId) {
        armedType = typeId;
        document.querySelectorAll('.edit-type-btn').forEach(function (b) {
            b.classList.toggle('armed', b.dataset.typeId === typeId);
        });
        document.getElementById('edit-hint').textContent =
            'Click anywhere on the map to place a new ' + getPointType(typeId).label + '.';
    }

    function setStatus(msg, isError) {
        var el = document.getElementById('edit-status');
        el.textContent = msg || '';
        el.style.color = isError ? '#8b0000' : '#2c3e50';
    }

    // ---------- Editor open/close ----------

    function openEditorForNew(latlng, typeId) {
        editingId = null;
        pickedImageFile = null;
        document.getElementById('edit-panel-title').textContent = 'New Entry';
        document.getElementById('edit-id').value = '';
        document.getElementById('edit-id').disabled = false;
        document.getElementById('edit-title').value = '';
        document.getElementById('edit-type').value = typeId;
        document.getElementById('edit-coords').value = formatCoords(latlng);
        document.getElementById('edit-image').value = '';
        document.getElementById('edit-image-current').textContent = '';
        document.getElementById('edit-content').value = '';
        document.getElementById('edit-delete').style.display = 'none';
        document.getElementById('edit-panel').style.display = 'block';
        spawnTempMarker(latlng, typeId);
        setStatus('');
    }

    function openEditorForExisting(id) {
        var entry = wikiData[id];
        if (!entry) return;
        editingId = id;
        pickedImageFile = null;
        document.getElementById('edit-panel-title').textContent = 'Edit: ' + id;
        document.getElementById('edit-id').value = id;
        document.getElementById('edit-id').disabled = true;
        document.getElementById('edit-title').value = entry.title || '';
        document.getElementById('edit-type').value = (entry.type || 'poi').toLowerCase();
        document.getElementById('edit-coords').value = entry.coords[0] + ', ' + entry.coords[1];
        document.getElementById('edit-image').value = '';
        document.getElementById('edit-image-current').textContent = entry.image ? 'Current: ' + entry.image : '';
        document.getElementById('edit-content').value = (entry.content || '').replace(/^\n/, '').replace(/\s+$/, '');
        document.getElementById('edit-delete').style.display = '';
        document.getElementById('edit-panel').style.display = 'block';
        spawnTempMarker(L.latLng(entry.coords[0], entry.coords[1]), (entry.type || 'poi').toLowerCase());
        setStatus('');
    }

    function closeEditor() {
        document.getElementById('edit-panel').style.display = 'none';
        if (tempMarker) {
            map.removeLayer(tempMarker);
            tempMarker = null;
        }
        editingId = null;
        pickedImageFile = null;
        // Disarm
        armedType = null;
        document.querySelectorAll('.edit-type-btn').forEach(function (b) { b.classList.remove('armed'); });
        document.getElementById('edit-hint').textContent =
            'Pick a type, then click the map. Or click an existing marker to edit it.';
    }

    // ---------- Temp marker ----------

    function spawnTempMarker(latlng, typeId) {
        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = L.marker(latlng, {
            icon: getPointType(typeId).icon,
            draggable: true,
            zIndexOffset: 2000
        }).addTo(map);
        tempMarker.on('drag', function (e) {
            var ll = e.target.getLatLng();
            document.getElementById('edit-coords').value = formatCoords(ll);
        });
    }

    function formatCoords(latlng) {
        return latlng.lat.toFixed(1) + ', ' + latlng.lng.toFixed(1);
    }

    function parseCoords(str) {
        var parts = str.split(',').map(function (s) { return parseFloat(s.trim()); });
        return [parts[0], parts[1]];
    }

    // ---------- Map click ----------

    map.on('click', function (e) {
        if (!armedType) return;
        openEditorForNew(e.latlng, armedType);
    });

    // ---------- File system ----------

    // --- Persistent directory handle (IndexedDB) ---
    // After the first save, we remember the folder you picked. On subsequent
    // sessions you only get a one-click "allow" prompt instead of the full picker.

    function idbOpen() {
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open('dnd-map-edit', 1);
            req.onupgradeneeded = function () { req.result.createObjectStore('handles'); };
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }

    async function idbGet(key) {
        var db = await idbOpen();
        return new Promise(function (resolve, reject) {
            var tx = db.transaction('handles', 'readonly');
            var req = tx.objectStore('handles').get(key);
            req.onsuccess = function () { resolve(req.result); };
            req.onerror = function () { reject(req.error); };
        });
    }

    async function idbSet(key, value) {
        var db = await idbOpen();
        return new Promise(function (resolve, reject) {
            var tx = db.transaction('handles', 'readwrite');
            tx.objectStore('handles').put(value, key);
            tx.oncomplete = function () { resolve(); };
            tx.onerror = function () { reject(tx.error); };
        });
    }

    async function ensureDirHandle() {
        if (dirHandle) {
            // Re-verify permission (it can lapse between sessions)
            if ((await dirHandle.queryPermission({ mode: 'readwrite' })) === 'granted') return dirHandle;
            if ((await dirHandle.requestPermission({ mode: 'readwrite' })) === 'granted') return dirHandle;
        }
        // Try restoring from IndexedDB
        var saved = await idbGet('projectDir');
        if (saved) {
            var perm = await saved.queryPermission({ mode: 'readwrite' });
            if (perm !== 'granted') perm = await saved.requestPermission({ mode: 'readwrite' });
            if (perm === 'granted') {
                dirHandle = saved;
                return dirHandle;
            }
        }
        // First-time pick
        dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        await idbSet('projectDir', dirHandle);
        return dirHandle;
    }

    async function readFileText(name) {
        var fh = await dirHandle.getFileHandle(name);
        var f = await fh.getFile();
        return await f.text();
    }

    async function writeFileText(name, text) {
        var fh = await dirHandle.getFileHandle(name, { create: true });
        var w = await fh.createWritable();
        await w.write(text);
        await w.close();
    }

    function convertToJpegThumbnail(file, maxWidth, quality) {
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var img = new Image();
            img.onload = function () {
                var scale = Math.min(1, maxWidth / img.width);
                var w = Math.round(img.width * scale);
                var h = Math.round(img.height * scale);
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                // White background so transparent PNGs don't go black under JPEG
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, w, h);
                ctx.drawImage(img, 0, 0, w, h);
                URL.revokeObjectURL(url);
                canvas.toBlob(function (blob) {
                    if (!blob) reject(new Error('Image conversion failed.'));
                    else resolve(blob);
                }, 'image/jpeg', quality);
            };
            img.onerror = function () {
                URL.revokeObjectURL(url);
                reject(new Error('Could not read image file.'));
            };
            img.src = url;
        });
    }

    async function writeFileBytes(folder, name, blob) {
        var folderHandle = await dirHandle.getDirectoryHandle(folder, { create: true });
        var fh = await folderHandle.getFileHandle(name, { create: true });
        var w = await fh.createWritable();
        await w.write(blob);
        await w.close();
    }

    // ---------- wiki-data.js source manipulation ----------

    // Walk forward from `start` (which points just after a `{`), tracking string
    // and brace depth, until we find the matching closing `}`. Returns the index
    // just past that `}`.
    function findMatchingBrace(src, start) {
        var i = start;
        var depth = 1;
        while (i < src.length && depth > 0) {
            var c = src[i];
            if (c === '"' || c === "'" || c === '`') {
                var quote = c;
                i++;
                while (i < src.length && src[i] !== quote) {
                    if (src[i] === '\\') i += 2;
                    else i++;
                }
                i++;
            } else if (c === '/' && src[i + 1] === '/') {
                while (i < src.length && src[i] !== '\n') i++;
            } else if (c === '/' && src[i + 1] === '*') {
                i += 2;
                while (i < src.length - 1 && !(src[i] === '*' && src[i + 1] === '/')) i++;
                i += 2;
            } else if (c === '{') {
                depth++; i++;
            } else if (c === '}') {
                depth--; i++;
            } else {
                i++;
            }
        }
        return i;
    }

    function findEntryRange(src, id) {
        var re = new RegExp('["\']' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '["\']\\s*:\\s*\\{', 'g');
        var m = re.exec(src);
        if (!m) return null;
        // Walk back to start of line for clean replacement
        var start = m.index;
        while (start > 0 && /[ \t]/.test(src[start - 1])) start--;
        var afterOpenBrace = m.index + m[0].length;
        var end = findMatchingBrace(src, afterOpenBrace);
        // Consume trailing comma + newline
        if (src[end] === ',') end++;
        if (src[end] === '\r') end++;
        if (src[end] === '\n') end++;
        return { start: start, end: end };
    }

    function formatEntry(id, data) {
        // Escape backticks in content (rare, but safe)
        var safeContent = data.content.replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
        var lines = [];
        lines.push('    "' + id + '": {');
        lines.push('        "title": "' + escapeStr(data.title) + '",');
        lines.push('        "type": "' + data.type + '",');
        if (data.image) {
            lines.push('        "image": "' + escapeStr(data.image) + '",');
        }
        lines.push('        "coords": [' + data.coords[0] + ', ' + data.coords[1] + '],');
        lines.push('        "content": `');
        lines.push(safeContent);
        lines.push('        `');
        lines.push('    },');
        return lines.join('\n');
    }

    function escapeStr(s) {
        return String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function appendEntry(src, entryText) {
        // Find the final closing `}` of the wikiData object (tolerates `};`, `} ;`, `}` alone, trailing whitespace).
        var m = /\}\s*;?\s*$/.exec(src);
        if (!m) throw new Error("Couldn't find end of wikiData object.");
        var closeIdx = m.index;
        var before = src.slice(0, closeIdx);
        var after = src.slice(closeIdx);
        // Make sure the previous entry ends with a comma
        var trimmed = before.replace(/\s+$/, '');
        if (!/[,{]$/.test(trimmed)) trimmed += ',';
        return trimmed + '\n' + entryText + '\n' + after;
    }

    function replaceEntry(src, id, entryText) {
        var range = findEntryRange(src, id);
        if (!range) return appendEntry(src, entryText);
        return src.slice(0, range.start) + entryText + '\n' + src.slice(range.end);
    }

    function removeEntry(src, id) {
        var range = findEntryRange(src, id);
        if (!range) return src;
        return src.slice(0, range.start) + src.slice(range.end);
    }

    // ---------- Save / Delete ----------

    async function saveEntry() {
        try {
            var id = document.getElementById('edit-id').value.trim();
            var title = document.getElementById('edit-title').value.trim();
            var type = document.getElementById('edit-type').value;
            var coordsStr = document.getElementById('edit-coords').value;
            var content = document.getElementById('edit-content').value;

            if (!id) return setStatus('ID is required.', true);
            if (!/^[a-z0-9_]+$/.test(id)) return setStatus('ID must be lowercase letters, digits, underscores.', true);
            if (!title) return setStatus('Title is required.', true);
            if (!coordsStr) return setStatus('Place the marker on the map.', true);

            var coords = parseCoords(coordsStr);

            setStatus('Connecting to project folder…');
            await ensureDirHandle();

            var imagePath = (wikiData[id] && wikiData[id].image) || '';
            if (pickedImageFile) {
                setStatus('Converting image…');
                var jpegBlob = await convertToJpegThumbnail(pickedImageFile, 2816, 0.85);
                var fileName = title + '.jpg';
                setStatus('Copying image…');
                await writeFileBytes('assets', fileName, jpegBlob);
                imagePath = 'assets/' + fileName;
            }

            setStatus('Reading wiki-data.js…');
            var src = await readFileText('wiki-data.js');

            setStatus('Backing up wiki-data.js…');
            await writeFileText('wiki-data.js.bak', src);

            var entryText = formatEntry(id, {
                title: title,
                type: type,
                image: imagePath,
                coords: coords,
                content: content
            });

            var newSrc;
            if (editingId) {
                newSrc = replaceEntry(src, editingId, entryText);
            } else if (findEntryRange(src, id)) {
                return setStatus('An entry with that ID already exists.', true);
            } else {
                newSrc = appendEntry(src, entryText);
            }

            setStatus('Writing wiki-data.js…');
            await writeFileText('wiki-data.js', newSrc);

            setStatus('Saved. Reloading…');
            setTimeout(function () { window.location.reload(); }, 400);
        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message, true);
        }
    }

    async function deleteEntry() {
        if (!editingId) return;
        if (!confirm('Delete entry "' + editingId + '"? This cannot be undone (but a .bak will be written).')) return;
        try {
            setStatus('Connecting to project folder…');
            await ensureDirHandle();
            var src = await readFileText('wiki-data.js');
            await writeFileText('wiki-data.js.bak', src);
            var newSrc = removeEntry(src, editingId);
            await writeFileText('wiki-data.js', newSrc);
            setStatus('Deleted. Reloading…');
            setTimeout(function () { window.location.reload(); }, 400);
        } catch (err) {
            console.error(err);
            setStatus('Error: ' + err.message, true);
        }
    }

    // ---------- Init ----------

    buildUI();
    document.body.classList.add('edit-mode-active');

    // Eagerly restore the saved folder handle so the first save just needs a
    // one-click "allow" prompt instead of the full directory picker.
    idbGet('projectDir').then(function (saved) { if (saved) dirHandle = saved; }).catch(function () {});
})();
