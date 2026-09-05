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

function updateMinZoom() {
    var viewportWidth = map.getSize().x;
    if (!viewportWidth) { return; }      // container not laid out yet; 'resize' will retry
    var floor = map.getMaxZoom();
    for (var z = 0; z <= map.getMaxZoom(); z++) {
        var nw = map.project(mapBounds.getNorthWest(), z);
        var se = map.project(mapBounds.getSouthEast(), z);
        if (se.x - nw.x >= viewportWidth) { floor = z; break; }
    }
    if (floor !== map.getMinZoom()) {
        map.setMinZoom(floor);          // Leaflet zooms in if we are below it
    }
}

updateMinZoom();
map.on('resize', updateMinZoom);
map.setZoom(map.getMinZoom());

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
        
        // Create marker BUT DO NOT ADD TO MAP YET
        let marker = L.marker(entry.coords, {icon: selectedIcon});
        
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
window.openEntry = function(key) {
    let entry = wikiData[key];
    let sidebar = document.getElementById('sidebar');
    let contentDiv = document.getElementById('sidebar-content');
    
    if (entry) {
        contentDiv.innerHTML = ''; 

        let titleBlock = document.createElement('h2');
        titleBlock.innerHTML = `${entry.title} <small style="font-size:0.6em">(${entry.type})</small>`;
        
        if (entry.image) {
            let img = document.createElement('img');
            img.className = 'ribbon';
            img.src = entry.image;
            img.onclick = function() { showLightbox(entry.image); };
            img.style.cursor = "zoom-in"; 
            img.onerror = function() { this.style.display = 'none'; };
            contentDiv.appendChild(img);
        }

        contentDiv.appendChild(titleBlock);

        let contentContainer = document.createElement('div');
        contentContainer.innerHTML = entry.content;
        contentDiv.appendChild(contentContainer);

        sidebar.classList.add('active');

        if (entry.coords && markers[key]) {
            map.panTo(entry.coords); 
        }
    }
};

window.closeSidebar = function() {
    document.getElementById('sidebar').classList.remove('active');
};

// Edit mode (loaded via edit.js when ?edit is present in the URL) hooks into:
//   - map clicks (to drop new markers)
//   - existing marker clicks (to load entries — see marker.on('click') above)
//   - the pointTypes registry (to build its toolbar dynamically)