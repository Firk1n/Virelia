// === READ ALOUD ===
// Plays the pre-rendered narration for an entry and highlights the phrase
// being spoken.
//
// There is no speech synthesis here and there must never be: the narration is
// a cloned voice rendered offline (see Virelia/audio/render_entries.py), and a
// browser voice reading the same page would be a different book.
//
// The page never has to align text to audio. scripts/build-wiki.mjs stamps each
// synthesis unit into the markup as <span class="seg" data-seg="s-NNNN">, and
// the renderer writes its timings against those same ids. A timing file whose
// textHash no longer matches the built entry is refused rather than used to
// highlight the wrong sentence.

(function () {
    'use strict';

    var TIMING_VERSION = 1;

    // Speed lives behind the button rather than beside it: the row has no room
    // for a slider, but a slider is the right control for a continuous value,
    // so it opens into one on demand. Vertical and bottom-to-top, which is
    // what a rate control looks like everywhere else.
    var MIN_RATE = 1;
    var MAX_RATE = 3;

    var state = {
        entryId: null,
        contentRoot: null,
        audio: null,
        segments: [],      // [{id, start, end}] sorted by start
        active: null,      // currently highlighted element
        playbackRate: 1
    };

    var ui = {};

    function init() {
        ui.bar = document.getElementById('entry-bar');
        ui.play = document.getElementById('narration-play');
        ui.previous = document.getElementById('narration-prev');
        ui.next = document.getElementById('narration-next');
        ui.seek = document.getElementById('narration-seek');
        ui.time = document.getElementById('narration-time');
        ui.toggle = document.getElementById('narration-toggle');
        ui.speed = document.getElementById('narration-speed');
        ui.speedPopover = document.getElementById('narration-speed-popover');
        ui.speedRange = document.getElementById('narration-speed-range');
        ui.speedValue = document.getElementById('narration-speed-value');
        ui.status = document.getElementById('narration-status');
        if (!ui.play) return;

        ui.play.addEventListener('click', toggle);
        if (ui.toggle) {
            ui.toggle.addEventListener('click', function () { setCollapsed(!collapsed); });
            setCollapsed(readCollapsed());
        }
        ui.previous.addEventListener('click', function () { jumpParagraph(-1); });
        ui.next.addEventListener('click', function () { jumpParagraph(1); });
        ui.seek.addEventListener('input', function () {
            if (!state.audio || !isFinite(state.audio.duration)) return;
            state.audio.currentTime = state.audio.duration * (ui.seek.value / 1000);
            if (!state.audio.paused) paint(state.audio.currentTime);
        });
        ui.speed.addEventListener('click', function (event) {
            event.stopPropagation();
            toggleSpeed();
        });
        ui.speedRange.addEventListener('input', function () {
            state.playbackRate = clampRate(+ui.speedRange.value);
            if (state.audio) state.audio.playbackRate = state.playbackRate;
            updateSpeedLabel();
        });
        // Inside the popover is not outside it.
        ui.speedPopover.addEventListener('click', function (event) { event.stopPropagation(); });
        // Anywhere else is: the panel is a menu, and a menu closes when you
        // look away from it.
        document.addEventListener('click', function () { closeSpeed(); });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'Escape' && isSpeedOpen()) {
                event.stopPropagation();
                closeSpeed();
                ui.speed.focus();
            }
        });
        updateSpeedLabel();
    }

    /* ---------------------------------------------------- folding it away */

    // Remembered per reader, because someone who reads rather than listens
    // wants it gone every time, not once. A convenience, so a browser that
    // refuses storage just means it opens expanded again.
    var COLLAPSED_KEY = 'virelia.narration.collapsed';
    var collapsed = false;

    function readCollapsed() {
        try { return window.localStorage.getItem(COLLAPSED_KEY) === '1'; }
        catch (e) { return false; }
    }

    function setCollapsed(next) {
        collapsed = !!next;
        try { window.localStorage.setItem(COLLAPSED_KEY, collapsed ? '1' : '0'); }
        catch (e) { /* private window, or storage refused; the class still holds */ }
        if (ui.bar) ui.bar.classList.toggle('is-collapsed', collapsed);
        if (ui.toggle) {
            ui.toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            ui.toggle.title = collapsed ? 'Show the audio player' : 'Hide the audio player';
            ui.toggle.setAttribute('aria-label', ui.toggle.title);
        }
        // Folding it away is not a reason to stop reading aloud: someone may
        // want the voice and not the transport. Closing the popover is, since
        // it would otherwise float over a bar that is no longer there.
        if (collapsed) closeSpeed();
    }

    // How long a load may take before it is worth mentioning. Below this the
    // message appeared and vanished inside a couple of frames -- long enough
    // to flicker, never long enough to read.
    var SLOW_ENOUGH_TO_SAY = 500;

    var statusTimer = null;

    /**
     * Report an outcome, now.
     *
     * Also cancels anything waiting to be said about progress: once there is
     * an outcome, a report that we are still working is no longer true.
     */
    function setStatus(message, isError) {
        if (statusTimer) { window.clearTimeout(statusTimer); statusTimer = null; }
        if (!ui.status) return;
        ui.status.textContent = message || '';
        ui.status.classList.toggle('is-error', !!isError);
    }

    /**
     * Report progress, but only if it is still going on in a moment.
     *
     * Most narration loads finish faster than a reader can notice, and saying
     * so is worse than saying nothing: the line is only interesting when the
     * wait is long enough to wonder whether the click registered.
     */
    function setStatusIfSlow(message) {
        if (statusTimer) window.clearTimeout(statusTimer);
        statusTimer = window.setTimeout(function () {
            statusTimer = null;
            if (!ui.status) return;
            ui.status.textContent = message;
            ui.status.classList.remove('is-error');
        }, SLOW_ENOUGH_TO_SAY);
    }

    function clock(seconds) {
        if (!isFinite(seconds)) return '--:--';
        var m = Math.floor(seconds / 60);
        var s = Math.floor(seconds % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function updateClock() {
        if (!ui.time) return;
        var audio = state.audio;
        var at = audio ? audio.currentTime : 0;
        var total = audio && isFinite(audio.duration) ? audio.duration : NaN;
        ui.time.textContent = clock(at) + ' / ' + clock(total);
    }

    function clampRate(rate) {
        if (!isFinite(rate)) return 1;
        // Steps of 0.1 arrive as 1.7000000000000002 often enough to show.
        return Math.round(Math.min(Math.max(rate, MIN_RATE), MAX_RATE) * 10) / 10;
    }

    function updateSpeedLabel() {
        if (!ui.speed) return;
        var rate = state.playbackRate;
        // 1 -> "1", 1.5 -> "1.5": no trailing zero, no "1.0".
        var label = (rate % 1 ? String(rate) : rate.toFixed(0)) + '×';
        ui.speed.textContent = label;
        ui.speed.setAttribute('aria-label', 'Playback speed ' + label);
        if (ui.speedValue) ui.speedValue.textContent = label;
        if (ui.speedRange) ui.speedRange.value = String(rate);
    }

    function isSpeedOpen() {
        return ui.speedPopover && !ui.speedPopover.hidden;
    }

    function openSpeed() {
        if (!ui.speedPopover) return;
        ui.speedPopover.hidden = false;
        ui.speed.setAttribute('aria-expanded', 'true');
        ui.speedRange.focus();
    }

    function closeSpeed() {
        if (!isSpeedOpen()) return;
        ui.speedPopover.hidden = true;
        ui.speed.setAttribute('aria-expanded', 'false');
    }

    function toggleSpeed() {
        if (isSpeedOpen()) closeSpeed();
        else openSpeed();
    }

    // ---------- attach / detach ----------

    /** Point the player at an entry. Does not load anything until Play. */
    function attach(entryId, contentRoot) {
        stop();
        state.entryId = entryId;
        state.contentRoot = contentRoot;
        state.segments = [];

        var entry = wikiData[entryId];
        var narration = entry && entry.narration;
        if (!ui.bar) return;
        ui.bar.hidden = !narration;
        if (!narration) {
            ui.play.disabled = true;
            ui.previous.disabled = true;
            ui.next.disabled = true;
            ui.play.setAttribute('aria-label', 'Narration is not available for ' + (entry ? entry.title : 'this entry'));
            return;
        }

        ui.play.disabled = false;
        ui.previous.disabled = false;
        ui.next.disabled = false;
        ui.play.setAttribute('aria-label', 'Read ' + entry.title + ' aloud');
        ui.seek.value = 0;
        ui.seek.disabled = true;
        updateClock();
        setStatus('');
    }

    /** Stop playback and clear every trace of it. Safe to call at any time. */
    function stop() {
        if (state.audio) {
            state.audio.pause();
            state.audio.removeAttribute('src');
            state.audio.load();
            state.audio = null;
        }
        clearHighlight();
        closeSpeed();
        state.segments = [];
        if (ui.play) {
            ui.play.classList.remove('is-playing');
            ui.play.textContent = '▶';
            ui.seek.value = 0;
            ui.seek.disabled = true;
            ui.previous.disabled = true;
            ui.next.disabled = true;
        }
        updateClock();
        setStatus('');
    }

    function clearHighlight() {
        if (state.active) state.active.classList.remove('seg-active');
        state.active = null;
    }

    function segmentManual(root, segments) {
        var expected = (segments || []).filter(function (s) { return s.id !== 's-0001'; });
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        var nodes = [];
        while (walker.nextNode()) {
            if (normalizeText(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
        }
        var planned = [];
        nodes.forEach(function (node) {
            var limit = node.parentElement && node.parentElement.closest('em') ? 500 : 290;
            var groups = groupManualText(normalizeText(node.nodeValue), limit);
            planned.push({ node: node, groups: groups });
        });
        var actual = planned.flatMap(function (plan) { return plan.groups; });
        if (actual.length !== expected.length) {
            console.warn('[narration] map entry segments changed:', actual.length, 'found; expected', expected.length);
            return false;
        }
        for (var i = 0; i < actual.length; i++) {
            if (actual[i] !== normalizeText(expected[i].text)) {
                console.warn('[narration] map entry segment mismatch at', expected[i].id);
                return false;
            }
        }
        var cursor = 0;
        planned.forEach(function (plan) {
            var fragment = document.createDocumentFragment();
            plan.groups.forEach(function (group, index) {
                if (index) fragment.appendChild(document.createTextNode(' '));
                var span = document.createElement('span');
                span.className = 'seg';
                span.dataset.seg = expected[cursor++].id;
                span.textContent = group;
                fragment.appendChild(span);
            });
            plan.node.parentNode.replaceChild(fragment, plan.node);
        });
        return true;
    }

    function normalizeText(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }

    var MANUAL_SENTENCE_BREAK = /(?<!\bMr)(?<!\bMrs)(?<!\bDr)(?<!\bSt)(?<!\bvs)(?<!\be\.g)(?<!\bi\.e)(?<=[.!?]["'”’]?)\s+(?=[A-Z"'“‘])/;
    function groupManualText(text, limit) {
        var sentences = [];
        normalizeText(text).split(MANUAL_SENTENCE_BREAK).forEach(function (part) {
            var sentence = part.trim();
            if (!sentence) return;
            while (sentence.length > 300) {
                var cut = sentence.slice(0, 300).lastIndexOf(', ');
                if (cut < 100) break;
                sentences.push(sentence.slice(0, cut + 1));
                sentence = sentence.slice(cut + 2);
            }
            sentences.push(sentence);
        });
        var groups = [], current = '';
        sentences.forEach(function (sentence) {
            if (current && current.length + 1 + sentence.length > limit) {
                groups.push(current); current = sentence;
            } else current = current ? current + ' ' + sentence : sentence;
        });
        if (current) groups.push(current);
        return groups;
    }

    // ---------- playback ----------

    function toggle() {
        var entry = wikiData[state.entryId];
        if (!entry || !entry.narration) {
            // This is normally unreachable because the whole bar is hidden
            // for map-only entries, but the guard prevents a stale click from
            // leaving the status at “Loading narration…”.
            setStatus('Narration has not been generated for this entry yet.', true);
            return;
        }
        if (state.audio && !state.audio.paused) {
            state.audio.pause();
            return;
        }
        if (state.audio) { state.audio.play(); return; }
        load().then(function () {
            if (state.audio) state.audio.play();
        }).catch(function (error) {
            // stop() resets the bar, including the status line, so the message
            // has to be written after it rather than before.
            stop();
            setStatus(error.message, true);
        });
    }

    function load() {
        var entryId = state.entryId;
        var entry = wikiData[entryId];
        var narration = entry.narration;
        if (!narration) {
            return Promise.reject(new Error('Narration has not been generated for ' + entry.title + ' yet.'));
        }
        setStatusIfSlow('Loading narration…');

        var timingRequest = location.protocol === 'file:'
            ? loadLocalTiming(entryId, narration.timingSrc)
            : fetch(narration.timingSrc, { cache: 'no-cache' }).then(function (response) {
            if (!response.ok) {
                throw new Error(response.status === 404
                    ? 'No narration has been rendered for ' + entry.title + ' yet.'
                    : 'Could not load timings (' + response.status + ').');
            }
            return response.json();
        });

        return timingRequest.then(function (timings) {
            if (state.entryId !== entryId) return;          // navigated away mid-load
            validate(timings, entryId, narration);
            state.segments = timings.segments
                .map(function (s) { return { id: s.id, start: +s.start, end: +s.end }; })
                .sort(function (a, b) { return a.start - b.start; });
            ui.previous.disabled = !state.segments.length;
            ui.next.disabled = !state.segments.length;

            // A renderer can publish a versioned MP3 when Windows keeps the
            // old stable filename locked. Timings and audio are one artifact,
            // so honour that exact audio path when it is supplied.
            var audio = new Audio(timings.audioSrc || narration.audioSrc);
            audio.preload = 'auto';
            audio.playbackRate = state.playbackRate;
            audio.addEventListener('timeupdate', function () {
                paint(audio.currentTime);
                if (isFinite(audio.duration)) ui.seek.value = (audio.currentTime / audio.duration) * 1000;
                updateClock();
            });
            audio.addEventListener('loadedmetadata', function () {
                ui.seek.disabled = false;
                updateClock();
            });
            audio.addEventListener('play', function () {
                ui.play.classList.add('is-playing');
                ui.play.textContent = '❚❚';
                ui.play.setAttribute('aria-label', 'Pause narration');
                setStatus('');
            });
            audio.addEventListener('pause', function () {
                ui.play.classList.remove('is-playing');
                ui.play.textContent = '▶';
                ui.play.setAttribute('aria-label', 'Resume narration');
                clearHighlight();
            });
            audio.addEventListener('ended', function () { stop(); });
            audio.addEventListener('error', function () {
                stop();
                setStatus('Narration audio for ' + entry.title + ' is missing or unplayable.', true);
            });
            state.audio = audio;
            setStatus('');
        });
    }

    function loadLocalTiming(entryId, timingSrc) {
        return new Promise(function (resolve, reject) {
            var source = timingSrc.replace(/\.json(?:[?#].*)?$/, '.js');
            var script = document.createElement('script');
            script.src = source;
            script.async = true;
            script.onload = function () {
                script.remove();
                var timing = window.VIRELIA_TIMINGS && window.VIRELIA_TIMINGS[entryId];
                if (timing) resolve(timing);
                else reject(new Error('No narration has been rendered for ' + entryId + ' yet.'));
            };
            script.onerror = function () {
                script.remove();
                reject(new Error('No narration has been rendered for ' + entryId + ' yet.'));
            };
            document.head.appendChild(script);
        });
    }

    /**
     * Refuse a timing file we cannot trust, and say so twice.
     *
     * A reader is owed a plain sentence about what they can and cannot do; the
     * instruction for repairing the build is for whoever maintains it, and
     * belongs in the console. Putting the second in the sidebar -- which is
     * what "see generated/build-report.json" was doing -- tells the reader
     * nothing and looks broken.
     */
    function refuse(reader, detail) {
        console.error('[narration] ' + detail);
        var error = new Error(reader);
        error.detail = detail;
        return error;
    }

    function validate(timings, entryId, narration) {
        var title = (wikiData[entryId] && wikiData[entryId].title) || entryId;
        if (timings.version !== TIMING_VERSION) {
            throw refuse('The narration for ' + title + ' cannot be played in this version.',
                'Timing file version ' + timings.version + ' is not supported (expected ' +
                TIMING_VERSION + ').');
        }
        if (timings.entryId !== entryId) {
            throw refuse('The narration for ' + title + ' is unavailable.',
                'Timing file is for "' + timings.entryId + '", not "' + entryId + '".');
        }
        // The whole point of the hash: prose was edited and rebuilt, but the
        // audio was not re-rendered. Highlighting against those timings would
        // mark the wrong sentences, which is worse than not highlighting.
        if (timings.textHash !== narration.textHash) {
            throw refuse('No up-to-date reading of ' + title + ' yet. The written entry is complete.',
                'textHash mismatch for "' + entryId + '": the prose was rebuilt without ' +
                're-rendering the audio. Re-render it -- see generated/build-report.json "changed".');
        }
        if (!Array.isArray(timings.segments) || !timings.segments.length) {
            throw refuse('The narration for ' + title + ' is unavailable.',
                'Timing file for "' + entryId + '" contains no segments.');
        }
    }

    function paint(time) {
        var segment = find(time);
        var element = segment ? segmentElement(segment.id) : null;
        if (element === state.active) return;
        clearHighlight();
        if (!element) return;
        element.classList.add('seg-active');
        state.active = element;
        scrollIntoViewIfNeeded(element);
    }

    function find(time) {
        var segments = state.segments;
        var lo = 0;
        var hi = segments.length - 1;
        while (lo <= hi) {
            var mid = (lo + hi) >> 1;
            if (time < segments[mid].start) hi = mid - 1;
            else if (time >= segments[mid].end) lo = mid + 1;
            else return segments[mid];
        }
        return null;      // in a gap between phrases
    }

    function segmentElement(id) {
        if (!state.contentRoot) return null;
        return state.contentRoot.querySelector('[data-seg="' + id + '"]');
    }

    // The source preserves paragraph breaks as <br>s.  Headings and list
    // items are their own blocks; paragraphs that are split into several
    // synthesis segments remain one navigable unit.
    function paragraphStartIndices() {
        var starts = [];
        var priorBlock = null;
        state.segments.forEach(function (segment, index) {
            var element = segmentElement(segment.id);
            var block = element && element.closest('p, li, h1, h2, h3, h4, h5, h6, blockquote, td, th');
            var startsNew = index === 0 || (block && block !== priorBlock);
            if (!startsNew && element) {
                var previous = element.previousSibling;
                while (previous && previous.nodeType === Node.TEXT_NODE && !previous.nodeValue.trim()) {
                    previous = previous.previousSibling;
                }
                startsNew = !!(previous && previous.nodeType === Node.ELEMENT_NODE
                    && previous.tagName === 'BR');
            }
            if (startsNew) starts.push(index);
            priorBlock = block || priorBlock;
        });
        return starts;
    }

    function jumpParagraph(direction) {
        function jump() {
            if (!state.audio || !state.segments.length) return;
            var active = find(state.audio.currentTime);
            var index = active ? state.segments.indexOf(active) : 0;
            var starts = paragraphStartIndices();
            var currentStart = starts[0] || 0;
            for (var i = 0; i < starts.length; i++) {
                if (starts[i] <= index) currentStart = starts[i];
                else break;
            }
            var target;
            if (direction < 0) {
                // A first press restarts the current paragraph; pressing it at
                // its beginning moves to the preceding paragraph.
                var atBeginning = state.audio.currentTime <= state.segments[currentStart].start + 0.35;
                var before = starts.indexOf(currentStart) - 1;
                target = atBeginning && before >= 0 ? starts[before] : currentStart;
            } else {
                var after = starts.indexOf(currentStart) + 1;
                target = after < starts.length ? starts[after] : currentStart;
            }
            state.audio.currentTime = state.segments[target].start;
            paint(state.audio.currentTime);
            updateClock();
        }

        if (state.audio) { jump(); return; }
        load().then(function () {
            jump();
            return state.audio && state.audio.play();
        }).catch(function (error) {
            stop();
            setStatus(error.message, true);
        });
    }

    // Scrolling on every phrase fights the reader; scroll only when the phrase
    // being spoken has left the visible part of the sidebar.
    function scrollIntoViewIfNeeded(element) {
        var container = document.getElementById('sidebar-content');
        if (!container) return;
        var box = element.getBoundingClientRect();
        var frame = container.getBoundingClientRect();
        var margin = 48;
        if (box.top >= frame.top + margin && box.bottom <= frame.bottom - margin) return;
        container.scrollTo({
            top: container.scrollTop + (box.top - frame.top) - frame.height / 3,
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
        });
    }

    // The player's controls are markup in index.html, above this script, so
    // they are already parsed. Waiting for DOMContentLoaded would be too late:
    // wiki-runtime opens a deep-linked entry on that same event.
    init();

    window.Narration = { attach: attach, stop: stop, segmentManual: segmentManual };
})();
