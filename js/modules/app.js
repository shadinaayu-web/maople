import { loadPlaces } from "./places.js";
import { renderPlaces } from "./markers.js";
import { extractFilterOptions, renderFilters, renderQuickFilters } from "./filters.js";
import { state } from "./state.js";

export async function refreshApp(){

  await loadPlaces();

  const filterData = extractFilterOptions(state.places || []);
  renderFilters(filterData);
  renderQuickFilters();

  renderPlaces();

}
