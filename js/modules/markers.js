import { state } from "./state.js";
import { computePlaceScoring, consumeFilterPulse } from "./filters.js";
import { getMap } from "./map.js";
import { openSidePanel } from "./panel.js";

export function renderPlaces() {

  const map = getMap();

  if (!map) return;

  const source = map.getSource("places");

  if (!source) return;

  const features = [];

  const center = map.getCenter();

  state.places.forEach(place => {

    if (!place.location) return;

    const { lng, lat } = place.location;

    if (typeof lng !== "number" || typeof lat !== "number") return;

    const scoring = computePlaceScoring(place, center);
    const groupSummary = scoring.groupSummary;
    const groupLabel = groupSummary?.size
      ? `${groupSummary.fitCount}/${groupSummary.size}`
      : null;

    features.push({
      type: "Feature",
      properties: {
        placeId: place.id,
        name: place.name,
        matchScore: scoring.finalScore,
        matchStrength: scoring.matchStrength,
        confidence: scoring.confidence,
        reviewCount: scoring.reviewCount,
        hiddenGem: !!scoring.hiddenGem,
        groupLabel
      },
      geometry: {
        type: "Point",
        coordinates: [lng, lat]
      }
    });

  });

  const geojson = {
    type: "FeatureCollection",
    features
  };

  source.setData(geojson);

  if (consumeFilterPulse()) {
    triggerMatchPulse(map);
  }

}

function triggerMatchPulse(map) {
  if (!map || !map.getLayer("match-pulse")) return;

  map.setPaintProperty("match-pulse", "circle-opacity", 0.65);
  map.setPaintProperty("match-pulse", "circle-opacity-transition", { duration: 0 });

  requestAnimationFrame(() => {
    map.setPaintProperty("match-pulse", "circle-opacity-transition", { duration: 600 });
    map.setPaintProperty("match-pulse", "circle-opacity", 0);
  });
}

// ---------- CLICK HANDLERS ----------

export function enablePlaceClicks() {

  const map = getMap();

  map.on("click", "unclustered-point", (e) => {

    const feature = e.features[0];

    const place = state.places.find(
      p => p.id === feature.properties.placeId
    );

    if (place) openSidePanel(place);

  });

  map.on("click", "clusters", (e) => {

    const features = map.queryRenderedFeatures(e.point, {
      layers: ["clusters"]
    });

    const clusterId = features[0].properties.cluster_id;

    map.getSource("places").getClusterExpansionZoom(
      clusterId,
      (err, zoom) => {

        if (err) return;

        map.easeTo({
          center: features[0].geometry.coordinates,
          zoom
        });

      }
    );

  });

  map.on("mouseenter", "unclustered-point", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "unclustered-point", () => {
    map.getCanvas().style.cursor = "";
  });

}
