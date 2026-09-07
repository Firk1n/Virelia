// === SEARCH ===
// Fifty thousand words reachable only by clicking the right dot is an archive,
// not a reference. This is the index over everything already in the page:
// every entry's title, its authored aliases, and its full prose.
//
// The index is built from wikiData, which wiki-runtime.js has already merged
// the generated content into -- so book-only entries (history, races,
// factions) are searchable too, even though they have no marker to click.
//
// Like the Wiki and the Book this is an overlay: it pushes no history and
// moves no map. Choosing a result is what navigates, and it goes through
// WikiRuntime.open so a search lands in history exactly like a link click.

(function () {
    'use strict';

    var SNIPPET = 140;          // characters of context around a body match
    var LIMIT = 20;             // results shown; more than this is a worse query

    var index = null;           // built on first use, not at load
    var elements = {};
    var results = [];
    var active = -1;
    var opener = null;

    /* ------------------------------------------------------------- indexing */

    // The prose is stored as HTML. Searching the markup would match tag names
    // and image URLs, and highlighting an offset inside it would cut tags in
    // half, so each entry is flattened to text once and searched there.
    function toText(html) {
        var host = document.createElement('div');
        host.innerHTML = html || '';
        // Figure captions are prose; alt text and URLs are not.
        Array.prototype.forEach.call(host.querySelectorAll('script, style'), function (el) {
            el.remove();
        });
        return (host.textContent || '').replace(/\s+/g, ' ').trim();
    }

    function build() {
        if (index) return index;
        index = Object.keys(wikiData).map(function (id) {
            var entry = wikiData[id];
            var text = toText(entry.content);
            return {
                id: id,
                title: entry.title || id,
                type: entry.type || '',
                aliases: entry.aliases || [],
                hasMarker: !!entry.coords,
                text: text,
                haystack: text.toLowerCase(),
                titleKey: (entry.title || id).toLowerCase(),
                aliasKeys: (entry.aliases || []).map(function (a) { return a.toLowerCase(); })
            };
        });
        return index;
    }

    /* ------------------------------------------------------------- querying */

    /**
     * Rank a query against one entry, or return null for no match.
     *
     * The ordering is about intent, not about counting: someone typing
     * "haldrith" wants the entry called Haldrith, not the forty other entries
     * that mention it. So a title beats an alias, an alias beats the prose,
     * and only within the prose does frequency decide anything.
     */
    function score(record, query) {
        if (record.titleKey === query) return { rank: 0, at: -1 };
        if (record.titleKey.indexOf(query) === 0) return { rank: 1, at: -1 };
        if (record.aliasKeys.indexOf(query) >= 0) return { rank: 2, at: -1 };
        if (record.titleKey.indexOf(query) >= 0) return { rank: 3, at: -1 };
        for (var i = 0; i < record.aliasKeys.length; i++) {
            if (record.aliasKeys[i].indexOf(query) === 0) return { rank: 4, at: -1 };
        }
        var at = record.haystack.indexOf(query);
        if (at < 0) return null;
        var hits = 0, from = at;
        while (from >= 0) { hits++; from = record.haystack.indexOf(query, from + query.length); }
        // Rank 5 with frequency as the tie-break, negated so more is better.
        return { rank: 5, at: at, hits: -hits };
    }

    function search(raw) {
        var query = raw.trim().toLowerCase();
        if (query.length < 2) return [];
        return build()
            .map(function (record) {
                var hit = score(record, query);
                return hit ? { record: record, hit: hit } : null;
            })
            .filter(Boolean)
            .sort(function (a, b) {
                return a.hit.rank - b.hit.rank ||
                    (a.hit.hits || 0) - (b.hit.hits || 0) ||
                    a.record.title.localeCompare(b.record.title);
            })
            .slice(0, LIMIT);
    }

    /**
     * A window of prose around the match, cut at word boundaries.
     *
     * Returned as {before, match, after} rather than as HTML so the caller can
     * build it with text nodes: the prose is the author's and must never be
     * re-parsed as markup on its way to the screen.
     */
    function snippet(record, query, at) {
        if (at < 0) {
            return { before: record.text.slice(0, SNIPPET), match: '', after: '' };
        }
        var half = Math.floor((SNIPPET - query.length) / 2);
        var start = Math.max(0, at - half);
        var end = Math.min(record.text.length, at + query.length + half);
        if (start > 0) {
            var space = record.text.indexOf(' ', start);
            if (space >= 0 && space < at) start = space + 1;
        }
        if (end < record.text.length) {
            var back = record.text.lastIndexOf(' ', end);
            if (back > at + query.length) end = back;
        }
        return {
            before: (start > 0 ? '…' : '') + record.text.slice(start, at),
            match: record.text.substr(at, query.length),
            after: record.text.slice(at + query.length, end) + (end < record.text.length ? '…' : '')
        };
    }

    /* ----------------------------------------------------------------- view */

    function buildPanel() {
        var overlay = document.createElement('div');
        overlay.id = 'search';
        overlay.hidden = true;
        overlay.innerHTML =
            '<div class="search-panel" role="dialog" aria-modal="true" aria-label="Search Virelia">' +
                '<div class="search-field">' +
                    '<input type="search" id="search-input" class="search-input" autocomplete="off"' +
                    ' spellcheck="false" placeholder="Search Virelia…" aria-label="Search Virelia"' +
                    ' role="combobox" aria-expanded="false" aria-controls="search-results"' +
                    ' aria-autocomplete="list">' +
                    '<button type="button" id="search-close" class="search-close" aria-label="Close search">&times;</button>' +
                '</div>' +
                '<p id="search-hint" class="search-hint">Regions, races, factions and every word of the text.</p>' +
                '<ul id="search-results" class="search-results" role="listbox" aria-label="Results"></ul>' +
            '</div>';
        document.body.appendChild(overlay);

        elements.overlay = overlay;
        elements.input = overlay.querySelector('#search-input');
        elements.list = overlay.querySelector('#search-results');
        elements.hint = overlay.querySelector('#search-hint');

        overlay.querySelector('#search-close').addEventListener('click', close);
        // A click on the backdrop, but not one that started inside the panel.
        overlay.addEventListener('mousedown', function (event) {
            if (event.target === overlay) close();
        });
        elements.input.addEventListener('input', function () { render(elements.input.value); });
        elements.input.addEventListener('keydown', onKeyDown);
        elements.list.addEventListener('keydown', onKeyDown);
    }

    function render(raw) {
        results = search(raw);
        active = results.length ? 0 : -1;
        elements.list.innerHTML = '';
        var query = raw.trim().toLowerCase();

        elements.input.setAttribute('aria-expanded', results.length ? 'true' : 'false');

        if (query.length < 2) {
            elements.hint.textContent = 'Regions, races, factions and every word of the text.';
            return;
        }
        if (!results.length) {
            elements.hint.textContent = 'Nothing in Virelia matches “' + raw.trim() + '”.';
            return;
        }
        elements.hint.textContent = results.length === LIMIT
            ? 'First ' + LIMIT + ' matches.'
            : results.length + (results.length === 1 ? ' match.' : ' matches.');

        results.forEach(function (result, i) {
            var record = result.record;
            var item = document.createElement('li');
            item.className = 'search-result';
            item.id = 'search-result-' + i;
            item.setAttribute('role', 'option');
            item.setAttribute('aria-selected', i === active ? 'true' : 'false');
            item.tabIndex = -1;

            var head = document.createElement('span');
            head.className = 'search-result-title';
            head.textContent = record.title;
            if (record.type) {
                var kind = document.createElement('span');
                kind.className = 'search-result-type';
                kind.textContent = record.type;
                head.appendChild(document.createTextNode(' '));
                head.appendChild(kind);
            }
            item.appendChild(head);

            var context = snippet(record, query, result.hit.at);
            var line = document.createElement('span');
            line.className = 'search-result-snippet';
            line.appendChild(document.createTextNode(context.before));
            if (context.match) {
                var mark = document.createElement('mark');
                mark.textContent = context.match;
                line.appendChild(mark);
            }
            line.appendChild(document.createTextNode(context.after));
            item.appendChild(line);

            item.addEventListener('click', function () { choose(i); });
            elements.list.appendChild(item);
        });
        highlight();
    }

    function highlight() {
        Array.prototype.forEach.call(elements.list.children, function (item, i) {
            var on = i === active;
            item.classList.toggle('is-active', on);
            item.setAttribute('aria-selected', on ? 'true' : 'false');
            if (on) {
                elements.input.setAttribute('aria-activedescendant', item.id);
                if (item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
            }
        });
        if (active < 0) elements.input.removeAttribute('aria-activedescendant');
    }

    function move(delta) {
        if (!results.length) return;
        active = (active + delta + results.length) % results.length;
        highlight();
    }

    function choose(i) {
        var result = results[i];
        if (!result) return;
        close();
        // The wiki overlay covers the map, so a result chosen from inside it
        // would open an entry nobody can see.
        if (window.Reader && window.Reader.isOpen()) window.Reader.close();
        window.WikiRuntime.open(result.record.id);
    }

    function onKeyDown(event) {
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key === 'ArrowDown') { event.preventDefault(); move(1); return; }
        if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); return; }
        if (event.key === 'Enter') { event.preventDefault(); choose(active); return; }
        // The panel is two controls and a list; Tab has nowhere useful to go.
        if (event.key === 'Tab' && !event.shiftKey && results.length) {
            event.preventDefault();
            move(1);
        }
    }

    function open(seed) {
        opener = document.activeElement;
        elements.overlay.hidden = false;
        document.body.classList.add('search-open');
        elements.input.value = seed || '';
        render(elements.input.value);
        elements.input.focus();
        elements.input.select();
    }

    function close() {
        if (elements.overlay.hidden) return;
        elements.overlay.hidden = true;
        document.body.classList.remove('search-open');
        if (opener && opener.focus) opener.focus();
        opener = null;
    }

    function isOpen() {
        return elements.overlay && !elements.overlay.hidden;
    }

    buildPanel();

    var trigger = document.getElementById('open-search');
    if (trigger) trigger.addEventListener('click', function () { open(''); });

    // "/" is the reflex for search on a page of text, and Ctrl-K is the reflex
    // everywhere else. Neither may fire while the reader is typing into
    // something -- including this panel's own box.
    document.addEventListener('keydown', function (event) {
        if (isOpen()) return;
        var el = document.activeElement;
        if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
        if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            open('');
        } else if ((event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            open('');
        }
    });

    window.Search = { open: open, close: close, isOpen: isOpen };
})();
