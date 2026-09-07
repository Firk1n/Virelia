// === THE BOOK ===
// The document itself: book/Virelia.pdf, exported from Virelia.docx by
// scripts/export-book-pdf.ps1.
//
// The Wiki beside it is the same prose made navigable -- linked, searchable by
// the map, narrated. This is the thing it was made from, with the layout and
// every image intact. It is generated rather than the older Virelia.pdf lying
// around next to the source, so the two never disagree.
//
// Like the Wiki, it is an overlay: it pushes no history and moves no map, so
// closing it leaves the entry and the map exactly as they were.

(function () {
    'use strict';

    var SRC = 'book/Virelia.pdf';

    var overlay = null;
    var frame = null;
    var opener = null;

    function build() {
        overlay = document.createElement('div');
        overlay.id = 'book';
        overlay.hidden = true;
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Virelia, the book');
        overlay.innerHTML =
            '<div class="reader-frame">' +
                '<header class="reader-head">' +
                    '<h1>Virelia</h1>' +
                    '<span class="book-actions">' +
                        '<a class="book-open" href="' + SRC + '" target="_blank" rel="noopener">Open in a new tab</a>' +
                        '<button type="button" id="book-close" class="reader-close" aria-label="Close">&times;</button>' +
                    '</span>' +
                '</header>' +
                '<div class="book-body"></div>' +
            '</div>';
        document.body.appendChild(overlay);
        overlay.querySelector('#book-close').addEventListener('click', close);
        overlay.addEventListener('keydown', onKeyDown);
    }

    function open() {
        opener = document.activeElement;
        overlay.hidden = false;
        overlay.querySelector('#book-close').focus();
        if (frame) return;

        var body = overlay.querySelector('.book-body');
        body.innerHTML = '';        // a retry replaces the last answer, not stacks on it

        // Built on first open, not at load: this is a large PDF and there is
        // no reason to fetch it for someone who only wants the map. Checked
        // first, because an <iframe> pointing at a missing file shows the
        // browser's own "it may have been moved, edited, or deleted" page,
        // which tells the reader nothing about what to do.
        //
        // no-store because this asks whether the file is there *now*. Anyone
        // who opened the Book before exporting the PDF has a 404 in their
        // cache, and a cached answer to that question is worse than no answer.
        fetch(SRC, { method: 'HEAD', cache: 'no-store' })
            .then(function (response) { return response.ok; })
            .catch(function () {
                // No answer at all, which is not the same as "no file".
                // python -m http.server answers HEAD with a Content-Length and
                // no body, and Chrome reports that as an aborted request. A
                // probe that cannot complete must not be the thing that
                // decides whether the reader gets the book: assume it is there
                // and let the viewer say otherwise.
                return true;
            })
            .then(function (present) {
                if (present) {
                    frame = document.createElement('iframe');
                    frame.className = 'book-frame';
                    frame.title = 'Virelia';
                    frame.src = SRC;
                    body.appendChild(frame);
                    return;
                }
                console.error('[book] ' + SRC + ' is missing. Export it: npm run pdf');
                var missing = document.createElement('p');
                missing.className = 'book-missing';
                // The reader gets the fact and the alternative, not the build
                // step -- they are not the one who can run it.
                missing.textContent = 'The book is not available to read here yet. ' +
                    'Everything in it can be read in the Wiki.';
                body.appendChild(missing);
            });
    }

    function close() {
        overlay.hidden = true;
        if (opener && opener.focus) opener.focus();
        opener = null;
    }

    function onKeyDown(event) {
        if (event.key === 'Escape') { event.preventDefault(); close(); return; }
        if (event.key !== 'Tab') return;
        // The PDF viewer inside the frame takes focus of its own; the trap only
        // has to keep the surrounding chrome from handing focus to the map.
        var focusable = overlay.querySelectorAll('a[href], button:not([disabled])');
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

    var trigger = document.getElementById('open-book');
    if (trigger) trigger.addEventListener('click', open);

    window.Book = { open: open, close: close };
})();
