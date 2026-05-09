import { state } from "./state.js";
import { submitPlaceToFirestore } from "./places.js";
import { refreshApp } from "./app.js";
import { clearDraftMarker } from "./map.js";
import { closeSidePanel } from "./panel.js";
import { computeDimensionScores } from "./reviews.js";
import { buildReviewRecordForStorage } from "./review-compat.js";

import {
  getMultiSelect,
  getRadioValue
} from "./utils.js";


// ---------- INIT FORM ----------

export function initForm() {

  const form = document.getElementById("placeForm");

  if (!form) return;

  form.addEventListener("submit", handleSubmit);
  form.addEventListener("change", enforceReviewCheckboxRules);
  ensureReviewProgressUI();
  updateReviewProgress();

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

  const responses = {
    visit: {
      timeOfDay: getRadioValue("visitTime"),
      companions: getMultiSelect("visitCompanions"),
      busyLevel: getRadioValue("visitBusyLevel")
    },
    arriving: {
      firstEntry: getRadioValue("arrivingEntryExperience"),
      groundCondition: getRadioValue("arrivingGroundCondition"),
      entryBarriers: getMultiSelect("arrivingEntryBarriers")
    },
    movingAround: {
      flowFeel: getRadioValue("movingFlowFeel"),
      slowFactors: getMultiSelect("movingSlowFactors"),
      gettingToThings: getRadioValue("movingGettingToThings"),
      harderFactors: getMultiSelect("movingHarderFactors"),
      observedConditions: getMultiSelect("movingObservedConditions")
    },
    levelsFacilities: {
      interLevelAccess: getMultiSelect("levelsInterLevelAccess"),
      rampFeel: hasRampBetweenLevelsSelected()
        ? getRadioValue("levelsRampFeel")
        : null,
      helpfulFeatures: getMultiSelect("levelsHelpfulFeatures"),
      availableFacilities: getMultiSelect("levelsHelpfulFeatures")
    },
    findingYourWay: {
      unsureLevel: getRadioValue("wayfindingUnsureLevel"),
      confusingFactors: getMultiSelect("wayfindingConfusingFactors"),
      signsClarity: getRadioValue("wayfindingSignsClarity"),
      hardToUnderstandFactors: getMultiSelect("wayfindingHardFactors")
    },
    howItFelt: {
      comfortImpact: getRadioValue("environmentComfortImpact"),
      discomfortFactors: getMultiSelect("environmentDiscomfortFactors"),
      offGuardLevel: getRadioValue("environmentOffGuardLevel"),
      offGuardFactors: getMultiSelect("environmentOffGuardFactors")
    },
    takingABreak: {
      calmSpotEase: getRadioValue("takingCalmSpotEase"),
      calmAreaHardFactors: getMultiSelect("takingCalmAreaHardFactors"),
      sitRestAvailability: getRadioValue("takingSitRestAvailability"),
      longStayManageability: getRadioValue("takingLongStayManageability"),
      longStayDifficultFactors: getMultiSelect("takingLongStayDifficultFactors")
    },
    feelingSafe: {
      openVisible: getRadioValue("safetyOpenVisible"),
      hiddenAreas: getRadioValue("safetyHiddenAreas"),
      getHelpEase: getRadioValue("safetyGetHelpEase")
    },
    whoItMayWorkFor: {
      comfortableFor: getMultiSelect("whoComfortableFor"),
      difficultFor: shouldAskWhoDifficultQuestion()
        ? getMultiSelect("whoDifficultFor")
        : []
    },
    positives: {
      highlights: getMultiSelect("positiveHighlights"),
      note: document.getElementById("positiveNote")?.value || ""
    }
  };

  const reviewData = buildReviewRecordForStorage({
    base: {
      id: "review_" + Date.now(),
      userId: state.currentUserId,
      createdAt: new Date().toISOString(),
      profile: {
        id: activeProfile?.profile_id || null,
        name: activeProfile?.name || "Unspecified"
      }
    },
    responses
  });

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
    showStep(36);

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

function ensureReviewProgressUI() {
  const form = document.getElementById("placeForm");
  if (!form) return;

  form.querySelectorAll(".form-nav").forEach((nav) => {
    if (nav.querySelector(".review-progress-inline")) return;

    const progress = document.createElement("div");
    progress.className = "review-progress-inline hidden";
    progress.innerHTML = `
      <div class="review-progress-track">
        <div class="review-progress-fill"></div>
      </div>
    `;
    nav.appendChild(progress);
  });
}

function getStepIndexBySelector(selector) {
  const el = document.querySelector(selector);
  const section = el?.closest(".form-step");
  if (!section) return null;

  const value = Number(section.dataset.step);
  return Number.isFinite(value) ? value : null;
}

function getOrderedStepIndices() {
  return [...document.querySelectorAll(".form-step")]
    .map((step) => Number(step.dataset.step))
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
}

function getSubmitStepIndex() {
  return getStepIndexBySelector('#placeForm button[type="submit"]');
}

function getFirstQuestionStepIndex() {
  const introStep = getStepIndexBySelector("#placeForm .start-review-btn");
  const submitStep = getSubmitStepIndex();
  if (introStep === null || submitStep === null) return 1;

  const ordered = getOrderedStepIndices().filter(
    (stepIndex) => stepIndex > introStep && stepIndex <= submitStep
  );
  return ordered[0] ?? 1;
}

function getReviewStartStepIndex() {
  if (state.editingPlaceId) {
    const editStart = 2;
    if (document.querySelector(`.form-step[data-step="${editStart}"]`)) {
      return editStart;
    }
  }
  return getFirstQuestionStepIndex();
}

function updateReviewProgress() {
  const startStep = getReviewStartStepIndex();
  const submitStep = getSubmitStepIndex();
  if (submitStep === null) return;

  const reviewStepOrder = getOrderedStepIndices().filter(
    (stepIndex) => stepIndex >= startStep && stepIndex <= submitStep
  );
  if (!reviewStepOrder.length) return;

  const isProgressVisible =
    currentStep >= startStep && currentStep <= submitStep;
  const currentIndex = reviewStepOrder.indexOf(currentStep);
  const denominator = Math.max(reviewStepOrder.length - 1, 1);
  const ratio = currentIndex < 0 ? 0 : currentIndex / denominator;
  const width = `${Math.max(0, Math.min(1, ratio)) * 100}%`;

  document.querySelectorAll(".review-progress-inline").forEach((progressEl) => {
    progressEl.classList.toggle("hidden", !isProgressVisible);
    const fill = progressEl.querySelector(".review-progress-fill");
    if (fill) {
      fill.style.width = width;
    }
  });
}

export function showStep(index) {

  if (state.editingPlaceId && index === 1) {
    index = 2;
  }

  steps.forEach(step => step.classList.remove("active"));

  steps[index]?.classList.add("active");

  currentStep = index;

  setPlaceInfoEnabled(!state.editingPlaceId);
  updateReviewProgress();
}

export function nextStep() {
  let next = currentStep + 1;

  if (currentStep === 8 && isMovingFlowSmooth()) {
    clearCheckboxGroup("movingSlowFactors");
    next = 10;
  }

  if (currentStep === 10 && isReachingThingsEasy()) {
    clearCheckboxGroup("movingHarderFactors");
    next = 12;
  }

  if (currentStep === 13 && !hasRampBetweenLevelsSelected()) {
    clearRadioGroup("levelsRampFeel");
    next = 15;
  }

  if (currentStep === 16 && isWayfindingUnsureNo()) {
    clearCheckboxGroup("wayfindingConfusingFactors");
    next = 18;
  }

  if (currentStep === 18 && isWayfindingSignsVeryClear()) {
    clearCheckboxGroup("wayfindingHardFactors");
    next = 20;
  }

  if (currentStep === 20 && isEnvironmentComfortImpactNo()) {
    clearCheckboxGroup("environmentDiscomfortFactors");
    next = 22;
  }

  if (currentStep === 22 && isEnvironmentOffGuardNo()) {
    clearCheckboxGroup("environmentOffGuardFactors");
    next = 24;
  }

  if (currentStep === 24 && isCalmSpotEasyYes()) {
    clearCheckboxGroup("takingCalmAreaHardFactors");
    next = 26;
  }

  if (currentStep === 27 && isLongStayComfortable()) {
    clearCheckboxGroup("takingLongStayDifficultFactors");
    next = 29;
  }

  if (currentStep === 32 && !shouldAskWhoDifficultQuestion()) {
    clearCheckboxGroup("whoDifficultFor");
    next = 34;
  }

  showStep(next);

}

export function prevStep() {

  if (state.editingPlaceId && currentStep === 2) {
    showStep(0);
    return;
  }
  let prev = currentStep - 1;

  if (currentStep === 10 && isMovingFlowSmooth()) {
    prev = 8;
  }

  if (currentStep === 12 && isReachingThingsEasy()) {
    prev = 10;
  }

  if (currentStep === 15 && !hasRampBetweenLevelsSelected()) {
    prev = 13;
  }

  if (currentStep === 18 && isWayfindingUnsureNo()) {
    prev = 16;
  }

  if (currentStep === 20 && isWayfindingSignsVeryClear()) {
    prev = 18;
  }

  if (currentStep === 22 && isEnvironmentComfortImpactNo()) {
    prev = 20;
  }

  if (currentStep === 24 && isEnvironmentOffGuardNo()) {
    prev = 22;
  }

  if (currentStep === 26 && isCalmSpotEasyYes()) {
    prev = 24;
  }

  if (currentStep === 29 && isLongStayComfortable()) {
    prev = 27;
  }

  if (currentStep === 34 && !shouldAskWhoDifficultQuestion()) {
    prev = 32;
  }

  showStep(prev);

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

function enforceReviewCheckboxRules(e) {
  const target = e.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (target.type !== "checkbox") return;

  const noneOptionByGroup = {
    arrivingEntryBarriers: "nope-all-good",
    movingSlowFactors: "nothing-easy",
    movingObservedConditions: "none",
    levelsInterLevelAccess: "no-level-changes",
    levelsHelpfulFeatures: "none-available"
  };

  const maxByGroup = {
    visitCompanions: 2,
    movingSlowFactors: 2,
    positiveHighlights: 2
  };

  const noneValue = noneOptionByGroup[target.name];
  if (noneValue) {
    const allInGroup = document.querySelectorAll(
      `input[name="${target.name}"]`
    );

    if (target.value === noneValue && target.checked) {
      allInGroup.forEach((el) => {
        if (el !== target) el.checked = false;
      });
    }

    if (target.value !== noneValue && target.checked) {
      const noneEl = document.querySelector(
        `input[name="${target.name}"][value="${noneValue}"]`
      );
      if (noneEl) noneEl.checked = false;
    }
  }

  const max = maxByGroup[target.name];
  if (!max) return;

  const checked = document.querySelectorAll(
    `input[name="${target.name}"]:checked`
  );
  if (checked.length <= max) return;

  target.checked = false;
  alert(`Pick up to ${max} options.`);
}

function clearCheckboxGroup(name) {
  document
    .querySelectorAll(`input[name="${name}"]`)
    .forEach((el) => {
      el.checked = false;
    });
}

function clearRadioGroup(name) {
  document
    .querySelectorAll(`input[name="${name}"]`)
    .forEach((el) => {
      el.checked = false;
    });
}

function isMovingFlowSmooth() {
  return getRadioValue("movingFlowFeel") === "smooth-all-the-way";
}

function isReachingThingsEasy() {
  return getRadioValue("movingGettingToThings") === "easy-without-thinking";
}

function hasRampBetweenLevelsSelected() {
  return getMultiSelect("levelsInterLevelAccess").includes("ramp");
}

function isWayfindingUnsureNo() {
  return getRadioValue("wayfindingUnsureLevel") === "no";
}

function isWayfindingSignsVeryClear() {
  return getRadioValue("wayfindingSignsClarity") === "very-clear";
}

function isEnvironmentComfortImpactNo() {
  return getRadioValue("environmentComfortImpact") === "no";
}

function isEnvironmentOffGuardNo() {
  return getRadioValue("environmentOffGuardLevel") === "no";
}

function isCalmSpotEasyYes() {
  return getRadioValue("takingCalmSpotEase") === "yes";
}

function isLongStayComfortable() {
  return getRadioValue("takingLongStayManageability") === "comfortable-longer-stays";
}

function shouldAskWhoDifficultQuestion() {
  const comfortableCount = getMultiSelect("whoComfortableFor").length;
  return comfortableCount <= 1 || hasLowAccessibilitySignal();
}

function hasLowAccessibilitySignal() {
  const arrivingEntry = getRadioValue("arrivingEntryExperience");
  if (arrivingEntry === "stairs-steep-no-ramp" || arrivingEntry === "several-steps") {
    return true;
  }

  const interLevel = getMultiSelect("levelsInterLevelAccess");
  const hasSupportiveInterLevelOption =
    interLevel.includes("ramp") || interLevel.includes("lift-elevator");
  if (interLevel.includes("stairs") && !hasSupportiveInterLevelOption) {
    return true;
  }

  const helpfulFeatures = getMultiSelect("levelsHelpfulFeatures");
  if (helpfulFeatures.includes("none-available")) {
    return true;
  }

  const longStay = getRadioValue("takingLongStayManageability");
  if (longStay === "difficult-long") {
    return true;
  }

  const helpEase = getRadioValue("safetyGetHelpEase");
  if (helpEase === "no") {
    return true;
  }

  return false;
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
