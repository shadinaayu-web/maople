import { state } from "./state.js";
import { submitPlaceToFirestore } from "./places.js";
import { refreshApp } from "./app.js";
import { clearDraftMarker } from "./map.js";
import { closeSidePanel } from "./panel.js";
import { computeDimensionScores } from "./reviews.js";

import {
  getMultiSelect,
  getBarValue,
  getRadioValue,
  getStatementMap
} from "./utils.js";


// ---------- INIT FORM ----------

export function initForm() {

  const form = document.getElementById("placeForm");

  if (!form) return;

  form.addEventListener("submit", handleSubmit);

}

let isSubmitting = false;

// ---------- CONFIRM LOCATION ----------

document
  .getElementById("confirmPlaceBtn")
  .addEventListener("click", () => {

  if (!state.selectedLocation) {
    alert("Select a place first");
    return;
  }

  showStep(0);

});


// ---------- FORM SUBMIT ----------

export async function handleSubmit(e) {

  e.preventDefault();

  if (isSubmitting) return;

  const submitBtn = e.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  }
  isSubmitting = true;
  const submitStart = performance.now();

  const name = document.getElementById("placeName").value;

  const category = document.getElementById("placeCategory").value;

  const activeProfile = getActiveProfileForReview();

  const reviewData = {

    id: "review_" + Date.now(),

    userId: state.currentUserId,

    createdAt: new Date().toISOString(),
    schemaVersion: 1,
    formVersion: "2026-03-28",
    profile: {
      id: activeProfile?.profile_id || null,
      name: activeProfile?.name || "Unspecified"
    },

    movement: {
      quickAccess: getMultiSelect("quickAccess"),
      continuity: getBarValue("movementContinuity"),
      statements: getStatementMap("movementStatements")
    },

    wayfinding: {
      clarity: getBarValue("understandingBar"),
      statements: getStatementMap("wayfindingStatements")
    },

    sound: {
      overall: getBarValue("soundOverall"),
      conversationComfort: getRadioValue("conversationComfort"),
      soundComponent: getMultiSelect("soundComponent"),
    },

    lighting: {
      overall: getBarValue("lightingOverall"),
      lightingComponent: getMultiSelect("lightingComponent")
    },

    visualLoad: {
      level: getBarValue("visualLoadLevel"),
      visualComponent: getMultiSelect("visualComponent")
    },

    transitions: {
      changes: getMultiSelect("transitionChanges"),
    },

    calmZones: {
      availability: getRadioValue("calmAvailability"),
      features: getMultiSelect("calmFeatures")
    },

    positives: {
      highlights: getMultiSelect("positiveHighlights"),
      note: document.getElementById("positiveNote")?.value || ""
    }

  };

  reviewData.dimensionScores = computeDimensionScores(reviewData);

  if (isLikelyDuplicate(reviewData)) {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
    isSubmitting = false;
    alert("Looks like this review was just submitted. Please wait a moment.");
    return;
  }

  try {
    console.log("[review] submitting...");
    const placeId = await submitPlaceToFirestore(
      {
        name,
        category,
        location:
          state.addPlaceState?.entranceLocation ||
          state.selectedLocation ||
          null
      },
      reviewData
    );
    console.log("[review] saved to place:", placeId);

    // Refresh data in background to keep UI responsive
    refreshApp().catch((err) => {
      console.warn("[review] refreshApp failed:", err);
    });

    clearDraftMarker();

    renderReviewSummary(reviewData);
    showStep(10);

    const form = document.getElementById("placeForm");
    if (form) {
      form.reset();
      form.style.display = "none";
    }
    state.editingPlaceId = null;
    setPlaceInfoEnabled(true);
    const panel = document.getElementById("sidePanel");
    if (panel) panel.classList.remove("reviewing");
    closeSidePanel();
  } catch (err) {
    console.error("[review] submit failed:", err);
    alert("Something went wrong while submitting. Please try again.");
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = "Submit";
  }
  isSubmitting = false;

  console.log("Review submitted in", Math.round(performance.now() - submitStart), "ms");

}

function getActiveProfileForReview() {
  const profiles = state.user?.profiles || [];
  const activeId = state.activeProfileId;
  if (activeId) {
    const match = profiles.find(p => p.profile_id === activeId);
    if (match) return match;
  }
  return profiles.find(p => p.is_self) || profiles[0] || null;
}


// ---------- FORM STEPS ----------

let currentStep = 0;

const steps = document.querySelectorAll(".form-step");

export function showStep(index) {

  if (state.editingPlaceId && index === 1) {
    index = 2;
  }

  steps.forEach(step => step.classList.remove("active"));

  steps[index]?.classList.add("active");

  currentStep = index;

  setPlaceInfoEnabled(!state.editingPlaceId);
}

export function nextStep() {

  showStep(currentStep + 1);

}

export function prevStep() {

  if (state.editingPlaceId && currentStep === 2) {
    showStep(0);
    return;
  }
  showStep(currentStep - 1);

}


// ---------- NAV BUTTON HANDLER ----------

document.addEventListener("click", (e) => {

  if (e.target.classList.contains("mode-btn")) {

    state.reviewMode = e.target.dataset.mode;

    nextStep();

  }

  if (e.target.classList.contains("next-btn")) {

    nextStep();

  }

  if (e.target.classList.contains("back-btn")) {

    prevStep();

  }

  if (e.target.classList.contains("start-review-btn")) {
    if (state.editingPlaceId) {
      showStep(2);
    } else {
      showStep(1);
    }
  }

  if (e.target.classList.contains("close-summary-btn")) {
    const form = document.getElementById("placeForm");
    if (form) form.reset();
    state.editingPlaceId = null;
    setPlaceInfoEnabled(true);
    showStep(0);
  }

});


// ---------- STATEMENT CHIP SWIPE SYSTEM ----------

let activeChip = null;

let startX = 0;


export function setStatementState(el, stateValue) {

  if (el.dataset.locked === "true") return;

  el.dataset.value = stateValue;

  el.dataset.locked = "true";

  el.classList.remove("true", "false", "dragging");

  el.style.transform = "";

  el.style.background = "";

  if (stateValue === "true") el.classList.add("true");

  if (stateValue === "false") el.classList.add("false");

  if (navigator.vibrate) navigator.vibrate(10);

}


document.addEventListener("pointerdown", (e) => {

  const chip = e.target.closest(".statement-chip");

  if (!chip) return;

  if (chip.dataset.locked === "true") return;

  activeChip = chip;

  startX = e.clientX;

  chip.classList.add("dragging");

});


document.addEventListener("pointermove", (e) => {

  if (!activeChip) return;

  const diff = e.clientX - startX;

  activeChip.style.transform = `translateX(${diff}px)`;

});


document.addEventListener("pointerup", (e) => {

  if (!activeChip) return;

  const diff = e.clientX - startX;

  activeChip.classList.remove("dragging");

  if (diff > 60) {

    setStatementState(activeChip, "true");

  } else if (diff < -60) {

    setStatementState(activeChip, "false");

  } else {

    activeChip.style.transform = "";

  }

  activeChip = null;

});


// ---------- RANK SORTING ----------

export function enableUniversalSorting(listId) {

  const list = document.getElementById(listId);

  if (!list) return;

  let draggedItem = null;

  list.querySelectorAll("li").forEach(item => {

    item.addEventListener("dragstart", () => {

      draggedItem = item;

    });

    item.addEventListener("dragover", (e) => {

      e.preventDefault();

      const after = e.target.closest("li");

      if (!after || after === draggedItem) return;

      list.insertBefore(draggedItem, after);

    });

  });

}

function flattenReviewData(data, prefix = "", out = {}) {
  Object.entries(data || {}).forEach(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      out[path] = value.slice().sort().join("|");
    } else if (value && typeof value === "object") {
      flattenReviewData(value, path, out);
    } else {
      out[path] = String(value ?? "");
    }
  });
  return out;
}

function similarityScore(a, b) {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (keys.size === 0) return 0;
  let same = 0;
  keys.forEach((k) => {
    if ((a[k] ?? "") === (b[k] ?? "")) same += 1;
  });
  return same / keys.size;
}

function isLikelyDuplicate(reviewData) {
  const now = Date.now();
  const key = "maople_last_review";
  const lastRaw = localStorage.getItem(key);
  if (!lastRaw) {
    localStorage.setItem(
      key,
      JSON.stringify({ ts: now, data: flattenReviewData(reviewData) })
    );
    return false;
  }

  try {
    const last = JSON.parse(lastRaw);
    const age = now - (last.ts || 0);
    const current = flattenReviewData(reviewData);
    const score = similarityScore(current, last.data || {});

    if (age < 2 * 60 * 1000 && score >= 0.9) {
      return true;
    }

    localStorage.setItem(
      key,
      JSON.stringify({ ts: now, data: current })
    );
    return false;
  } catch {
    localStorage.setItem(
      key,
      JSON.stringify({ ts: now, data: flattenReviewData(reviewData) })
    );
    return false;
  }
}

function renderReviewSummary(reviewData) {
  const list = document.getElementById("reviewSummaryList");
  if (!list) return;

  const highlights = reviewData.positives?.highlights || [];
  const items = [];

  if (highlights.includes("visual")) items.push("🌿 Calm atmosphere");
  if (highlights.includes("easy-find") || highlights.includes("easy-movement")) {
    items.push("🧭 Easy to navigate");
  }
  if (highlights.includes("quiet-spots")) items.push("🪑 Has quieter seating");
  if (items.length === 0) items.push("✨ Thoughtful review added");

  list.innerHTML = `
    <ul>
      ${items.map(i => `<li>${i}</li>`).join("")}
    </ul>
  `;
}

function setPlaceInfoEnabled(enabled) {
  const nameInput = document.getElementById("placeName");
  const categorySelect = document.getElementById("placeCategory");

  if (nameInput) {
    nameInput.disabled = !enabled;
    nameInput.required = !!enabled;
  }

  if (categorySelect) {
    categorySelect.disabled = !enabled;
    categorySelect.required = !!enabled;
  }
}
