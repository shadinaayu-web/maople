import { initSearch } from "./modules/search.js";
import { initForm } from "./modules/form.js";
import { initMap } from "./modules/map.js";
import { initFilters, initProfilePicker, initPlaceSheet } from "./modules/filters.js";
import { initProfileSetup } from "./modules/profile.js";
import { refreshApp } from "./modules/app.js";
import { getMap } from "./modules/map.js";

async function startApp() {

  initMap();

  const map = getMap();

  // Wait for map to load before rendering places
  map.on("load", async () => {
    await refreshApp();
    initSearch();
    initForm();
    initFilters();
    initProfilePicker();
    initProfileSetup();
    initPlaceSheet();
  });

}

startApp();
