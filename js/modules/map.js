import { state } from "./state.js";
import { enablePlaceClicks } from "./markers.js";
import { collapseDockForMobile, collapsePlaceSheet } from "./filters.js";
import { openSidePanel } from "./panel.js";

let map;
let logoHideTimer;


// ---------- MAP ACCESS ----------

export function getMap() {
  return map;
}


// ---------- MAP INITIALIZATION ----------

export function initMap() {

  mapboxgl.accessToken = "pk.eyJ1Ijoic2hhZGluYWF5dSIsImEiOiJja2YzZ3c1ZmwwMzIyMnNwanhoNjczaG5rIn0.9iEcuNJQ0sS8_IbRh48LZg";

  map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/mapbox/streets-v11",
    center: [107.6191,-6.9022],
    zoom: 12
  });

  state.map = map;

  map.on("load", () => {

    enablePlaceClicks();

    map.addSource("places", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: []
      },
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "places",
      filter: ["has", "point_count"],
      paint: {
        "circle-radius": 18,
        "circle-color": "#3b82f6"
      }
    });

    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "places",
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-size": 12
      }
    });

    map.addLayer({
      id: "unclustered-point",
      type: "circle",
      source: "places",
      filter: ["!", ["has", "point_count"]],
      layout: {
        "circle-sort-key": ["get", "matchScore"]
      },
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "confidence"], 0],
          0, 6,
          0.5, 10,
          1, 14
        ],
        "circle-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "matchStrength"], 0.5],
          0, "#c8c3d0",
          0.5, "#f2d16b",
          1, "#4caf50"
        ],
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "matchStrength"], 0.5],
          0, 0.45,
          1, 0.95
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.9,
        "circle-color-transition": { "duration": 250 },
        "circle-radius-transition": { "duration": 250 }
      }

    });

    map.addLayer({
      id: "match-pulse",
      type: "circle",
      source: "places",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-radius": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "confidence"], 0],
          0, 10,
          1, 20
        ],
        "circle-color": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "matchStrength"], 0.5],
          0, "#c8c3d0",
          0.5, "#f2d16b",
          1, "#4caf50"
        ],
        "circle-opacity": 0,
        "circle-stroke-width": 0
      }
    });

    map.addLayer({
      id: "hidden-gems",
      type: "symbol",
      source: "places",
      filter: ["all",
        ["!", ["has", "point_count"]],
        ["==", ["get", "hiddenGem"], true]
      ],
      layout: {
        "text-field": "✨",
        "text-size": 16,
        "text-offset": [0, -1.2]
      },
      paint: {
        "text-color": "#f2d16b",
        "text-halo-color": "#5e4b73",
        "text-halo-width": 1
      }
    });

    map.addLayer({
      id: "group-fit",
      type: "symbol",
      source: "places",
      filter: ["all",
        ["!", ["has", "point_count"]],
        ["has", "groupLabel"]
      ],
      layout: {
        "text-field": ["get", "groupLabel"],
        "text-size": 11,
        "text-offset": [0, 1.1]
      },
      paint: {
        "text-color": "#5e4b73",
        "text-halo-color": "#ffffff",
        "text-halo-width": 1
      }
    });

  });

  map.on("movestart", () => {
    document.body.classList.add("map-interacting");
    if (logoHideTimer) window.clearTimeout(logoHideTimer);
    collapseDockForMobile();
    collapsePlaceSheet();
  });

  map.on("moveend", () => {
    if (logoHideTimer) window.clearTimeout(logoHideTimer);
    logoHideTimer = window.setTimeout(() => {
      document.body.classList.remove("map-interacting");
    }, 600);
  });

  
}


// ---------- MAP EVENTS ----------

function handleMapClick(e) {

  if (!state.draftMarker) return;

  state.draftMarker.setLngLat(e.lngLat);

  state.selectedLocation = {
    lng: e.lngLat.lng,
    lat: e.lngLat.lat
  };

  console.log("Pin moved by click:", state.selectedLocation);

}

// ---------- DRAFT MARKER ----------

export function createDraftMarker(lng, lat) {

  const map = getMap();

  if (state.draftMarker) {
    state.draftMarker.remove();
  }

  const el = document.createElement("div");
  el.className = "draft-marker";

  const marker = new mapboxgl.Marker({ element: el, draggable: true })
    .setLngLat([lng, lat])
    .addTo(map);

  el.addEventListener("click", (e) => {
    if (!state.draftMarkerLocked) return;
    e.stopPropagation();
    showDraftMarkerPopup();
  });

  marker.on("dragend", () => {

    const pos = marker.getLngLat();

    state.selectedLocation = {
      lng: pos.lng,
      lat: pos.lat
    };

  });

  state.draftMarker = marker;
  state.draftMarkerLocked = false;

  state.selectedLocation = { lng, lat };

}

export function setDraftMarkerLocked(locked, showPopup = false) {
  if (!state.draftMarker) return;

  state.draftMarkerLocked = locked;
  state.draftMarker.setDraggable(!locked);

  const el = state.draftMarker.getElement();
  if (el) el.classList.toggle("locked", locked);

  if (locked && showPopup) {
    showDraftMarkerPopup();
  }

  if (!locked && state.draftMarkerPopup) {
    state.draftMarkerPopup.remove();
    state.draftMarkerPopup = null;
  }
}

export function showDraftMarkerPopup() {
  if (!state.draftMarker) return;

  if (state.draftMarkerPopup) {
    state.draftMarkerPopup.remove();
  }

  const map = getMap();
  const wrapper = document.createElement("div");
  wrapper.className = "marker-popup";
  wrapper.innerHTML = `
    <button type="button" class="unlock-btn">Unlock marker to move</button>
  `;

  const popup = new mapboxgl.Popup({ offset: 20, closeOnClick: true })
    .setLngLat(state.draftMarker.getLngLat())
    .setDOMContent(wrapper)
    .addTo(map);

  const unlockBtn = wrapper.querySelector(".unlock-btn");
  if (unlockBtn) {
    unlockBtn.addEventListener("click", () => {
      setDraftMarkerLocked(false);
    });
  }

  state.draftMarkerPopup = popup;
}

export function clearDraftMarker() {
  if (state.draftMarkerPopup) {
    state.draftMarkerPopup.remove();
    state.draftMarkerPopup = null;
  }

  if (state.draftMarker) {
    state.draftMarker.remove();
    state.draftMarker = null;
  }

  state.draftMarkerLocked = false;
}
