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
    var loading = null;         // in-flight load, so a double click loads once
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
                    '<button type="button" id="reader-close" class="reader-close" aria-label="Close">&times;</button>' +
                '</header>' +
                '<div class="reader-body">' +
                    '<nav class="reader-toc" aria-label="Chapters"><ol id="reader-toc-list"></ol></nav>' +
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
        elements.list = overlay.querySelector('#reader-toc-list');
        elements.page = overlay.querySelector('#reader-page');
        elements.close = overlay.querySelector('#reader-close');
        elements.pager = overlay.querySelector('.reader-pager');
        elements.previous = overlay.querySelector('#reader-prev');
        elements.next = overlay.querySelector('#reader-next');

        elements.close.addEventListener('click', close);
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
            buildContents();
            return book;
        });
        return loading;
    }

    function buildContents() {
        elements.list.innerHTML = '';
        var currentPart = null;
        book.chapters.forEach(function (chapter, index) {
            if (chapter.part && chapter.part !== currentPart) {
                currentPart = chapter.part;
                var partItem = document.createElement('li');
                partItem.className = 'reader-toc-part';
                partItem.textContent = currentPart;
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

    var currentIndex = -1;

    function show(index) {
        var chapter = book && book.chapters[index];
        if (!chapter) return;
        currentIndex = index;
        elements.page.innerHTML = '';

        var heading = document.createElement('h2');
        heading.textContent = chapter.title;
        elements.page.appendChild(heading);

        if (chapter.entryId && wikiData[chapter.entryId]) {
            var jump = document.createElement('button');
            jump.type = 'button';
            jump.className = 'reader-jump';
            jump.textContent = 'Show on map';
            jump.addEventListener('click', function () {
                close();
                window.WikiRuntime.open(chapter.entryId);
            });
            elements.page.appendChild(jump);
        }

        var body = document.createElement('div');
        body.className = 'entry-body';
        body.innerHTML = chapter.html;
        // Cross-links work here too, minus a self-link to the chapter's own
        // map entry.
        window.WikiRuntime.linkify(body, chapter.entryId || null);
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
        var previous = book.chapters[currentIndex - 1];
        var next = book.chapters[currentIndex + 1];

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
        if (index >= 0 && index < book.chapters.length) show(index);
    }

    function open(chapterId) {
        opener = document.activeElement;
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
            var index = 0;
            if (chapterId) {
                var found = book.chapters.findIndex(function (c) {
                    return c.id === chapterId || c.entryId === chapterId;
                });
                if (found >= 0) index = found;
            }
            show(index);
        });
    }

    function close() {
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
