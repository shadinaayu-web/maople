import { db } from "./firebase.js";
import { state } from "./state.js";

import {
  collection,
  getDocs,
  addDoc,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ---------- LOAD PLACES ----------

export async function loadPlaces() {

  const snapshot = await getDocs(collection(db, "places"));

  const loadedPlaces = [];

  snapshot.forEach(docSnap => {

    const data = docSnap.data();

    loadedPlaces.push({
      id: docSnap.id,
      name: data.name,
      category: data.category,
      location: data.location,
      reviews: [],
      reviewCount: data.reviewCount || 0,
      dimensionSums: data.dimensionSums || {},
      dimensionCounts: data.dimensionCounts || {},
      metricSums: data.metricSums || {},
      metricCounts: data.metricCounts || {},
      calmZonesClearlyCount: data.calmZonesClearlyCount || 0,
      calmZonesAvailabilityCount: data.calmZonesAvailabilityCount || 0
    });

  });

  state.places = loadedPlaces;

  console.log("Loaded places:", state.places);
}


// ---------- FIND EXISTING PLACE ----------

export async function findExistingPlace(name) {

  const q = query(
    collection(db, "places"),
    where("name", "==", name)
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    return snapshot.docs[0];
  }

  return null;

}


// ---------- GET OR CREATE PLACE ----------

export async function getOrCreatePlace(placeData) {

  const existing = await findExistingPlace(placeData.name);

  if (existing) {
    return existing.id;
  }

  const newPlaceRef = doc(collection(db, "places"));

  await setDoc(newPlaceRef, {
    name: placeData.name,
    category: placeData.category,
    location: placeData.location,
    createdAt: serverTimestamp()
  });

  return newPlaceRef.id;

}


// ---------- CREATE PLACE + REVIEW ----------

export async function submitPlaceToFirestore(placeData, reviewData) {
  const startedAt = performance.now();
  const location = placeData.location || state.selectedLocation || null;
  const hasExistingId = !!placeData.id || !!state.editingPlaceId;
  if (!hasExistingId && !location) {
    throw new Error("Missing location for new place.");
  }
  const placeId =
    placeData.id ||
    state.editingPlaceId ||
    (await getOrCreatePlace(placeData));

  const placeRef = doc(db, "places", placeId);

  await addDoc(
    collection(db, "places", placeId, "reviews"),
    {
      ...reviewData,
      userId: state.currentUserId,
      createdAt: serverTimestamp()
    }
  );

  const sums = {};
  const counts = {};
  const scores = reviewData.dimensionScores || {};
  Object.entries(scores).forEach(([id, value]) => {
    if (value === null || value === undefined || Number.isNaN(value)) return;
    sums[`dimensionSums.${id}`] = increment(Number(value));
    counts[`dimensionCounts.${id}`] = increment(1);
  });

  const metricSums = {};
  const metricCounts = {};
  const addMetric = (key, value) => {
    if (value === null || value === undefined || Number.isNaN(value)) return;
    metricSums[`metricSums.${key}`] = increment(Number(value));
    metricCounts[`metricCounts.${key}`] = increment(1);
  };

  addMetric("movementContinuity", reviewData.movement?.continuity);
  addMetric("wayfindingClarity", reviewData.wayfinding?.clarity);
  addMetric("visualLoad", reviewData.visualLoad?.level);
  addMetric("transitionsAbruptness", reviewData.transitions?.abruptness);
  addMetric("soundOverall", reviewData.sound?.overall);
  addMetric("lightingOverall", reviewData.lighting?.overall);

  const availability = reviewData.calmZones?.availability;
  const availabilityCount = availability ? increment(1) : null;
  const clearlyCount = availability === "clearly" ? increment(1) : null;

  await updateDoc(placeRef, {
    reviewCount: increment(1),
    ...sums,
    ...counts,
    ...metricSums,
    ...metricCounts,
    ...(availabilityCount ? { calmZonesAvailabilityCount: availabilityCount } : {}),
    ...(clearlyCount ? { calmZonesClearlyCount: clearlyCount } : {})
  });

  console.log("[review] firestore updated in", Math.round(performance.now() - startedAt), "ms");
  return placeId;

}
