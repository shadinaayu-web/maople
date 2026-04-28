import {
  getMap,
  createDraftMarker,
  setDraftMarkerLocked,
  clearDraftMarker
} from "./map.js";
import { state } from "./state.js";
import { findExistingPlace } from "./places.js";
import { openSidePanel } from "./panel.js";
import { collapseDockForMobile, collapsePlaceSheet, expandPlaceSheet } from "./filters.js";

// Track if we're in "add place" mode
let isAddingPlace = false;
let currentPlaceData = null;
let activeMapClickHandler = null;
let latestResults = null;
let latestQuery = "";
let suggestionsObserver = null;
let isUpdatingSuggestions = false;
let pendingSuggestionUpdate = false;
const placeSubtitleCache = new Map();

export function initSearch() {

  const map = getMap();

  const geocoder = new MapboxGeocoder({
    accessToken: "pk.eyJ1Ijoic2hhZGluYWF5dSIsImEiOiJja2YzZ3c1ZmwwMzIyMnNwanhoNjczaG5rIn0.9iEcuNJQ0sS8_IbRh48LZg",
    mapboxgl: mapboxgl,
    marker: false,
    placeholder: "Find places that fit how you move, feel, and navigate"
  });

  const container = document.getElementById("search-container");

  container.appendChild(geocoder.onAdd(map));

  // Delegate clicks at the document level (capture) so handlers survive re-renders
  if (!document.documentElement.dataset.customClickBound) {
    document.documentElement.dataset.customClickBound = "true";
    const handler = (e) => {
      const target = e.target.closest(".custom-suggestion, .custom-suggestion-btn");
      if (!target) return;

      const isCustom =
        target.classList.contains("custom-suggestion") ||
        target.classList.contains("custom-suggestion-btn");
      if (!isCustom) return;

      e.preventDefault();
      e.stopPropagation();

      const action =
        target.dataset.action ||
        target.closest(".custom-suggestion")?.dataset?.action ||
        "";

      if (action === "add-to-map") {
        handleAddToMapSuggestionClick();
        return;
      }

      const placeId =
        target.dataset.placeId ||
        target.closest(".custom-suggestion")?.dataset?.placeId;
      const place = state.places.find(p => p.id === placeId);
      if (!place) return;

      flyToPlace(place?.location);
      openSidePanel({
        id: place.id,
        name: place.name,
        location: place.location
      });

      const listEl =
        document.querySelector(".suggestions") ||
        document.querySelector(".mapboxgl-ctrl-geocoder--suggestions");

      if (listEl) listEl.style.display = "none";
    };

    document.addEventListener("pointerdown", handler, true);
    document.addEventListener("click", handler, true);
  }

  // ---------- INTERCEPT ENTER KEY ONLY (KEEP SUGGESTIONS VISIBLE) ----------

  geocoder.on("results", (e) => {
    latestResults = e;
    scheduleSuggestionsUpdate();
  });

  // Wait a bit for the geocoder to fully render
  setTimeout(() => {
    const inputEl = container.querySelector("input");

    if (!inputEl) return;

    inputEl.addEventListener("input", (e) => {
      latestQuery = e.target.value || "";
      scheduleSuggestionsUpdate();
    });

    inputEl.addEventListener("focus", () => {
      if (window.matchMedia("(max-width: 768px)").matches) {
        document.body.classList.add("search-focus");
      }
      scheduleSuggestionsUpdate();
    });

    inputEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;

      const hasSuggestions =
        latestResults &&
        Array.isArray(latestResults.features) &&
        latestResults.features.length > 0;

      // Let geocoder handle Enter when suggestions exist
      if (hasSuggestions) return;

      e.preventDefault();
      e.stopPropagation();

      handleEnterKey(inputEl);
    });

    inputEl.addEventListener("blur", () => {
      if (window.matchMedia("(max-width: 768px)").matches) {
        document.body.classList.remove("search-focus");
      }
    });

    // Keep custom suggestions persistent even when Mapbox re-renders
    ensureSuggestionsObserver();
  }, 100);

  // ---------- USER SELECTS SUGGESTION FROM DROPDOWN ----------

  geocoder.on("result", async (e) => {

    const [lng, lat] = e.result.center;
    const placeName = e.result.text;
    const placeType = e.result.place_type ? e.result.place_type[0] : null;

    console.log("User selected suggestion:", placeName, "Type:", placeType);

    // store selection
    state.selectedLocation = { lng, lat };

    // If in "add place" mode, refine location without showing area prompt
    if (isAddingPlace) {
      handleAddModeResult(placeName, lng, lat, placeType);
      return;
    }

    // ---------- CHECK DATABASE ----------

    const existing = await findExistingPlace(placeName);

    if (existing) {
      console.log("Place exists in DB");

      openSidePanel({
        id: existing.id,
        name: existing.data().name,
        location: existing.data().location
      });

      return;
    }

    // If it's a general area (district, region, etc)
    if (isGeneralArea(placeType)) {
      console.log("General area selected, flying map");
      const map = getMap();
      map.flyTo({
        center: [lng, lat],
        zoom: 14,
        duration: 1000
      });
      
      // Set add place mode so next search will trigger location confirmation
      isAddingPlace = true;
      currentPlaceData = { areaName: placeName, areaLng: lng, areaLat: lat };
      
      // Show instruction to search for specific place
      showSearchForSpecificPlaceUI(placeName, lng, lat);
      
      return;
    }

    // ---------- PLACE DOES NOT EXIST IN MAOPLE (SPECIFIC PLACE) ----------

    showAddToMapPrompt(placeName, lng, lat);

  });
  
  geocoder.on("clear", () => {
    latestQuery = "";
    latestResults = null;
    scheduleSuggestionsUpdate();
  });

}

function scheduleSuggestionsUpdate() {
  if (pendingSuggestionUpdate) return;
  pendingSuggestionUpdate = true;
  requestAnimationFrame(() => {
    pendingSuggestionUpdate = false;
    updateCustomSuggestions();
  });
}

function ensureSuggestionsObserver() {
  const container = document.getElementById("search-container");
  if (!container) return;

  const list =
    container.querySelector(".suggestions") ||
    container.querySelector(".mapboxgl-ctrl-geocoder--suggestions");

  if (!list) return;

  if (suggestionsObserver) {
    suggestionsObserver.disconnect();
  }

  suggestionsObserver = new MutationObserver(() => {
    scheduleSuggestionsUpdate();
  });

  suggestionsObserver.observe(list, { childList: true, subtree: false });
}

function updateCustomSuggestions() {
  if (isUpdatingSuggestions) return;
  isUpdatingSuggestions = true;

  const container = document.getElementById("search-container");
  if (!container) {
    isUpdatingSuggestions = false;
    return;
  }

  const list =
    container.querySelector(".suggestions") ||
    container.querySelector(".mapboxgl-ctrl-geocoder--suggestions");

  if (!list) {
    isUpdatingSuggestions = false;
    return;
  }

  const wrapper = list.classList.contains("mapboxgl-ctrl-geocoder--suggestions")
    ? list
    : list.closest(".mapboxgl-ctrl-geocoder--suggestions");

  if (suggestionsObserver) {
    suggestionsObserver.disconnect();
  }

  const query = (latestQuery || "").trim();

  // Remove any previous custom items
  list
    .querySelectorAll(".custom-suggestion, .custom-suggestion-header")
    .forEach(el => el.remove());

  const anchor =
    list.querySelector("li:not(.custom-suggestion):not(.custom-suggestion-header)") ||
    null;

  const items = [];

  items.push(createAddToMapSuggestion());

  const hasQuery = query.length > 0;

  const maopleMatches = hasQuery
    ? state.places
        .filter(p => p.name && p.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 5)
    : [];

  if (maopleMatches.length > 0) {
    items.push(createHeaderSuggestion("Maople"));
    maopleMatches.forEach(place => {
      items.push(createMaopleSuggestion(place));
    });
  }

  items.forEach(item => {
    if (anchor) {
      list.insertBefore(item, anchor);
    } else {
      list.appendChild(item);
    }
  });

  list.style.display = "block";
  list.style.pointerEvents = "auto";


  if (wrapper) {
    wrapper.style.display = "block";
    wrapper.style.pointerEvents = "auto";
    wrapper.removeAttribute("aria-hidden");
    wrapper.removeAttribute("hidden");
  }

  if (suggestionsObserver) {
    suggestionsObserver.observe(list, { childList: true, subtree: false });
  }

  isUpdatingSuggestions = false;
}

function createHeaderSuggestion(label) {
  const li = document.createElement("li");
  li.className = "custom-suggestion-header";
  li.textContent = label;
  return li;
}

function createAddToMapSuggestion() {
  const li = document.createElement("li");
  li.className = "custom-suggestion";
  li.dataset.action = "add-to-map";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "custom-suggestion-btn primary-suggestion";
  btn.dataset.action = "add-to-map";
  btn.textContent = "Can't find the place? Add to map";

  const handleEvent = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.stopImmediatePropagation) e.stopImmediatePropagation();
    handleAddToMapSuggestionClick();
  };

  btn.addEventListener("pointerdown", handleEvent, true);
  btn.addEventListener("mousedown", handleEvent, true);
  btn.addEventListener("click", handleEvent, true);

  li.addEventListener("pointerdown", handleEvent, true);
  li.addEventListener("mousedown", handleEvent, true);
  li.addEventListener("click", handleEvent, true);

  li.appendChild(btn);
  return li;
}

function handleAddToMapSuggestionClick() {
  const inputEl = document.querySelector("#search-container input");
  let name = (inputEl?.value || latestQuery || "").trim();

  if (!name) {
    name = "New place";
  }

  if (inputEl) inputEl.value = name;

  isAddingPlace = true;
  const map = getMap();
  const center = map.getCenter();

  state.addPlaceState = {
    step: "locating",
    selectedPlace: { name, lng: center.lng, lat: center.lat },
    entranceLocation: { lng: center.lng, lat: center.lat }
  };

  showLocationConfirmation(name, center.lng, center.lat, { skipFly: true });

  const list =
    document.querySelector(".suggestions") ||
    document.querySelector(".mapboxgl-ctrl-geocoder--suggestions");

  if (list) list.style.display = "none";
}

function handleAddModeResult(name, lng, lat, placeType) {
  const map = getMap();

  const targetZoom = isGeneralArea(placeType) ? 14 : 16;

  map.flyTo({
    center: [lng, lat],
    zoom: targetZoom,
    duration: 800
  });

  // Move marker to new search location
  createDraftMarker(lng, lat);
  state.selectedLocation = { lng, lat };

  // Keep confirmation UI visible
  const confirmUI = document.getElementById("locationConfirmUI");
  if (confirmUI) confirmUI.style.display = "block";
}

function createMaopleSuggestion(place) {
  const li = document.createElement("li");
  li.className = "custom-suggestion";
  li.dataset.placeId = place.id;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "custom-suggestion-btn";
  btn.dataset.placeId = place.id;
  btn.innerHTML = `
    <span class="suggestion-title">${place.name}</span>
    <span class="suggestion-subtitle">${getPlaceSubtitle(place)}</span>
  `;

  li.appendChild(btn);
  return li;
}

function getPlaceSubtitle(place) {
  if (!place?.location) return "Location unknown";

  if (placeSubtitleCache.has(place.id)) {
    return placeSubtitleCache.get(place.id);
  }

  placeSubtitleCache.set(place.id, "Locating...");
  fetchPlaceSubtitle(place);
  return "Locating...";
}

async function fetchPlaceSubtitle(place) {
  try {
    const coords = getCoordsFromLocation(place?.location);
    if (!coords) return;
    const { lng, lat } = coords;

    const attempt = async (a, b) => {
      const lngStr = Number(a).toFixed(6);
      const latStr = Number(b).toFixed(6);
      const url =
        `https://api.mapbox.com/geocoding/v5/mapbox.places/` +
        `${lngStr},${latStr}.json` +
        `?limit=1` +
        `&access_token=pk.eyJ1Ijoic2hhZGluYWF5dSIsImEiOiJja2YzZ3c1ZmwwMzIyMnNwanhoNjczaG5rIn0.9iEcuNJQ0sS8_IbRh48LZg`;
      const res = await fetch(url);
      return { res, data: await res.json() };
    };

    let { res, data } = await attempt(lng, lat);
    if (res.status === 422) {
    ({ res, data } = await attempt(lat, lng));
    }

    const features = data?.features || [];
    const feature = features[0];
    const label = formatAreaLabel(feature) || feature?.place_name || "Unknown area";

    placeSubtitleCache.set(place.id, label);

    document
      .querySelectorAll(".custom-suggestion-btn .suggestion-subtitle")
      .forEach((el) => {
        const btn = el.closest(".custom-suggestion-btn");
        if (btn?.dataset?.placeId === place.id) {
          el.textContent = label;
        }
      });
  } catch {
    placeSubtitleCache.set(place.id, "Unknown area");
  }
}

function formatAreaLabel(feature) {
  if (!feature) return "";
  const ctx = feature.context || [];
  const get = (type) =>
    ctx.find(c => c.id?.startsWith(type + "."))?.text || "";

  const neighborhood = get("neighborhood");
  const district = get("district");
  const place = get("place") || get("locality");
  const region = get("region");

  const parts = [neighborhood || district || feature.text, place, region]
    .filter(Boolean)
    .slice(0, 3);

  return parts.join(", ");
}

function flyToPlace(location) {
  const coords = getCoordsFromLocation(location);
  if (!coords) {
    return;
  }
  const map = getMap();
  if (!map) return;

  const { lng, lat } = coords;

  const doFly = () =>
    map.flyTo({
      center: [lng, lat],
      zoom: 16,
      duration: 800
    });

  if (typeof map.loaded === "function" && !map.loaded()) {
    map.once("load", doFly);
  } else {
    doFly();
  }
}

function getCoordsFromLocation(location) {
  if (!location) return null;
  if (Array.isArray(location) && location.length >= 2) {
    const lng = Number(location[0]);
    const lat = Number(location[1]);
    if (Number.isFinite(lng) && Number.isFinite(lat)) return sanitizeCoords(lng, lat);
    return null;
  }
  const lng =
    Number(
      location.lng ??
      location.longitude ??
      location.lon ??
      location._long ??
      location._longitude
    );
  const lat =
    Number(
      location.lat ??
      location.latitude ??
      location._lat ??
      location._latitude
    );

  if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
    return null;
  }
  return sanitizeCoords(lng, lat);
}

function sanitizeCoords(lng, lat) {
  let safeLng = lng;
  let safeLat = lat;

  // Swap if likely reversed
  if (Math.abs(safeLat) > 90 && Math.abs(safeLng) <= 90) {
    [safeLng, safeLat] = [safeLat, safeLng];
  }

  if (Math.abs(safeLng) > 180 || Math.abs(safeLat) > 90) return null;

  return {
    lng: Number(safeLng.toFixed(6)),
    lat: Number(safeLat.toFixed(6))
  };
}

// Determine if a place type is a general area (not a specific building)
function isGeneralArea(placeType) {
  const generalAreaTypes = [
    "region",
    "district",
    "place",
    "neighborhood",
    "postcode",
    "country"
  ];
  return generalAreaTypes.includes(placeType);
}

async function handleEnterKey(inputEl) {
  const searchText = inputEl.value.trim();

  if (!searchText) return;

  console.log("User pressed Enter with:", searchText);

  // Check if place exists in Maople database
  const existing = await findExistingPlace(searchText);

  if (existing) {
    console.log("Place exists in DB");

    openSidePanel({
      id: existing.id,
      name: existing.data().name,
      location: existing.data().location
    });

    inputEl.value = "";
    isAddingPlace = false;

    return;
  }

  // Place doesn't exist - use Mapbox to get coordinates
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchText)}.json?access_token=pk.eyJ1Ijoic2hhZGluYWF5dSIsImEiOiJja2YzZ3c1ZmwwMzIyMnNwanhoNjczaG5rIn0.9iEcuNJQ0sS8_IbRh48LZg`
    );

    const data = await response.json();

    if (data.features && data.features.length > 0) {
      const feature = data.features[0];
      const [lng, lat] = feature.center;
      const placeType = feature.place_type ? feature.place_type[0] : null;

      state.selectedLocation = { lng, lat };

      if (isAddingPlace) {
        handleAddModeResult(searchText, lng, lat, placeType);
        inputEl.value = "";
        return;
      }

      // If it's a general area, fly the map and enable add place mode
      if (isGeneralArea(placeType)) {
        console.log("General area entered, flying map");
        const map = getMap();
        map.flyTo({
          center: [lng, lat],
          zoom: 14,
          duration: 1000
        });
        
        // Enable add place mode
        isAddingPlace = true;
        currentPlaceData = { areaName: searchText, areaLng: lng, areaLat: lat };
        
        // Show instruction to search for specific place
        showSearchForSpecificPlaceUI(searchText, lng, lat);
        
        inputEl.value = "";
        return;
      }

      // Otherwise show the "add to map" prompt
      showAddToMapPrompt(searchText, lng, lat);
      inputEl.value = "";
    } else {
      alert("Location not found. Please try a different search.");
    }
  } catch (error) {
    console.error("Geocoding error:", error);
    alert("Error searching location. Please try again.");
  }
}

// Show instruction when user is in a general area
export function showSearchForSpecificPlaceUI(areaName, areaLng, areaLat) {
  const ui = document.getElementById("searchForSpecificUI");
  if (!ui) return;

  ui.style.display = "block";
  ui.querySelector(".area-name").innerText = areaName;

  // Store area data for "Add to Map" button
  currentPlaceData = { areaName, areaLng, areaLat };

  document.getElementById("closeAreaInstructionBtn").onclick = () => {
    ui.style.display = "none";
  };

  document.getElementById("closeAddModeBtn").onclick = () => {
    exitAddPlaceMode();
  };

  // Add to Map button from area instruction
  document.getElementById("addFromAreaBtn").onclick = () => {
    ui.style.display = "none";
    state.addPlaceState = {
      step: "locating",
      selectedPlace: { name: areaName, lng: areaLng, lat: areaLat },
      entranceLocation: { lng: areaLng, lat: areaLat }
    };
    // Show location confirmation with current area location
    showLocationConfirmation(areaName, areaLng, areaLat);
  };
}

// Show "Add to map?" prompt for specific places that don't exist
export function showAddToMapPrompt(name, lng, lat) {

  const ui = document.getElementById("addToMapPrompt");

  ui.style.display = "block";

  ui.querySelector(".place-name").innerText = name;

  document.getElementById("addToMapBtn").onclick = () => {

    // Hide prompt
    ui.style.display = "none";

    // Store the place data in state
    state.addPlaceState = {
      step: "locating",
      selectedPlace: { name, lng, lat },
      entranceLocation: { lng, lat }
    };

    // Enter add place mode so user can refine via search
    isAddingPlace = true;

    // Create draft marker and show location confirmation UI
    // Skip flyTo to keep the map in the current view
    showLocationConfirmation(name, lng, lat, { skipFly: true });

  };

  // Cancel button
  document.getElementById("cancelAddToMapBtn").onclick = () => {
    ui.style.display = "none";
    isAddingPlace = false;
  };

}

// Old intervention UI - kept for backward compatibility but not used in new flow
export function showCreatePlacePrompt(name, lng, lat) {

  const ui = document.getElementById("addPlacePrompt");

  ui.style.display = "block";

  ui.querySelector(".place-name").innerText = name;

  document.getElementById("confirmPlaceBtn").onclick = () => {

    // Hide intervention UI
    ui.style.display = "none";

    // Store the place data in state
    state.addPlaceState = {
      step: "locating",
      selectedPlace: { name, lng, lat },
      entranceLocation: { lng, lat }
    };

    // Create draft marker and show location confirmation UI
    showLocationConfirmation(name, lng, lat);

  };

  // Cancel button
  document.getElementById("cancelPlaceBtn").onclick = () => {
    ui.style.display = "none";
    isAddingPlace = false;
  };

}

export function showLocationConfirmation(name, lng, lat, options = {}) {

  const map = getMap();

  if (!options?.skipFly) {
    // Fly to the location
    map.flyTo({
      center: [lng, lat],
      zoom: 16,
      duration: 1000
    });
  }

  // Create draggable marker
  createDraftMarker(lng, lat);
  setDraftMarkerLocked(false);

  // Show location confirmation UI
  const confirmUI = document.getElementById("locationConfirmUI");
  confirmUI.style.display = "block";

  // Enable map click to move marker
  const mapClickHandler = (e) => {
    if (state.draftMarker) {
      state.draftMarker.setLngLat(e.lngLat);
      state.selectedLocation = {
        lng: e.lngLat.lng,
        lat: e.lngLat.lat
      };
    }
  };

  map.on("click", mapClickHandler);
  activeMapClickHandler = mapClickHandler;

  // Confirm location button
  document.getElementById("confirmLocationBtn").onclick = () => {
    // Remove map click handler
    map.off("click", mapClickHandler);
    activeMapClickHandler = null;

    // Hide confirmation UI
    confirmUI.style.display = "none";

    // Store final location
    state.addPlaceState.entranceLocation = state.selectedLocation;
    state.addPlaceState.step = "reviewing";

    // Set place name and open form
    document.getElementById("placeName").value = name;

    const form = document.getElementById("placeForm");
    if (form) form.style.display = "block";

    // Import and call showStep to display the form
    import("./form.js").then(({ showStep }) => {
      showStep(0);
    });

    openFormInSidePanel("Add Place Review");
    setDraftMarkerLocked(true, true);

    // Reset add place mode
    isAddingPlace = false;
  };

  // Cancel location button
  document.getElementById("cancelLocationBtn").onclick = () => {
    // Remove map click handler
    map.off("click", mapClickHandler);
    activeMapClickHandler = null;

    // Hide confirmation UI
    confirmUI.style.display = "none";

    clearDraftMarker();

    // Reset state
    state.addPlaceState = {
      step: "idle",
      selectedPlace: null,
      entranceLocation: null
    };

    // Keep add place mode active if we're in a general area
    // isAddingPlace remains true so user can search for specific places
  };

}

export function openAddReviewForm(placeId, placeName) {
  // Store place info in state
  state.addPlaceState = {
    step: "reviewing",
    selectedPlace: { id: placeId, name: placeName },
    entranceLocation: null
  };
  state.editingPlaceId = placeId;

  // Set place name and open form
  const nameInput = document.getElementById("placeName");
  if (nameInput) nameInput.value = placeName;

  const form = document.getElementById("placeForm");
  if (form) form.style.display = "block";

  // Import and call showStep to display the form
  import("./form.js").then(({ showStep }) => {
    showStep(0);
  });

  openFormInSidePanel(`Review ${placeName}`);
}

function openFormInSidePanel(titleText) {
  const panel = document.getElementById("sidePanel");
  const title = document.getElementById("panelTitle");
  const content = document.getElementById("panelContent");
  const form = document.getElementById("placeForm");
  const tab = document.getElementById("sidePanelTab");

  if (!panel || !title || !content || !form) return;

  title.innerText = titleText || "Add Review";
  content.innerHTML = "";
  content.appendChild(form);
  panel.classList.add("active");
  panel.classList.add("reviewing");
  collapseDockForMobile();
  expandPlaceSheet();
  if (tab) tab.classList.remove("visible");
}

function exitAddPlaceMode() {
  isAddingPlace = false;
  currentPlaceData = null;

  const prompts = [
    "addPlacePrompt",
    "addToMapPrompt",
    "locationConfirmUI",
    "searchForSpecificUI"
  ];

  prompts.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });

  const form = document.getElementById("placeForm");
  if (form) form.style.display = "none";

  const panel = document.getElementById("sidePanel");
  if (panel) panel.classList.remove("active");
  if (panel) panel.classList.remove("reviewing");
  collapsePlaceSheet();

  if (activeMapClickHandler) {
    const map = getMap();
    map.off("click", activeMapClickHandler);
    activeMapClickHandler = null;
  }

  clearDraftMarker();

  state.addPlaceState = {
    step: "idle",
    selectedPlace: null,
    entranceLocation: null
  };

  state.editingPlaceId = null;
}

export function cancelReview() {
  const placeId = state.editingPlaceId;
  const place = state.places.find(p => p.id === placeId);
  exitAddPlaceMode();
  if (place) {
    openSidePanel(place);
  }
}
