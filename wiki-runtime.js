// === WIKI RUNTIME ===
// Three jobs, all of which must happen before an entry is rendered:
//
//   1. merge the generated, source-derived prose into wikiData;
//   2. build the entity index used to cross-link entries;
//   3. own navigation, so that entry + map view live in the History API
//      rather than in a variable that a page reload throws away.
//
// Load order matters: this file needs wiki-data.js and generated/wiki-overrides.js
// and must run before main.js opens anything.

(function () {
    'use strict';

    // ---------- 1. generated content ----------

    // Overrides are MERGED, never substituted: wikiData owns coordinates,
    // images, and region geometry, and the content build must not be able to
    // erase them. See CONTENT_PIPELINE.md.
    var overrides = window.WIKI_ENTRY_OVERRIDES || {};
    var unknown = [];

    Object.keys(overrides).forEach(function (id) {
        // Map entries already live in wikiData and retain their coordinates
        // and imagery. Book-only entries (history, races, factions) have no
        // marker, so the generated entry itself is their complete data.
        if (!wikiData[id]) wikiData[id] = {};
        var entry = wikiData[id];
        var override = overrides[id];
        Object.keys(override).forEach(function (key) { entry[key] = override[key]; });
        entry.generated = true;
    });

    // Kept for defensive compatibility if a future data loader explicitly
    // rejects an override. Book-only entries are valid and are created above.
    if (unknown.length) {
        // Console only: a reader cannot act on this, and every entry they can
        // actually reach still works.
        reportBuildError(null, 'Generated content refers to ' + unknown.length +
            ' unknown entry ID(s): ' + unknown.join(', ') +
            '. Fix content/entry-meta.json or add the entry to wiki-data.js.');
    }

    /**
     * Say a thing went wrong.
     *
     * `detail` is the build instruction and goes to the console only. The
     * banner is the reader's, so it carries `message` alone -- a visitor who
     * is handed "Run: node scripts/build-book.mjs" learns nothing from it and
     * concludes the site is broken.
     *
     * With no `message`, nothing is shown at all: some failures are worth
     * recording for whoever maintains the site and not worth interrupting a
     * reader who may never touch the affected part.
     */
    function reportBuildError(message, detail) {
        console.error('[wiki] ' + (detail || message));
        if (!message) return;
        var banner = document.getElementById('build-error');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'build-error';
            banner.setAttribute('role', 'status');
            document.body.appendChild(banner);
        }
        // The same missing artifact can be reported by several callers; one
        // line per distinct message, not one per attempt.
        if (banner.querySelector('[data-message="' + CSS.escape(message) + '"]')) return;
        var line = document.createElement('div');
        line.dataset.message = message;
        line.textContent = message;
        banner.appendChild(line);
    }

    // ---------- 2. entity index ----------

    // Titles plus the explicit aliases from content/entry-meta.json. No
    // stemmer: invented names ("Remosa" / "Remosan" / "Remathis") make an
    // automatic adjectival rule produce confident nonsense, so alternate forms
    // are authored by hand.
    var byName = {};       // lowercased name -> [entry id, ...]

    Object.keys(wikiData).forEach(function (id) {
        var entry = wikiData[id];
        var names = [entry.title].concat(entry.aliases || []);
        names.forEach(function (name) {
            if (!name) return;
            var key = name.toLowerCase();
            if (!byName[key]) byName[key] = [];
            if (byName[key].indexOf(id) < 0) byName[key].push(id);
        });
    });

    var ambiguous = Object.keys(byName).filter(function (key) { return byName[key].length > 1; });
    // Ambiguity is reported, never guessed at: linking "Remosa" to one of two
    // entries at random is worse than not linking it. scripts/audit.mjs fails the
    // build on this; here it is only surfaced for whoever is looking.
    if (ambiguous.length) {
        console.warn('[wiki] ambiguous aliases, not linked:', ambiguous.map(function (key) {
            return key + ' -> ' + byName[key].join('/');
        }));
    }

    var linkable = Object.keys(byName)
        .filter(function (key) { return byName[key].length === 1; })
        .sort(function (a, b) { return b.length - a.length; });   // longest match wins

    // Word boundaries that also refuse to fire inside a longer name: "Remosa"
    // must not match the first six letters of "Remosan", which is its own
    // alias and would otherwise be shadowed by the shorter one. A trailing
    // apostrophe is deliberately allowed through, so "Remosa's wonders" links
    // the name and leaves the possessive outside the link.
    var linkPattern = linkable.length ? new RegExp(
        '(?<![\\w\'’])(' +
        linkable.map(function (key) { return key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }).join('|') +
        ')(?!\\w)', 'gi') : null;

    var SKIP_TAGS = { A: 1, CODE: 1, PRE: 1, SCRIPT: 1, STYLE: 1, TEXTAREA: 1, BUTTON: 1 };

    /**
     * Link unambiguous entity mentions inside `root`, in text nodes only.
     *
     * Existing anchors, attributes, image URLs and markup are never touched,
     * because nothing but character data is ever examined or rewritten.
     */
    function linkify(root, currentId) {
        if (!linkPattern) return;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
            acceptNode: function (node) {
                for (var el = node.parentNode; el && el !== root; el = el.parentNode) {
                    if (SKIP_TAGS[el.nodeName]) return NodeFilter.FILTER_REJECT;
                }
                // linkPattern is global, so test() advances lastIndex and the
                // next call would start mid-string. Reset before every use.
                linkPattern.lastIndex = 0;
                return linkPattern.test(node.nodeValue)
                    ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
            }
        });
        var targets = [];
        while (walker.nextNode()) targets.push(walker.currentNode);
        targets.forEach(function (node) { linkTextNode(node, currentId); });
    }

    function linkTextNode(node, currentId) {
        var text = node.nodeValue;
        var fragment = document.createDocumentFragment();
        var cursor = 0;
        var match;
        linkPattern.lastIndex = 0;
        while ((match = linkPattern.exec(text)) !== null) {
            var id = byName[match[1].toLowerCase()][0];
            if (id === currentId) continue;             // never link an entry to itself
            if (match.index > cursor) {
                fragment.appendChild(document.createTextNode(text.slice(cursor, match.index)));
            }
            var link = document.createElement('a');
            link.className = 'wiki-link';
            link.href = '#' + id;
            link.dataset.entry = id;
            link.textContent = match[1];                 // keep the author's capitalization
            link.title = wikiData[id].title;
            fragment.appendChild(link);
            cursor = match.index + match[1].length;
        }
        if (!cursor) return;
        if (cursor < text.length) fragment.appendChild(document.createTextNode(text.slice(cursor)));
        node.parentNode.replaceChild(fragment, node);
    }

    // ---------- 3. navigation ----------

    // The trail exists only to label the Back control ("< Haldrith"). The
    // restore itself goes through history.back(), so browser Back/Forward and
    // the sidebar control are the same operation and a reload cannot desync
    // them.
    var trail = [];

    // A #haldrith link is shareable and bookmarkable, so the tab it opens
    // should say what it is rather than repeating the site's name. Captured
    // once, before anything has changed it.
    var SITE_TITLE = document.title;

    function setTitle(entry) {
        document.title = entry ? entry.title + ' — Virelia' : SITE_TITLE;
    }

    function currentView() {
        if (typeof map === 'undefined') return null;
        var c = map.getCenter();
        return { lat: c.lat, lng: c.lng, zoom: map.getZoom() };
    }

    function depth() {
        return (history.state && typeof history.state.depth === 'number') ? history.state.depth : -1;
    }

    /**
     * Open an entry. This is the only path into the sidebar.
     *
     * `push` false is used when replaying history, so that restoring a state
     * does not append a new one.
     */
    function open(id, options) {
        options = options || {};
        var entry = wikiData[id];
        if (!entry) { console.warn('[wiki] no such entry:', id); return; }

        if (options.push !== false) {
            var next = depth() + 1;
            trail[next] = id;
            trail.length = next + 1;
            history.pushState({ entry: id, depth: next, view: currentView() }, '', '#' + id);
        }

        render(entry, id);

        if (window.MapFocus) window.MapFocus.focusEntry(id, options.view);
        // The focus animation moves the map; record where it landed so Back
        // returns to the view the reader actually had.
        window.setTimeout(syncView, 500);
    }

    function render(entry, id) {
        var sidebar = document.getElementById('sidebar');
        var contentDiv = document.getElementById('sidebar-content');
        contentDiv.innerHTML = '';
        contentDiv.scrollTop = 0;

        if (window.Narration) window.Narration.stop();

        if (entry.image) {
            var img = document.createElement('img');
            img.className = 'ribbon';
            img.src = entry.image;
            img.alt = entry.title;
            img.onclick = function () { showLightbox(entry.image, entry.title); };
            img.onerror = function () { this.style.display = 'none'; };
            contentDiv.appendChild(img);
        }

        var title = document.createElement('h2');
        title.textContent = entry.title;
        // Segment 1 of the narration is the title, so the read-along can
        // highlight it before the body starts.
        title.dataset.seg = 's-0001';
        var kind = document.createElement('small');
        kind.textContent = '(' + entry.type + ')';
        title.appendChild(document.createTextNode(' '));
        title.appendChild(kind);
        contentDiv.appendChild(title);

        var body = document.createElement('div');
        body.className = 'entry-body';
        body.innerHTML = entry.content;
        if (entry.manualNarration && !body.querySelector('.seg') && window.Narration) {
            window.Narration.segmentManual(body, entry.narration.segments);
        }
        linkify(body, id);
        contentDiv.appendChild(body);

        // Pick the side before the panel slides in, and before the map moves:
        // an entry the map cannot pan out from under a right-hand panel gets a
        // left-hand one instead. MapFocus then frames the map around whichever
        // side we chose.
        if (window.MapFocus) {
            sidebar.classList.toggle('side-left', window.MapFocus.preferredSide(id) === 'left');
        }

        sidebar.classList.add('active');
        sidebar.dataset.entry = id;
        setTitle(entry);
        updateBackControl();
        if (window.Narration) window.Narration.attach(id, contentDiv);
    }

    function close() {
        var sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('active');
        delete sidebar.dataset.entry;
        if (window.Narration) window.Narration.stop();
        if (window.MapFocus) window.MapFocus.clear();
        setTitle(null);
        // Closing starts a new reading session. Replace the active entry
        // state instead of pushing an empty history item, then clear the
        // sidebar's Back label so it can never advertise a closed entry.
        trail = [];
        history.replaceState({ entry: null, depth: -1, view: currentView() }, '',
            window.location.pathname + window.location.search);
        resetBackControl();
        var bar = document.getElementById('entry-bar');
        if (bar) bar.hidden = true;
    }

    function updateBackControl() {
        var button = document.getElementById('entry-back');
        if (!button) return;
        var previous = trail[depth() - 1];
        button.disabled = !previous;
        button.textContent = previous ? '‹ ' + wikiData[previous].title : '‹ Back';
        button.title = previous ? 'Back to ' + wikiData[previous].title : 'Nothing to go back to';
    }

    function resetBackControl() {
        var button = document.getElementById('entry-back');
        if (!button) return;
        button.disabled = true;
        button.textContent = '‹ Back';
        button.title = 'Nothing to go back to';
    }

    function syncView() {
        if (!history.state) return;
        var state = {
            entry: history.state.entry,
            depth: history.state.depth,
            view: currentView()
        };
        history.replaceState(state, '', window.location.hash);
    }

    window.addEventListener('popstate', function (event) {
        var state = event.state;
        if (state && state.entry && wikiData[state.entry]) {
            render(wikiData[state.entry], state.entry);
            if (window.MapFocus) window.MapFocus.focusEntry(state.entry, state.view);
        } else {
            document.getElementById('sidebar').classList.remove('active');
            setTitle(null);
            if (window.Narration) window.Narration.stop();
            if (window.MapFocus) window.MapFocus.clear();
            if (state && state.view && typeof map !== 'undefined') {
                map.setView([state.view.lat, state.view.lng], state.view.zoom);
            }
            var bar = document.getElementById('entry-bar');
            if (bar) bar.hidden = true;
            resetBackControl();
            return;
        }
        updateBackControl();
    });

    // A click on a generated link is a navigation, not a page load.
    document.addEventListener('click', function (event) {
        var link = event.target.closest && event.target.closest('a.wiki-link');
        if (!link) return;
        event.preventDefault();
        open(link.dataset.entry);
    });

    // Imported book images open in the lightbox. Delegated because the prose
    // is injected as HTML and carries no handlers of its own -- and because
    // the same markup is used in the sidebar and in the wiki overlay.
    document.addEventListener('click', function (event) {
        var image = event.target.closest && event.target.closest('.entry-figure img');
        if (!image || typeof showLightbox !== 'function') return;
        var figure = image.closest('.entry-figure');
        var caption = figure && figure.querySelector('figcaption');
        showLightbox(image.getAttribute('src'),
            image.getAttribute('alt') || (caption && caption.textContent) || '');
    });

    /**
     * Seed history and honour a deep link. Called once from main.js, after the
     * map exists, so that the entry a shared #haldrith URL names is opened with
     * its map focus rather than silently ignored.
     */
    function start() {
        var id = decodeURIComponent(window.location.hash.replace(/^#/, ''));
        if (id && wikiData[id]) {
            trail[0] = id;
            history.replaceState({ entry: id, depth: 0, view: currentView() }, '', '#' + id);
            open(id, { push: false });
        } else {
            history.replaceState({ entry: null, depth: -1, view: currentView() }, '',
                window.location.pathname + window.location.search);
        }
        map.on('moveend zoomend', debounce(syncView, 250));
    }

    function debounce(fn, ms) {
        var timer = null;
        return function () {
            if (timer) window.clearTimeout(timer);
            timer = window.setTimeout(fn, ms);
        };
    }

    window.WikiRuntime = {
        start: start,
        open: open,
        close: close,
        linkify: linkify,
        reportBuildError: reportBuildError
    };

    // Every other module is a plain <script> in the same document, so by
    // DOMContentLoaded the map, the narrator and the region overlays all exist.
    document.addEventListener('DOMContentLoaded', start);
})();
