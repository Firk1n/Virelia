// 1. Initialize the Map with Bounds
var bounds = [[-85, -180], [-2, 176]];

var map = L.map('map', {
    attributionControl: false, 
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    minZoom: 3, 
    maxZoom: 8  
}).setView([0, 0], 3);

// 2. Define the Layers

// --- BASE LAYERS ---
var standardMap = L.tileLayer('./tiles/{z}/{x}/{y}.png', {
    minZoom: 3,
    maxZoom: 8,       
    tileSize: 128,      
    zoomOffset: 1,      
    detectRetina: false,
    maxNativeZoom: 4,   
    tms: true,    
    noWrap: true,
    attribution: 'Virelia'
}).addTo(map); 

var topoMap = L.tileLayer('./tiles-topo/{z}/{x}/{y}.png', {
    minZoom: 3,
    maxZoom: 8,
    tileSize: 128,      
    zoomOffset: 1,      
    detectRetina: false,
    maxNativeZoom: 4,   
    tms: true,
    noWrap: true,
    attribution: 'Virelia'
});

// --- OVERLAY LAYERS ---
var labelsMap = L.tileLayer('./tiles-labels/{z}/{x}/{y}.png', {
    minZoom: 3,
    maxZoom: 8,
    tileSize: 128,      
    zoomOffset: 1,      
    detectRetina: false,
    maxNativeZoom: 4,   
    tms: true,
    noWrap: true,
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


// --- ICONS & MARKER LOGIC ---
var iconRegion = L.divIcon({ className: 'marker-pin type-region', iconSize: [30, 30], iconAnchor: [15, 15] });
var iconCity   = L.divIcon({ className: 'marker-pin type-city',   iconSize: [22, 22], iconAnchor: [11, 11] });
var iconTown   = L.divIcon({ className: 'marker-pin type-town',   iconSize: [16, 16], iconAnchor: [8, 8] });
var iconPOI    = L.divIcon({ className: 'marker-pin type-poi',    iconSize: [10, 10], iconAnchor: [5, 5] });

function getIcon(type) {
    if (!type) return iconPOI;
    var t = type.toLowerCase();
    if (t === 'region') return iconRegion;
    if (t === 'city')   return iconCity;
    if (t === 'town')   return iconTown;
    return iconPOI;
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
        
        marker.on('click', function() {
            openEntry(key);
        });
    }
}

// --- VISIBILITY ENGINE (Semantic Zooming) ---
function updateVisibleMarkers() {
    var currentZoom = map.getZoom();
    
    // Clear current markers from the layer group
    markersLayer.clearLayers();

    // Define Visibility Rules [MinZoom, MaxZoom]
    // You can tweak these numbers to your liking
    var rules = {
        'region': [0, 4],  // Visible only when zoomed out
        'city':   [0, 8],  // Always visible
        'town':   [5, 8],  // Visible only when close
        'poi':    [5, 8]   // Visible only when close
    };

    // Loop through all markers and add them if they match the current zoom
    allMarkers.forEach(function(item) {
        var range = rules[item.type] || [0, 8]; // Default to always visible if type unknown
        
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

//map.on('click', function(e) {
//    var lat = e.latlng.lat.toFixed(0);
//    var lng = e.latlng.lng.toFixed(0);
//    var coordString = "[" + lat + ", " + lng + "]";
//    L.popup().setLatLng(e.latlng).setContent("Copied: " + coordString).openOn(map);
//    navigator.clipboard.writeText(coordString);
//    });