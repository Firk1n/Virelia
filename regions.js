// === MAP FOCUS AND REGION OUTLINES ===
// Opening an entry moves the map to it and says where it is, briefly.
//
// A point gets a pan and a short pulse. A region gets its traced border drawn
// as a translucent outline, and only while that entry is open -- twelve
// permanent polygons over a painted map would bury the artwork the map is for.
//
// Geometry lives in region-geometry.js as GeoJSON, which is [longitude,
// latitude]. wikiData coords are Leaflet [latitude, longitude]. They are
// deliberately different files: a content rebuild must never be able to
// overwrite a hand-traced border.
//
// Two rules shape every move made here. Opening an entry never zooms *in* --
// fitting each region tightly zoomed a level for the small western ones and
// not at all for the rest, and that inconsistency is what read as the map
// lurching. And the map is framed around the reading panel rather than the
// window, with the panel changing sides when the map cannot pan its subject
// out from under it.

(function () {
    'use strict';

    var PULSE_MS = 1600;

    var overlay = L.layerGroup().addTo(map);
    var rasterOverlay = null;
    var pulseTimer = null;
    var activeId = null;

    function geometryFor(id) {
        var data = window.REGION_GEOMETRY;
        return (data && data.regions && data.regions[id]) || null;
    }

    /**
     * The box to frame for a region.
     *
     * The only question the page asks of a traced border is how wide it is, so
     * the page is given generated/region-bounds.js -- twelve boxes, a kilobyte
     * -- instead of region-geometry.js, which is 832 KB of polygon detail that
     * exists for the region tool. Edit mode does load the full geometry, and
     * there the freshly traced ring must win over a stale generated box.
     */
    function boundsFor(id) {
        var geometry = geometryFor(id);
        if (geometry) return L.geoJSON(geometry).getBounds();
        var box = window.REGION_BOUNDS && window.REGION_BOUNDS[id];
        return box ? L.latLngBounds(box[0], box[1]) : null;
    }

    function photoshopOverlayFor(id) {
        var data = window.REGION_OVERLAYS;
        return (data && data.regions && data.regions[id]) || null;
    }

    // Going Back should land where the reader left, not fly there: an animated
    // trip from an unrelated part of the map is disorienting, and it is not
    // what pressing Back means.
    function restore(view) {
        map.setView([view.lat, view.lng], view.zoom, { animate: false });
    }

    /* ---------------------------------------------------- framing the target */

    var EDGE = 40;          // breathing room between a fitted region and the frame
    var CLEARANCE = 24;     // how close to the panel a focus may sit before it moves

    // The reading panel sits on top of the map rather than beside it, so the
    // usable map is the window minus the panel. On a phone the panel covers
    // everything and there is neither a side to prefer nor room to pad.
    function panelWidth() {
        var el = document.getElementById('sidebar');
        if (!el) return 0;
        var width = el.getBoundingClientRect().width;
        return width >= map.getSize().x - 80 ? 0 : width;
    }

    function panelSide() {
        var el = document.getElementById('sidebar');
        return el && el.classList.contains('side-left') ? 'left' : 'right';
    }

    // Interrupting an animated zoom leaves Leaflet part-way between levels.
    // Reading that fractional value back as the next target would strand the
    // map there, and every later click would inherit it.
    function currentZoom() {
        return Math.max(map.getMinZoom(), Math.min(map.getMaxZoom(), Math.round(map.getZoom())));
    }

    /**
     * The zoom at which this entry's own marker is drawn at all.
     *
     * Semantic zooming hides towns and landmarks below zoom 5 (see pointTypes
     * in main.js). Sending the map to a village's coordinates at zoom 3 put
     * the reader exactly where it is and showed nothing there -- most visibly
     * when arriving from the wiki, which is read from wherever the map
     * happened to be left. Regions and cities start at 0, so this asks nothing
     * of them.
     */
    function markerFloor(entry) {
        if (typeof getPointType !== 'function' || !entry.coords) return 0;
        var range = getPointType(entry.type).zoom;
        return range ? Math.min(range[0], map.getMaxZoom()) : 0;
    }

    /**
     * Where the map would go for this entry, before the panel is considered.
     *
     * Zoom never increases of its own accord. Fitting each region tightly meant
     * the small western ones -- Myrskov, Kelarra Peaks, Knotsreach -- snapped
     * in a level while their larger neighbours did not, and that inconsistency
     * is what read as the map lurching. Zooming out to bring a region into view
     * is still allowed, so following a link while zoomed into a town still
     * works. The one thing that does zoom in is a marker that would otherwise
     * not be rendered: arriving at something invisible is worse than moving.
     */
    function focusTarget(id) {
        var entry = wikiData[id];
        if (!entry) return null;
        var point = entry.coords ? L.latLng(entry.coords) : null;
        var floor = markerFloor(entry);
        var shapeBounds = boundsFor(id);
        if (!shapeBounds) {
            return point
                ? { bounds: null, center: point, zoom: Math.max(currentZoom(), floor) }
                : null;
        }

        // The marker is not always inside its region's centroid box -- it sits
        // on the painted label, which for Molakar is well east of the border's
        // middle. Frame both, or the "you are here" dot ends up under the panel
        // while the region itself is comfortably visible.
        if (point) shapeBounds.extend(point);

        var zoom = Math.max(floor, Math.min(currentZoom(),
            map.getBoundsZoom(shapeBounds, false, L.point(panelWidth() + 2 * EDGE, 2 * EDGE))));
        var size = map.getSize();
        var span = map.project(shapeBounds.getNorthEast(), zoom)
            .subtract(map.project(shapeBounds.getSouthWest(), zoom));
        var fits = Math.abs(span.x) <= size.x - panelWidth() - 2 * EDGE
            && Math.abs(span.y) <= size.y - 2 * EDGE;

        // A region too wide to sit beside the panel cannot be shown whole
        // however it is centred, and centring its midpoint then throws the
        // label off the far edge -- which is how Lastrago and Southfield ended
        // up under the panel. When it does not fit, frame the label instead;
        // the painted overlay is what shows the extent anyway.
        if (!fits && point) return { bounds: null, center: point, zoom: zoom };
        return { bounds: shapeBounds, center: shapeBounds.getCenter(), zoom: zoom };
    }

    // maxBoundsViscosity is 1, so Leaflet will not let the view leave the map.
    // Predicting that clamp is the whole trick behind choosing a panel side --
    // and behind not lurching, see moveTo.
    /**
     * The nearest centre the map will actually hold at this zoom.
     *
     * Leaflet applies this same limit itself, but only when the move lands. A
     * request that points off the edge is therefore animated in full and then
     * silently corrected, which is the drift-and-snap: the map slides towards
     * somewhere it cannot stay and is yanked back at the end. Clamping the
     * request *before* the animation starts means it only ever travels
     * somewhere it can remain, so there is nothing left to correct.
     */
    function clampCenter(center, zoom) {
        var half = map.getSize().divideBy(2);
        var point = map.project(center, zoom);
        var min = map.project(mapBounds.getNorthWest(), zoom).add(half);
        var max = map.project(mapBounds.getSouthEast(), zoom).subtract(half);
        // An axis where the map is smaller than the window has no range to
        // clamp into. Centre it, which is where Leaflet puts it anyway.
        point.x = min.x > max.x ? (min.x + max.x) / 2 : Math.min(Math.max(point.x, min.x), max.x);
        point.y = min.y > max.y ? (min.y + max.y) / 2 : Math.min(Math.max(point.y, min.y), max.y);
        return map.unproject(point, zoom);
    }

    /**
     * The centre that puts the entry in the middle of the map the panel is
     * not covering. Shared by the side-choosing prediction and by the move
     * itself, so the two cannot disagree about where the map is going.
     */
    function framedCenter(target, side) {
        var width = panelWidth();
        var left = side === 'left' ? width : 0;
        var right = side === 'right' ? width : 0;
        var point = map.project(target.center, target.zoom);
        point.x += (right - left) / 2;
        return map.unproject(point, target.zoom);
    }

    /**
     * How much of the entry the panel would still cover if it took `side`.
     *
     * This has to predict rather than measure, because the side is chosen
     * before the panel opens and before the map moves. It reproduces exactly
     * what moveTo will ask for -- both go through framedCenter -- and then
     * applies the same maxBounds clamp the map will.
     */
    function coveredFraction(target, side) {
        var width = panelWidth();
        var size = map.getSize();
        var zoom = target.zoom;

        // Exactly what moveTo will do: frame for the side, then clamp.
        var landing = clampCenter(framedCenter(target, side), zoom);
        var origin = map.project(landing, zoom).x - size.x / 2;

        var box = target.bounds;
        var west, east;
        if (box) {
            west = map.project(L.latLng(0, box.getWest()), zoom).x - origin;
            east = map.project(L.latLng(0, box.getEast()), zoom).x - origin;
        } else {
            // A point has no width; give the marker a body so "covered" means
            // the same thing for a town as it does for a region.
            var at = map.project(target.center, zoom).x - origin;
            west = at - CLEARANCE;
            east = at + CLEARANCE;
        }

        var visibleWest = Math.max(0, west);
        var visibleEast = Math.min(size.x, east);
        if (visibleEast <= visibleWest) return 1;          // entirely off-screen

        var panelWest = side === 'left' ? 0 : size.x - width;
        var panelEast = side === 'left' ? width : size.x;
        var overlap = Math.max(0, Math.min(visibleEast, panelEast) - Math.max(visibleWest, panelWest));
        return overlap / (visibleEast - visibleWest);
    }

    /**
     * Which side the reading panel should take for this entry.
     *
     * At the lowest zoom the whole map is on screen and can barely pan, so an
     * eastern region stays east however the map is nudged and a right-hand
     * panel simply sits on top of it. When that happens the panel moves
     * instead. Right stays the default unless left is meaningfully better --
     * a panel that changes sides for a few pixels is worse than one that
     * covers them.
     */
    function preferredSide(id) {
        var width = panelWidth();
        var target = width && focusTarget(id);
        if (!target) return 'right';
        return coveredFraction(target, 'right') > coveredFraction(target, 'left') + 0.08
            ? 'left' : 'right';
    }

    /** Move so the entry lands in the middle of the map the panel is not over. */
    function moveTo(target) {
        // Clamped, not raw: an unreachable centre is animated to in full and
        // then corrected on arrival, which is seen as a lurch past the target
        // and a snap back. Ask only for where the map can actually sit.
        var center = clampCenter(framedCenter(target, panelSide()), target.zoom);

        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            map.setView(center, target.zoom, { animate: false });
            return;
        }

        // flyTo travels along an arc: it deliberately zooms out over the
        // journey and back in at the end. That is the right shape when the
        // zoom is genuinely changing, and badly wrong when it is not --
        // opening an entry no longer changes zoom, so every click was pulling
        // the map out and pushing it back for no reason. A plain pan when the
        // zoom is unchanged; the arc only when there is a zoom to travel.
        if (Math.abs(target.zoom - map.getZoom()) < 0.01) {
            map.panTo(center, { duration: 0.8, easeLinearity: 0.25 });
            return;
        }
        // A fixed duration rather than Leaflet's distance-derived one: every
        // entry should feel like the same gesture, near or far.
        map.flyTo(center, target.zoom, { duration: 0.9, easeLinearity: 0.28 });
    }

    function clear() {
        overlay.clearLayers();
        if (rasterOverlay) { map.removeLayer(rasterOverlay); rasterOverlay = null; }
        if (pulseTimer) { window.clearTimeout(pulseTimer); pulseTimer = null; }
        if (activeId && markers[activeId]) {
            var el = markers[activeId].getElement();
            if (el) el.classList.remove('marker-active');
        }
        activeId = null;
    }

    /**
     * Move to an entry and highlight it.
     *
     * `view` restores an exact remembered camera (browser Back), and takes
     * precedence over recomputing a fit.
     */
    function focusEntry(id, view) {
        clear();
        var entry = wikiData[id];
        if (!entry) return;
        activeId = id;

        var target = focusTarget(id);
        var geometry = geometryFor(id);
        var photoshopOverlay = photoshopOverlayFor(id);
        if (photoshopOverlay) {
            // Older manifests stored the source as a bare string. New imports
            // carry the shared Photoshop group's style beside the source.
            var overlayStyle = typeof photoshopOverlay === 'string'
                ? { src: photoshopOverlay, blendMode: 'multiply', opacity: 1 }
                : photoshopOverlay;
            // This is the exact painted Photoshop layer, sliced with the same
            // TMS settings as the base map. It is temporary and remains below
            // labels/markers, so the map retains its normal readability.
            rasterOverlay = L.tileLayer('./' + overlayStyle.src + '/{z}/{x}/{y}.webp', {
                minZoom: 0, maxZoom: 6, tileSize: 128, zoomOffset: 1,
                maxNativeZoom: 4, tms: true, noWrap: true, bounds: mapBounds,
                zIndex: 5, opacity: 1, className: 'region-photoshop-overlay'
            }).addTo(map);
            var overlayElement = rasterOverlay.getContainer();
            if (overlayElement) {
                overlayElement.style.mixBlendMode = overlayStyle.blendMode || 'normal';
                overlayElement.style.opacity = String(overlayStyle.opacity == null ? 1 : overlayStyle.opacity);
            }
            if (view) restore(view);
            else if (target) moveTo(target);
        } else if (geometry) {
            var shape = L.geoJSON(geometry, {
                style: {
                    // Strong enough to survive dark water, restrained enough
                    // not to repaint the map underneath it.
                    color: '#96373f',
                    weight: 2.5,
                    opacity: 0.96,
                    fillColor: '#a94d4a',
                    fillOpacity: 0.11,
                    dashArray: '6 4',
                    lineCap: 'round',
                    interactive: false
                },
                className: 'region-outline'
            }).addTo(overlay);
            if (view) restore(view);
            else moveTo(target);
        } else if (entry.coords) {
            if (view) restore(view);
            else moveTo(target);
            pulse(entry.coords);
        }

        if (markers[id]) {
            var el = markers[id].getElement();
            if (el) el.classList.add('marker-active');
        }
    }

    // The pulse is a real element rather than a CSS-only flourish, so it is
    // still visible with animations turned off: reduced motion gets a ring
    // that appears and is removed on the same schedule, without the scaling.
    function pulse(coords) {
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var ring = L.marker(coords, {
            icon: L.divIcon({
                className: 'map-pulse' + (reduced ? ' is-static' : ''),
                iconSize: [64, 64],
                iconAnchor: [32, 32]
            }),
            interactive: false,
            keyboard: false,
            zIndexOffset: -100
        }).addTo(overlay);
        pulseTimer = window.setTimeout(function () {
            overlay.removeLayer(ring);
            pulseTimer = null;
        }, PULSE_MS);
    }

    // Semantic zooming rebuilds the marker layer, which throws away the DOM
    // node carrying the active class. This listener is registered after
    // main.js's, so it runs once the new markers exist.
    map.on('zoomend', function () {
        if (!activeId || !markers[activeId]) return;
        var el = markers[activeId].getElement();
        if (el) el.classList.add('marker-active');
    });

    window.MapFocus = {
        focusEntry: focusEntry,
        preferredSide: preferredSide,
        clear: clear
    };
})();
