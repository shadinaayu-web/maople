import { state } from "./state.js";
import { enablePlaceClicks } from "./markers.js";
import { collapseDockForMobile, collapsePlaceSheet } from "./filters.js";
import { openSidePanel } from "./panel.js";

let map;
let logoHideTimer;
const PIN_SIZE = 36;
const PIN_OUTLINE = "#4e3c62";
const PIN_CENTER = "#ffffff";
const DRAFT_PIN_COLORS = {
  unlocked: "#5e4b73",
  locked: "#f2d16b"
};
const pinDataUrlCache = new Map();

function createPinCanvas(fillColor, size = PIN_SIZE) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);

  const baseTotalHeight = 26;
  const baseCircleDiameter = 20;
  const baseTailHeight = 8;
  const baseTailTopY = 18;
  const baseDotDiameter = 6;
  const scale = size / baseTotalHeight;
  const circleRadius = (baseCircleDiameter / 2) * scale;
  const cx = size / 2;
  const cy = circleRadius;
  const tailTopY = baseTailTopY * scale;
  const tipY = tailTopY + baseTailHeight * scale;
  const dy = tailTopY - cy;
  const dx = Math.sqrt(Math.max(0, circleRadius * circleRadius - dy * dy));
  const angleLeft = Math.PI - Math.acos(dx / circleRadius);
  const angleRight = Math.acos(dx / circleRadius);

  ctx.beginPath();
  ctx.moveTo(cx - dx, tailTopY);
  ctx.arc(cx, cy, circleRadius, angleLeft, angleRight, false);
  ctx.lineTo(cx, tipY);
  ctx.closePath();
  ctx.fillStyle = fillColor;
  ctx.fill();
  ctx.strokeStyle = PIN_OUTLINE;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, (baseDotDiameter / 2) * scale, 0, Math.PI * 2);
  ctx.fillStyle = PIN_CENTER;
  ctx.fill();

  return canvas;
}

function getPinDataUrl(fillColor, size = PIN_SIZE) {
  const key = `${fillColor}-${size}`;
  if (pinDataUrlCache.has(key)) return pinDataUrlCache.get(key);
  const canvas = createPinCanvas(fillColor, size);
  if (!canvas) return "";
  const url = canvas.toDataURL("image/png");
  pinDataUrlCache.set(key, url);
  return url;
}


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

    const addOverlays = () => {
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
    };

    const pinColors = {
      weak: "#c8c3d0",
      mid: "#f2d16b",
      strong: "#4caf50"
    };

    const addPinImage = (id, color) => {
      if (map.hasImage(id)) {
        map.removeImage(id);
      }
      const canvas = createPinCanvas(color, PIN_SIZE);
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const imageData = ctx?.getImageData(0, 0, PIN_SIZE, PIN_SIZE);
        if (imageData) {
          map.addImage(id, { width: PIN_SIZE, height: PIN_SIZE, data: imageData.data });
        }
      }
    };

    addPinImage("pin-weak-v8", pinColors.weak);
    addPinImage("pin-mid-v8", pinColors.mid);
    addPinImage("pin-strong-v8", pinColors.strong);

    if (map.getLayer("unclustered-point")) {
      map.removeLayer("unclustered-point");
    }
    map.addLayer({
      id: "unclustered-point",
      type: "symbol",
      source: "places",
      filter: ["!", ["has", "point_count"]],
      layout: {
        "icon-image": [
          "case",
          ["<", ["coalesce", ["get", "matchStrength"], 0.5], 0.33], "pin-weak-v8",
          ["<", ["coalesce", ["get", "matchStrength"], 0.5], 0.66], "pin-mid-v8",
          "pin-strong-v8"
        ],
        "icon-size": [
          "interpolate",
          ["linear"],
          ["coalesce", ["get", "confidence"], 0],
          0, 0.95,
          0.5, 1.05,
          1, 1.2
        ],
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
        "icon-anchor": "bottom",
        "symbol-sort-key": ["get", "matchScore"]
      }
    });

    addOverlays();

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
  el.style.backgroundImage = `url(${getPinDataUrl(DRAFT_PIN_COLORS.unlocked)})`;

  const marker = new mapboxgl.Marker({ element: el, draggable: true, anchor: "bottom" })
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
  if (el) {
    el.classList.toggle("locked", locked);
    el.style.backgroundImage = `url(${getPinDataUrl(locked ? DRAFT_PIN_COLORS.locked : DRAFT_PIN_COLORS.unlocked)})`;
  }

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

