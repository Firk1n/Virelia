// === THE WIKI ===
// A full-screen view of every chapter, built from the same source and the same
// parser as the map entries (generated/book.js, from scripts/build-book.mjs).
//
// This is the wiki, not the book: the prose made navigable -- cross-linked,
// tied to the map, narratable. The book itself is book.js, which opens the
// PDF. The two come from the same document, so they cannot disagree.
//
// The reader is an overlay, not a navigation: it pushes no history and moves
// no map, so closing it leaves the entry and the map exactly as they were.
//
// generated/book.js is 417 KB of prose and is fetched on first open rather
// than in the page's <head>. It is the same text the sidebar entries are built
// from, so for a visitor who only wants the map it is a second copy of
// something they already have and are not reading.

(function () {
    'use strict';

    var SRC = 'generated/book.js';

    var book = null;
    var chapters = [];          // the book's chapters, plus the places below
    var loading = null;         // in-flight load, so a double click loads once

    // The book is about regions, races and factions. The map also carries
    // cities, towns and landmarks, which were never book chapters and should
    // not become them -- but the wiki is meant to hold everything the map
    // knows, so it grows the sections the book has no reason to.
    var PLACE_PARTS = [
        { type: 'city', part: 'The Cities of Virelia' },
        { type: 'town', part: 'The Towns of Virelia' },
        { type: 'poi',  part: 'Places of Interest' }
    ];
    var opener = null;
    var elements = {};

    function build() {
        var overlay = document.createElement('div');
        overlay.id = 'reader';
        overlay.hidden = true;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Virelia wiki');
        overlay.innerHTML =
            '<div class="reader-frame">' +
                '<header class="reader-head">' +
                    '<h1>Virelia</h1>' +
                    '<div class="reader-actions">' +
                        '<button type="button" id="reader-contents-toggle" class="reader-contents-toggle" aria-expanded="false" aria-controls="reader-toc">Contents</button>' +
                        '<button type="button" id="reader-close" class="reader-close" aria-label="Close">&times;</button>' +
                    '</div>' +
                '</header>' +
                '<div class="reader-body">' +
                    '<nav id="reader-toc" class="reader-toc" aria-label="Chapters"><ol id="reader-toc-list"></ol></nav>' +
                    '<div class="reader-main">' +
                        '<article class="reader-page" id="reader-page" tabindex="-1"></article>' +
                        '<nav class="reader-pager" aria-label="Chapter navigation" hidden>' +
                            '<button type="button" id="reader-prev" class="reader-pager-btn"></button>' +
                            '<button type="button" id="reader-next" class="reader-pager-btn"></button>' +
                        '</nav>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        elements.overlay = overlay;
        elements.frame = overlay.querySelector('.reader-frame');
        elements.list = overlay.querySelector('#reader-toc-list');
        elements.page = overlay.querySelector('#reader-page');
        elements.close = overlay.querySelector('#reader-close');
        elements.contentsToggle = overlay.querySelector('#reader-contents-toggle');
        elements.main = overlay.querySelector('.reader-main');
        elements.pager = overlay.querySelector('.reader-pager');
        // There is one narrator and one transport in the page. Rather than
        // building a second set of controls that could disagree with the
        // first, the bar moves to whichever surface is showing the prose.
        elements.player = document.getElementById('entry-bar');
        elements.previous = overlay.querySelector('#reader-prev');
        elements.next = overlay.querySelector('#reader-next');

        elements.close.addEventListener('click', close);
        elements.contentsToggle.addEventListener('click', function () {
            setContentsOpen(!elements.frame.classList.contains('toc-open'));
        });
        overlay.addEventListener('keydown', onKeyDown);
        // The darkened surround is a way out, as it is for the search panel.
        // mousedown rather than click, and only when it is the surround itself,
        // so a selection dragged from inside the page and released on the
        // margin does not dismiss what you were reading.
        overlay.addEventListener('mousedown', function (event) {
            if (event.target === overlay) close();
        });
        elements.previous.addEventListener('click', function () { step(-1); });
        elements.next.addEventListener('click', function () { step(1); });

        // A cross-link followed here stays here. It used to fall through to
        // WikiRuntime's document-level handler, which opened the sidebar
        // underneath the wiki -- so following a reference silently queued up a
        // panel you would only meet on the way out. The wiki refers to the
        // wiki; the map pin beside the title is how you cross to the sidebar.
        elements.page.addEventListener('click', function (event) {
            var link = event.target.closest && event.target.closest('a.wiki-link');
            if (!link) return;
            event.preventDefault();
            event.stopPropagation();          // keep the global handler out of it
            var index = indexOfEntry(link.dataset.entry);
            if (index >= 0) { show(index); return; }
            // Nothing here covers it, so hand it to the map rather than
            // swallowing the click.
            close();
            window.WikiRuntime.open(link.dataset.entry);
        });
    }

    function setContentsOpen(open) {
        elements.frame.classList.toggle('toc-open', open);
        elements.contentsToggle.setAttribute('aria-expanded', String(open));
    }

    /** Fetch and run generated/book.js once, resolving to the book or null. */
    function load() {
        if (book) return Promise.resolve(book);
        if (window.VIRELIA_BOOK) { book = window.VIRELIA_BOOK; return Promise.resolve(book); }
        if (loading) return loading;

        loading = new Promise(function (resolve) {
            var script = document.createElement('script');
            script.src = SRC;
            script.onload = function () { resolve(window.VIRELIA_BOOK || null); };
            script.onerror = function () { resolve(null); };
            document.head.appendChild(script);
        }).then(function (loaded) {
            loading = null;
            if (!loaded) return null;
            book = loaded;
            chapters = book.chapters.concat(placeChapters());
            buildContents();
            return book;
        });
        return loading;
    }

    /**
     * Chapters for every map entry the book does not already cover.
     *
     * The prose is the same generated text the sidebar shows, so there is
     * nothing to keep in step: one source, read in two places.
     */
    function placeChapters() {
        var inBook = {};
        book.chapters.forEach(function (c) { if (c.entryId) inBook[c.entryId] = true; });

        var extra = [];
        PLACE_PARTS.forEach(function (group) {
            Object.keys(wikiData)
                .filter(function (id) {
                    var entry = wikiData[id];
                    return !inBook[id] && entry.content &&
                        (entry.type || '').toLowerCase() === group.type;
                })
                // A gazetteer is looked things up in, so alphabetical -- unlike
                // the book's parts, which are in the order they were written.
                .sort(function (a, b) {
                    return (wikiData[a].title || a).localeCompare(wikiData[b].title || b);
                })
                .forEach(function (id) {
                    extra.push({
                        id: 'place-' + id,
                        entryId: id,
                        title: wikiData[id].title || id,
                        entryKind: wikiData[id].type || '',
                        part: group.part,
                        html: wikiData[id].content
                    });
                });
        });
        return extra;
    }

    /**
     * The heading a part gets in the contents.
     *
     * The book's parts are named in full in the source -- "The Regions of
     * Virelia" -- because a printed page has to say where it is. A reader
     * already inside the wiki does not, and the full names sat directly above
     * a chapter of the same name.
     */
    function partLabel(part) {
        return part.replace(/\s+of\s+Virelia\s*$/i, '').replace(/^The\s+/i, '');
    }

    function buildContents() {
        elements.list.innerHTML = '';
        var currentPart = null;
        chapters.forEach(function (chapter, index) {
            if (chapter.part && chapter.part !== currentPart) {
                currentPart = chapter.part;
                var partItem = document.createElement('li');
                partItem.className = 'reader-toc-part';
                partItem.textContent = partLabel(currentPart);
                elements.list.appendChild(partItem);
            }
            var item = document.createElement('li');
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'reader-toc-link';
            button.textContent = chapter.title;
            button.dataset.index = index;
            button.addEventListener('click', function () { show(index); });
            item.appendChild(button);
            elements.list.appendChild(item);
        });
    }

    /**
     * Remove a leading epigraph that only restates the site's own name.
     *
     * Returns the tagline beneath it, if there was one, so the caller can put
     * it somewhere that makes sense. Matches against the header rather than a
     * hardcoded string, so the two cannot drift apart.
     */
    function liftTitleEpigraph(body) {
        var first = body.firstElementChild;
        if (!first || !first.classList.contains('entry-epigraph')) return null;
        var lines = first.querySelectorAll('p');
        if (!lines.length) return null;
        var siteName = elements.overlay.querySelector('.reader-head h1');
        siteName = siteName ? siteName.textContent.trim().toLowerCase() : 'virelia';
        if (lines[0].textContent.trim().toLowerCase() !== siteName) return null;
        var tagline = lines.length > 1 ? lines[lines.length - 1].textContent.trim() : '';
        first.remove();
        return tagline || null;
    }

    function indexOfEntry(id) {
        return chapters.findIndex(function (c) { return c.entryId === id || c.id === id; });
    }

    var currentIndex = -1;

    function show(index) {
        var chapter = chapters[index];
        if (!chapter) return;
        currentIndex = index;
        // On a phone the contents is a drawer, not a permanent half-screen
        // column. Choosing a chapter returns immediately to the prose.
        setContentsOpen(false);
        elements.page.innerHTML = '';

        var head = document.createElement('div');
        head.className = 'reader-head-row';

        var heading = document.createElement('h2');
        heading.textContent = chapter.title;
        // Segment 1 of every narration is the title, exactly as in the
        // sidebar. Without this the read-along has nothing to mark while the
        // first line is being spoken.
        if (chapter.entryId && wikiData[chapter.entryId] && wikiData[chapter.entryId].narration) {
            heading.dataset.seg = 's-0001';
        }
        // Only the places carry one; the book's own chapters have a `kind` of
        // "chapter"/"front", which is structure and not something to print.
        if (chapter.entryKind) {
            var kind = document.createElement('small');
            kind.textContent = '(' + window.WikiRuntime.typeLabel(chapter.entryKind) + ')';
            heading.appendChild(document.createTextNode(' '));
            heading.appendChild(kind);
        }
        head.appendChild(heading);

        // The counterpart of the sidebar's wiki mark: one button, in the same
        // place on the title line, pointing the other way. Only for chapters
        // that are actually somewhere -- a race or a faction is not a place.
        if (chapter.entryId && wikiData[chapter.entryId] && wikiData[chapter.entryId].coords) {
            var jump = document.createElement('button');
            jump.type = 'button';
            jump.className = 'reader-jump';
            jump.title = 'Show ' + chapter.title + ' on the map';
            jump.setAttribute('aria-label', jump.title);
            jump.innerHTML = '<svg aria-hidden="true"><use href="#icon-map"></use></svg>';
            jump.addEventListener('click', function () {
                close();
                window.WikiRuntime.open(chapter.entryId);
            });
            head.appendChild(jump);
        }
        elements.page.appendChild(head);

        var body = document.createElement('div');
        body.className = 'entry-body';
        // The entry's own copy wherever there is one, not the chapter the book
        // build sliced. They are the same prose, but only the entry's carries
        // the segment ids the timing files were written against -- the races
        // segment differently here because their mechanics appendix is split
        // off, and the wiki's "Fractured Era" chapter stops 236 words early.
        // Reading the entry fixes both, and makes every chapter narratable.
        var entry = chapter.entryId ? wikiData[chapter.entryId] : null;
        body.innerHTML = (entry && entry.content) || chapter.html;

        // The Preface opens with the book's title page: the name, then its
        // tagline. A printed book needs that; the wiki's own header says
        // Virelia an inch above the heading, so the name is furniture. Keep
        // the tagline, which is the half that says something, and set it under
        // the chapter title where a subtitle belongs -- rather than leaving it
        // in an epigraph, whose em-dash would make it read as a quotation
        // attributed to nobody.
        var subtitle = liftTitleEpigraph(body);

        // Cross-links work here too, minus a self-link to the chapter's own
        // map entry.
        window.WikiRuntime.linkify(body, chapter.entryId || null);
        if (subtitle) {
            var line = document.createElement('p');
            line.className = 'reader-subtitle';
            line.textContent = subtitle;
            elements.page.appendChild(line);
        }
        elements.page.appendChild(body);

        Array.prototype.forEach.call(elements.list.querySelectorAll('.reader-toc-link'), function (b) {
            var isCurrent = Number(b.dataset.index) === index;
            b.classList.toggle('is-current', isCurrent);
            if (isCurrent) {
                b.setAttribute('aria-current', 'true');
                // Deep in a 33-chapter list, the current chapter is often
                // scrolled out of the contents entirely.
                if (b.scrollIntoView) b.scrollIntoView({ block: 'nearest' });
            } else {
                b.removeAttribute('aria-current');
            }
        });

        updatePager();
        // Narrate what is on screen. attach() hides the bar by itself for the
        // Preface and the part introductions, which are nobody's entry.
        if (window.Narration) window.Narration.attach(chapter.entryId || null, elements.page);
        elements.page.scrollTop = 0;
        elements.page.focus();
    }

    /**
     * Label the pager with where it goes.
     *
     * Reading 33 chapters by returning to the contents after each one is not
     * reading, it is filing. A named destination also tells you what is coming
     * without having to look it up.
     */
    function updatePager() {
        if (!book) return;
        elements.pager.hidden = false;
        var previous = chapters[currentIndex - 1];
        var next = chapters[currentIndex + 1];

        elements.previous.disabled = !previous;
        elements.previous.textContent = previous ? '‹ ' + previous.title : '‹ Previous';
        elements.previous.title = previous ? 'Previous chapter: ' + previous.title : '';

        elements.next.disabled = !next;
        elements.next.textContent = next ? next.title + ' ›' : 'Next ›';
        elements.next.title = next ? 'Next chapter: ' + next.title : '';
    }

    function step(delta) {
        if (!book) return;
        var index = currentIndex + delta;
        if (index >= 0 && index < chapters.length) show(index);
    }

    function open(chapterId) {
        opener = document.activeElement;
        // The wiki covers the map and shows the same entry with more room, so
        // leaving the sidebar open behind it just means finding it still there
        // on the way out. `chapterId` was read before this, so closing the
        // panel cannot take the destination with it.
        if (window.WikiRuntime) window.WikiRuntime.close();
        elements.overlay.hidden = false;
        document.body.classList.add('reader-open');

        if (!book) {
            elements.page.innerHTML = '<p class="reader-loading">Opening the wiki…</p>';
            elements.pager.hidden = true;
        }
        elements.close.focus();

        load().then(function (loaded) {
            if (elements.overlay.hidden) return;      // closed while loading
            if (!loaded) {
                elements.page.innerHTML = '';
                var failed = document.createElement('p');
                failed.className = 'reader-loading';
                failed.textContent = 'The wiki could not be loaded. Please try again.';
                elements.page.appendChild(failed);
                window.WikiRuntime.reportBuildError(null,
                    SRC + ' failed to load. Build it: node scripts/build-book.mjs');
                return;
            }
            // Between the prose and the chapter pager, so the pager stays the
            // last thing in the column.
            if (elements.player && elements.player.parentNode !== elements.main) {
                elements.main.insertBefore(elements.player, elements.pager);
            }
            var index = 0;
            if (chapterId) {
                var found = chapters.findIndex(function (c) {
                    return c.id === chapterId || c.entryId === chapterId;
                });
                if (found >= 0) index = found;
            }
            show(index);
        });
    }

    function close() {
        // Stop before moving: the highlight points into the page we are about
        // to leave.
        if (window.Narration) window.Narration.stop();
        if (elements.player) {
            elements.player.hidden = true;
            document.getElementById('sidebar').appendChild(elements.player);
        }
        elements.overlay.hidden = true;
        document.body.classList.remove('reader-open');
        // Focus goes back where it came from; nothing else in the page moved,
        // so the entry and the map view are already the ones left behind.
        if (opener && opener.focus) opener.focus();
        opener = null;
    }

    function isOpen() {
        return elements.overlay && !elements.overlay.hidden;
    }

    function onKeyDown(event) {
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        // Chapter paging from the keyboard, but not while the reader is trying
        // to move a caret or a scrollbar inside a control.
        if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') &&
            !event.altKey && !event.ctrlKey && !event.metaKey &&
            !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
            event.preventDefault();
            step(event.key === 'ArrowRight' ? 1 : -1);
            return;
        }
        if (event.key !== 'Tab') return;
        // Focus trap: the overlay covers the page, so Tab must not wander out
        // to the map behind it.
        var focusable = elements.overlay.querySelectorAll(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }

    build();

    var trigger = document.getElementById('open-reader');
    if (trigger) trigger.addEventListener('click', function () {
        var sidebar = document.getElementById('sidebar');
        open(sidebar && sidebar.dataset.entry);
    });

    window.Reader = { open: open, close: close, isOpen: isOpen, load: load };
})();
