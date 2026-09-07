// 1. Initialize the Map with Bounds
var bounds = [[-85, -180], [-2, 176]];

// Zoom range notes, because this is easy to break:
//   The tile layers below use tileSize 128 + zoomOffset 1, which is hand-rolled
//   retina rendering (identical to what Leaflet's detectRetina does on a 2x
//   display) and is why the map is pixel-sharp. The consequence is that the tile
//   level actually requested is mapZoom + 1, capped by maxNativeZoom: 4.
//   The pyramid only goes to level 5, so maxNativeZoom must stay 4 -- raise it
//   and every tile 404s and the whole map goes background-grey.
//   maxZoom is free to go higher (it just upscales level 5), but past 6 it is
//   badly blurred: zoom 5 is a 2x upscale, 6 is 4x, the old 8 was 16x.
//   minZoom is not a fixed number -- see updateMinZoom() below.
var map = L.map('map', {
    attributionControl: false,
    // No +/- control: the wheel, pinch and double-click all zoom already, and
    // the buttons only sat on top of the painting.
    zoomControl: false,
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    minZoom: 0,
    maxZoom: 6
}).setView([-66.79, -2], 3);

// Zooming out past the point where the map spans the window leaves it floating
// in open background, so derive the floor from the window instead of hardcoding
// it. On a 1920x1080 screen this lands on 3, which is what it always was; on a
// smaller window it allows one more step out, on a larger one it allows one less.
// (For a stricter floor with no empty space above or below the map either, use
// map.getBoundsZoom(mapBounds, true) instead -- that gives 4 at 1920x1080.)
var mapBounds = L.latLngBounds(bounds);

// Whether we have ever managed to measure the container. Until we have, there
// is no floor to sit the map on -- and applying the *stale* minimum instead is
// exactly how the map ends up a postage stamp floating in open grey.
var floorApplied = false;

function updateMinZoom() {
    var viewportWidth = map.getSize().x;
    if (!viewportWidth) { return; }      // container not laid out yet; 'resize' will retry
    var floor = map.getMaxZoom();
    for (var z = 0; z <= map.getMaxZoom(); z++) {
        var nw = map.project(mapBounds.getNorthWest(), z);
        var se = map.project(mapBounds.getSouthEast(), z);
        if (se.x - nw.x >= viewportWidth) { floor = z; break; }
    }
    if (floor !== map.getMinZoom()) { map.setMinZoom(floor); }

    // Leaflet only raises a below-minimum zoom through an *animated* setZoom,
    // which needs a frame to land and silently does nothing if that frame
    // never comes. Do it here, unanimated, so the map cannot be left below its
    // own floor -- and do it on the first successful measurement, which is
    // what puts the map on the floor at startup.
    if (!floorApplied || map.getZoom() < floor) {
        floorApplied = true;
        map.setZoom(floor, { animate: false });
    }
}

updateMinZoom();
map.on('resize', updateMinZoom);

// 2. Define the Layers

// --- BASE LAYERS ---
var standardMap = L.tileLayer('./tiles/{z}/{x}/{y}.webp', {
    minZoom: 0,
    maxZoom: 6,       
    tileSize: 128,      
    zoomOffset: 1,      
    detectRetina: false,
    maxNativeZoom: 4,   
    tms: true,    
    noWrap: true,
    bounds: bounds,
    attribution: 'Virelia'
}).addTo(map); 

var topoMap = L.tileLayer('./tiles-topo/{z}/{x}/{y}.webp', {
    minZoom: 0,
    maxZoom: 6,
    tileSize: 128,      
    zoomOffset: 1,      
    detectRetina: false,
    maxNativeZoom: 4,   
    tms: true,
    noWrap: true,
    bounds: bounds,
    attribution: 'Virelia'
});

// --- OVERLAY LAYERS ---
var labelsMap = L.tileLayer('./tiles-labels/{z}/{x}/{y}.webp', {
    minZoom: 0,
    maxZoom: 6,
    tileSize: 128,      
    zoomOffset: 1,      
    detectRetina: false,
    maxNativeZoom: 4,   
    tms: true,
    noWrap: true,
    bounds: bounds,
    zIndex: 10 
}).addTo(map); 

// D. Interactive Markers (Group Wrapper)
var markersLayer = L.layerGroup().addTo(map); 


// 3. Add the Layer Control
var baseMaps = {
    "Standard": standardMap,
    "Topographic": topoMap
};

var overlayMaps = {
    "Overlay": labelsMap, 
    "Pop-Ups": markersLayer 
};

L.control.layers(baseMaps, overlayMaps, { position: 'topright', collapsed: false }).addTo(map);


// --- POINT TYPE REGISTRY ---
// To add a new pointer type: add an entry here, plus a matching `.type-<id>` rule in style.css.
// Edit mode's toolbar, the icon lookup, and the zoom-visibility rules all derive from this list.
var pointTypes = [
    { id: 'region', label: 'Region', size: 30, zoom: [0, 4] },
    { id: 'city',   label: 'City',   size: 22, zoom: [0, 6] },
    { id: 'town',   label: 'Town',   size: 16, zoom: [5, 6] },
    { id: 'poi',    label: 'POI',    size: 10, zoom: [5, 6] }
];

pointTypes.forEach(function(pt) {
    var s = pt.size;
    pt.icon = L.divIcon({
        className: 'marker-pin type-' + pt.id,
        iconSize: [s, s],
        iconAnchor: [s / 2, s / 2]
    });
});

function getPointType(type) {
    var t = (type || 'poi').toLowerCase();
    for (var i = 0; i < pointTypes.length; i++) {
        if (pointTypes[i].id === t) return pointTypes[i];
    }
    return pointTypes[pointTypes.length - 1]; // fallback to last (POI)
}

function getIcon(type) {
    return getPointType(type).icon;
}

// Storage Arrays
var markers = {};      // For sidebar links (lookup by ID)
var allMarkers = [];   // For zoom logic (list of all objects)

for (let key in wikiData) {
    let entry = wikiData[key];
    if (entry.coords) {
        let selectedIcon = getIcon(entry.type);
        
        // Create marker BUT DO NOT ADD TO MAP YET.
        // Leaflet makes every marker focusable (tabindex 0, role button), so
        // without a name the map is 42 anonymous buttons to a keyboard or a
        // screen reader. `title` is the tooltip; `alt` becomes the aria-label.
        let label = entry.title + (entry.type ? ', ' + entry.type : '');
        let marker = L.marker(entry.coords, {
            icon: selectedIcon,
            title: entry.title,
            alt: label
        });

        // These are divIcons, and Leaflet only turns `alt` into markup for an
        // <img>. The layer group tears markers down and rebuilds them on every
        // zoom step, so the name is reapplied on each add rather than once.
        marker.on('add', function () {
            let el = marker.getElement();
            if (el) el.setAttribute('aria-label', label);
        });
        
        // Store references
        markers[key] = marker;
        allMarkers.push({ 
            id: key, 
            marker: marker, 
            type: entry.type ? entry.type.toLowerCase() : 'poi' 
        });
        
        marker.on('click', function(e) {
            if (window.editMode && window.editMode.active) {
                L.DomEvent.stopPropagation(e);
                window.editMode.loadEntry(key);
                return;
            }
            openEntry(key);
        });
    }
}

// --- VISIBILITY ENGINE (Semantic Zooming) ---
function updateVisibleMarkers() {
    var currentZoom = map.getZoom();
    
    // Clear current markers from the layer group
    markersLayer.clearLayers();

    // Visibility rules come from the pointTypes registry (zoom: [min, max])
    allMarkers.forEach(function(item) {
        var range = getPointType(item.type).zoom;
        if (currentZoom >= range[0] && currentZoom <= range[1]) {
            item.marker.addTo(markersLayer);
        }
    });
}

// Run once on load, and then every time zoom changes
updateVisibleMarkers();
map.on('zoomend', updateVisibleMarkers);


// --- SIDEBAR & LIGHTBOX LOGIC ---
// Rendering, cross-linking, history and map focus all live in wiki-runtime.js
// and regions.js. These two stay as the names the rest of the page (and the
// inline onclick in index.html) already call.
window.openEntry = function(key) {
    window.WikiRuntime.open(key);
};

window.closeSidebar = function() {
    window.WikiRuntime.close();
};

// Edit mode (loaded via edit.js when ?edit is present in the URL) hooks into:
//   - map clicks (to drop new markers)
//   - existing marker clicks (to load entries — see marker.on('click') above)
//   - the pointTypes registry (to build its toolbar dynamically)