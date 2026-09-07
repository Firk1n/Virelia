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

(function () {
    'use strict';

    var book = window.VIRELIA_BOOK || null;
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
                    '<article class="reader-page" id="reader-page" tabindex="-1"></article>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        elements.overlay = overlay;
        elements.list = overlay.querySelector('#reader-toc-list');
        elements.page = overlay.querySelector('#reader-page');
        elements.close = overlay.querySelector('#reader-close');

        elements.close.addEventListener('click', close);
        overlay.addEventListener('keydown', onKeyDown);

        if (!book) return;
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

    function show(index) {
        var chapter = book.chapters[index];
        if (!chapter) return;
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
            b.classList.toggle('is-current', Number(b.dataset.index) === index);
            b.setAttribute('aria-current', Number(b.dataset.index) === index ? 'true' : 'false');
        });
        elements.page.scrollTop = 0;
        elements.page.focus();
    }

    function open(chapterId) {
        if (!book) {
            window.WikiRuntime.reportBuildError(
                'The book view has not been built. Run: node scripts/build-book.mjs');
            return;
        }
        opener = document.activeElement;
        elements.overlay.hidden = false;
        document.body.classList.add('reader-open');
        var index = 0;
        if (chapterId) {
            var found = book.chapters.findIndex(function (c) {
                return c.id === chapterId || c.entryId === chapterId;
            });
            if (found >= 0) index = found;
        }
        show(index);
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

    window.Reader = { open: open, close: close, isOpen: isOpen };
})();
