import { state } from "./state.js";
import { renderPlaces } from "./markers.js";
import { DIMENSIONS, computePlaceDimensions, computePlaceDimensionsFromAggregates } from "./reviews.js";

export const PROFILE_OPTIONS = [
  "Neurodivergent",
  "Mobility",
  "Vision",
  "Hearing",
  "Sensory"
];

const QUICK_FILTERS = [
  {
    id: "work-study",
    label: "💻 Work / Study",
    preset: { calmness: 4.6, quietCorners: 4.4, visualCalm: 4.4 },
    hint: [
      { icon: "🔇", text: "quieter spaces" },
      { icon: "🪑", text: "comfortable for longer stays" },
      { icon: "🧠", text: "good for focus" }
    ]
  },
  {
    id: "casual-meetup",
    label: "☕ Casual Meet-Up",
    preset: { calmness: 3.0, visualCalm: 3.0, quietCorners: 3.0 },
    hint: [
      { icon: "💬", text: "conversation-friendly" },
      { icon: "🌤", text: "moderate energy" },
      { icon: "🪑", text: "comfortable seating" }
    ]
  },
  {
    id: "night-out",
    label: "🍻 Night Out",
    preset: { calmness: 1.8, visualCalm: 2.0, quietCorners: 2.0 },
    hint: [
      { icon: "🎶", text: "lively sound" },
      { icon: "✨", text: "visual stimulation" },
      { icon: "🙌", text: "crowd energy" }
    ]
  },
  {
    id: "relax-stay",
    label: "🛋 Relax & Stay",
    preset: { calmness: 4.4, visualCalm: 4.2, quietCorners: 4.2 },
    hint: [
      { icon: "🌿", text: "calmer atmosphere" },
      { icon: "🪑", text: "comfortable seating" },
      { icon: "🤍", text: "quiet corners" }
    ]
  },
  {
    id: "wheelchair",
    label: "♿ Wheelchair / Stroller Access",
    preset: { accessibility: 4.6, spaciousness: 4.2, navigationEase: 4.2 },
    hint: [
      { icon: "♿", text: "low barriers" },
      { icon: "↔️", text: "spacious circulation" },
      { icon: "🧭", text: "easy to navigate" }
    ]
  },
  {
    id: "sensory-friendly",
    label: "🌿 Sensory-Friendly",
    preset: { calmness: 4.6, visualCalm: 4.6, quietCorners: 4.2 },
    hint: [
      { icon: "🔇", text: "quieter spaces" },
      { icon: "🌿", text: "calmer visuals" },
      { icon: "⚡", text: "fewer sudden changes" }
    ]
  },
  {
    id: "quick-stop",
    label: "⚡ Quick Stop",
    preset: { navigationEase: 4.6, spaciousness: 3.6, calmness: 3.0 },
    hint: [
      { icon: "🚪", text: "easy to enter/exit" },
      { icon: "🧭", text: "easy to orient" },
      { icon: "⏱", text: "efficient stop" }
    ]
  },
  {
    id: "easy-convo",
    label: "💬 Easy Conversation",
    preset: { calmness: 4.2, visualCalm: 4.0, quietCorners: 3.6 },
    hint: [
      { icon: "💬", text: "easier to hear each other" },
      { icon: "💡", text: "faces clearly visible" },
      { icon: "👁", text: "open sightlines" }
    ]
  },
  {
    id: "hidden-gems",
    label: "✨ Hidden Gems",
    mode: "custom",
    hint: [
      { icon: "✨", text: "highly rated spaces" },
      { icon: "📍", text: "fewer reviews" },
      { icon: "🔍", text: "worth discovering" }
    ]
  }
];

const PROFILE_PRESETS = {
  "Calm focus": { calmness: 4.5, visualCalm: 4.2, quietCorners: 4.0 },
  "Energetic social": { calmness: 2.0, quietCorners: 2.2 },
  "Quick & clear": { navigationEase: 4.5 },
  "Explore & wander": { navigationEase: 2.4 },
  "Spacious": { spaciousness: 4.4 },
  "Compact": { spaciousness: 2.2 },
  "Visually calm": { visualCalm: 4.5 },
  "Visually stimulating": { visualCalm: 2.2 },
  "Quiet corners": { quietCorners: 4.4 },
  "Open social": { quietCorners: 2.2 },
  "Low barriers": { accessibility: 4.4 },
  "Multi-level": { accessibility: 2.2 }
};

const DEFAULT_FLEX = 1;
const DEFAULT_WEIGHT = 1;
let filterPulseRequested = false;
let groupStepIndex = 0;
let groupDraftMembers = [];
let setDockHeightFn = null;
let setPlaceSheetHeightFn = null;

export function requestFilterPulse() {
  filterPulseRequested = true;
}

export function consumeFilterPulse() {
  const shouldPulse = filterPulseRequested;
  filterPulseRequested = false;
  return shouldPulse;
}

// ---------- FILTER LOGIC ----------

export function extractFilterOptions(places) {

  const tags = new Set();

  places.forEach(place => {

    (place.reviews || []).forEach(review => {

      (review.calmZones?.features || []).forEach(tag => {
        tags.add(tag);
      });

    });

  });

  return {
    tags: Array.from(tags)
  };

}


export function applyFilters(place) {
  return !!place;
}


export function renderFilters(filterData) {

  const container =
    document.getElementById("filter-container");

  const dimControls = DIMENSIONS.map(dim => {
    const current = state.activeFilters.dimensions?.[dim.id] || {};
    const enabled = !!current.enabled;
    const target = current.target ?? 3;
    const flex = current.flex ?? DEFAULT_FLEX;

    return `
      <div class="spectrum-row ${enabled ? "" : "disabled"}" data-dimension-id="${dim.id}">
        <div class="spectrum-header">
          <label class="dimension-toggle">
            <input type="checkbox" class="dimension-enable" ${enabled ? "checked" : ""}>
            <span>${dim.label}</span>
          </label>
          <span class="dimension-range">${dim.left} ↔ ${dim.right}</span>
        </div>
        <div class="spectrum-slider" data-dimension-id="${dim.id}">
          <div class="spectrum-track">
            <div class="spectrum-flex"></div>
            <div class="spectrum-target"></div>
          </div>
          <input type="range" class="spectrum-range target-range" min="1" max="5" step="0.1" value="${target}" ${enabled ? "" : "disabled"}>
          <input type="range" class="spectrum-range flex-range" min="0" max="2" step="0.1" value="${flex}" ${enabled ? "" : "disabled"}>
          <div class="spectrum-labels">
            <span>${dim.left}</span>
            <span>${dim.right}</span>
          </div>
        </div>
      </div>
    `;
  }).join("");

  const companionOptions = getCompanionOptions();
  const activeCompanion = getActiveCompanionValue();
  const groupSummary = getGroupSummaryLabel();
  const groupActive = !!state.groupMode?.active;

  container.innerHTML = `
    <div class="filter-group group-mode">
      <div class="group-mode-header">
        <strong>Group mode</strong>
        <button type="button" class="group-mode-btn" data-group-action="${groupActive ? "edit" : "open"}">
          ${groupActive ? "Edit group" : "Plan with others"}
        </button>
      </div>
      <div class="group-mode-summary">
        ${groupActive ? groupSummary : "Create a group so matches work for everyone."}
      </div>
      ${groupActive ? `
        <button type="button" class="group-mode-exit" data-group-action="exit">Exit group mode</button>
      ` : ""}
    </div>

    <h4>Fine tuning</h4>

    ${companionOptions.length ? `
      <div class="filter-group">
        <strong>Search for</strong>
        <div class="companion-toggle">
          <label>
            <input type="radio" name="searchCompanion" value="me" ${activeCompanion === "me" ? "checked" : ""}>
            Just me
          </label>
          ${companionOptions.map(opt => `
            <label>
              <input type="radio" name="searchCompanion" value="${opt.value}" ${activeCompanion === opt.value ? "checked" : ""}>
              ${opt.label}
            </label>
          `).join("")}
        </div>
      </div>
    ` : ""}

    <div class="filter-group">
      <strong>Needs spectrum</strong>
      ${dimControls}
    </div>
  `;

  syncSpectrumUI();

}


export function noFiltersActive() {

  const dims = state.activeFilters.dimensions || {};
  const anyDims = Object.values(dims).some(cfg => cfg?.enabled);
  const anyQuick = (state.activeFilters.quickFilters || []).length > 0;

  return !anyDims && !anyQuick;

}


export function updateFilters() {

  const nextDims = {};
  document.querySelectorAll(".spectrum-row").forEach((el) => {
    const id = el.dataset.dimensionId;
    const enabled = el.querySelector(".dimension-enable")?.checked || false;
    const target = el.querySelector(".target-range")?.value || 3;
    const flex = el.querySelector(".flex-range")?.value || DEFAULT_FLEX;
    const targetInput = el.querySelector(".target-range");
    const flexInput = el.querySelector(".flex-range");
    if (targetInput) targetInput.disabled = !enabled;
    if (flexInput) flexInput.disabled = !enabled;
    el.classList.toggle("disabled", !enabled);
    const weight = state.activeFilters.dimensions?.[id]?.weight ?? DEFAULT_WEIGHT;
    nextDims[id] = {
      enabled,
      target: Number(target),
      flex: Number(flex),
      weight
    };
  });
  state.activeFilters.dimensions = nextDims;

  syncSpectrumUI();
  requestFilterPulse();
  renderPlaces();

}

function getCompanionOptions() {
  const profiles = state.user?.profiles || [];
  return profiles
    .filter(p => !p.is_self)
    .slice(0, 3)
    .map(p => ({
      value: p.profile_id,
      label: p.name || "Companion"
    }));
}

function formatCompanionLabel(id) {
  const map = {
    child: "With child",
    elderly: "With elderly",
    mobility: "With mobility needs",
    sensory: "With sensory-sensitive",
    hearing: "With hearing-related",
    "service-animal": "With service animal"
  };
  return map[id] || `With ${id.replace(/-/g, " ")}`;
}

function getSelfProfileId() {
  const profiles = state.user?.profiles || [];
  return profiles.find(p => p.is_self)?.profile_id || null;
}

function getActiveCompanionValue() {
  const activeId = state.activeProfileId;
  const profiles = state.user?.profiles || [];
  if (!activeId) return "me";
  const match = profiles.find(p => p.profile_id === activeId);
  if (!match) return "me";
  return match.is_self ? "me" : match.profile_id;
}


// ---------- INITIALIZATION ----------

export function initFilters() {

  const dock = document.getElementById("filterDock");
  initDock(dock);

  const quickContainer = document.getElementById("quickFilters");
  if (quickContainer) {
    let longPressTimer = null;
    let longPressTarget = null;

    quickContainer.addEventListener("pointerdown", (e) => {
      const chip = e.target.closest(".quick-filter-chip");
      if (!chip) return;
      longPressTarget = chip;
      longPressTimer = window.setTimeout(() => {
        const id = longPressTarget?.dataset.filterId;
        if (id) showFilterHint(id, true);
      }, 550);
    });

    quickContainer.addEventListener("pointerup", () => {
      if (longPressTimer) window.clearTimeout(longPressTimer);
      longPressTimer = null;
      longPressTarget = null;
    });

    quickContainer.addEventListener("pointerleave", () => {
      if (longPressTimer) window.clearTimeout(longPressTimer);
      longPressTimer = null;
      longPressTarget = null;
    });

    quickContainer.addEventListener("click", (e) => {
      const groupChip = e.target.closest("[data-group-action]");
      if (groupChip) {
        e.preventDefault();
        e.stopPropagation();
        openGroupModal();
        return;
      }

      const dockChip = e.target.closest("[data-dock-action]");
      if (dockChip) {
        e.preventDefault();
        e.stopPropagation();
        if (setDockHeightFn) setDockHeightFn("expand");
        return;
      }

      const infoBtn = e.target.closest(".chip-info");
      if (infoBtn) {
        e.preventDefault();
        e.stopPropagation();
        showFilterHint(infoBtn.dataset.filterInfo, true);
        return;
      }

      const chip = e.target.closest(".quick-filter-chip");
      if (!chip) return;
      const id = chip.dataset.filterId;
      const active = new Set(state.activeFilters.quickFilters || []);
      if (active.has(id)) {
        active.delete(id);
        chip.classList.remove("active");
      } else {
        active.add(id);
        chip.classList.add("active");
        if (!hasHintBeenShown(id)) {
          showFilterHint(id, false);
          markHintShown(id);
        }
      }
      state.activeFilters.quickFilters = Array.from(active);
      applyQuickFiltersToDimensions();
      renderFilters(extractFilterOptions(state.places || []));
      updateFilters();
    });
  }

  document.addEventListener("change", (e) => {

    if (
      e.target.classList.contains("dimension-enable")
    ) {
      updateFilters();
    }

    if (e.target.name === "searchCompanion") {
      const selfId = getSelfProfileId();
      const nextId = e.target.value === "me" ? selfId : e.target.value;
      if (nextId) {
        state.activeProfileId = nextId;
        import("./profile.js").then(({ setActiveProfile }) => {
          if (setActiveProfile) setActiveProfile(nextId);
          else {
            requestFilterPulse();
            renderPlaces();
          }
        });
      } else {
        requestFilterPulse();
        renderPlaces();
      }
    }

  });

  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-group-action]");
    if (!btn) return;
    const action = btn.dataset.groupAction;
    if (action === "open" || action === "edit") {
      openGroupModal();
    } else if (action === "exit") {
      clearGroupMode();
    }
  });

  document.addEventListener("input", (e) => {
    if (
      e.target.classList.contains("target-range") ||
      e.target.classList.contains("flex-range")
    ) {
      const wrapper = e.target.closest(".spectrum-slider");
      if (wrapper) syncSpectrumUI(wrapper);
      updateFilters();
    }
  });

}

export function renderProfilePicker(options) {
  const container = document.getElementById("profileOptions");
  if (!container) return;

  const allOptions = Array.from(
    new Set([...(options || []), ...PROFILE_OPTIONS, ...Object.keys(PROFILE_PRESETS)])
  );

  container.innerHTML = `
    <label class="profile-choice">
      <input type="radio" name="profileChoice" value="">
      None
    </label>
    ${allOptions.map(p => `
      <label class="profile-choice">
        <input type="radio" name="profileChoice" value="${p}"
          ${state.userProfile === p ? "checked" : ""}>
        ${p}
      </label>
    `).join("")}
  `;
}

export function initProfilePicker() {
  document.addEventListener("change", (e) => {
    if (e.target?.name !== "profileChoice") return;

    const value = e.target.value || null;
    state.userProfile = value;

    state.activeFilters.profiles = value ? [value] : [];

    if (value && PROFILE_PRESETS[value]) {
      const preset = PROFILE_PRESETS[value];
      const dimState = {};
      const presetWeights = preset.weights || {};
      DIMENSIONS.forEach(dim => {
        if (preset[dim.id] !== undefined) {
          dimState[dim.id] = {
            enabled: true,
            target: preset[dim.id],
            flex: DEFAULT_FLEX,
            weight: presetWeights[dim.id] ?? DEFAULT_WEIGHT
          };
        } else {
          dimState[dim.id] = {
            enabled: false,
            target: 3,
            flex: DEFAULT_FLEX,
            weight: presetWeights[dim.id] ?? DEFAULT_WEIGHT
          };
        }
      });
      state.activeFilters.dimensions = dimState;
      state.activeFilters.quickFilters = [];
      renderFilters(extractFilterOptions(state.places || []));
    }

    document
      .querySelectorAll(".profile-filter")
      .forEach(cb => {
        cb.checked = value ? cb.value === value : false;
      });

    requestFilterPulse();
    renderPlaces();
  });
}

export function renderQuickFilters() {
  const container = document.getElementById("quickFilters");
  if (!container) return;

  const active = new Set(state.activeFilters.quickFilters || []);

  container.innerHTML = `
    <button type="button"
      class="quick-filter-chip group-filter-chip"
      data-group-action="open">
      <span class="chip-label">Plan with others</span>
    </button>
    <button type="button"
      class="quick-filter-chip more-filter-chip"
      data-dock-action="expand">
      <span class="chip-label">More filters</span>
    </button>
    ${QUICK_FILTERS.map(filter => `
      <button type="button"
        class="quick-filter-chip ${active.has(filter.id) ? "active" : ""}"
        data-filter-id="${filter.id}">
        <span class="chip-label">${filter.label}</span>
        <span class="chip-info" role="button" aria-label="Filter info" data-filter-info="${filter.id}">ⓘ</span>
      </button>
    `).join("")}
  `;
}

function applyQuickFiltersToDimensions() {
  const active = new Set(state.activeFilters.quickFilters || []);
  if (active.size === 0) return;

  const selected = QUICK_FILTERS.filter(f => active.has(f.id) && f.preset);
  const nextDims = { ...(state.activeFilters.dimensions || {}) };

  DIMENSIONS.forEach(dim => {
    const values = selected
      .map(f => f.preset?.[dim.id])
      .filter(v => v !== undefined);
    if (!values.length) return;

    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    nextDims[dim.id] = {
      enabled: true,
      target: Number(avg.toFixed(2)),
      flex: DEFAULT_FLEX
    };
  });

  state.activeFilters.dimensions = nextDims;
}

function getUserPreferences() {
  const dims = state.activeFilters.dimensions || {};
  const enabled = [];
  const targets = {};
  const flexes = {};
  const weights = {};

  DIMENSIONS.forEach(dim => {
    const cfg = dims[dim.id];
    if (cfg?.enabled) {
      enabled.push(dim.id);
      targets[dim.id] = Number(cfg.target ?? 3);
      flexes[dim.id] = Number(cfg.flex ?? DEFAULT_FLEX);
      weights[dim.id] = Number(cfg.weight ?? dim.weight ?? DEFAULT_WEIGHT);
    }
  });

  return { enabled, targets, flexes, weights };
}

function computeMatchScore(placeProfile, prefs) {
  let score = 0;
  let maxScore = 0;
  prefs.enabled.forEach((id) => {
    const value = placeProfile[id];
    if (value === null || value === undefined || Number.isNaN(value)) {
      const weight = prefs.weights?.[id] ?? DIMENSIONS.find(d => d.id === id)?.weight ?? DEFAULT_WEIGHT;
      maxScore += 4 * weight;
      return;
    }
    const target = prefs.targets[id];
    const flex = prefs.flexes[id] ?? DEFAULT_FLEX;
    const diff = Math.abs(value - target);
    const weight = prefs.weights?.[id] ?? DIMENSIONS.find(d => d.id === id)?.weight ?? DEFAULT_WEIGHT;
    score += Math.max(0, diff - flex) * weight;
    maxScore += 4 * weight;
  });
  return { score, maxScore: maxScore || 1 };
}

function applyQuickConstraints(place) {
  const active = new Set(state.activeFilters.quickFilters || []);
  if (!active.size) return true;

  const hasHiddenGems = active.has("hidden-gems");
  if (!hasHiddenGems) return true;

  return computeHiddenGem(place);
}

function isHiddenGemsActive() {
  return (state.activeFilters.quickFilters || []).includes("hidden-gems");
}

function computeOverallScore(profile) {
  const values = DIMENSIONS
    .map(dim => profile?.[dim.id])
    .filter(v => v !== null && v !== undefined && !Number.isNaN(v));
  if (!values.length) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  return sum / values.length;
}

function computeHiddenGem(place) {
  const reviews = place?.reviews || [];
  if (!reviews.length) return false;
  const profile = computePlaceDimensions(reviews);
  const overall = computeOverallScore(profile);
  const reviewThreshold = 3;
  const scoreThreshold = 3.7;
  return reviews.length <= reviewThreshold && overall >= scoreThreshold;
}

export function getActiveQuickFilterLabels() {
  const active = new Set(state.activeFilters.quickFilters || []);
  return QUICK_FILTERS
    .filter(filter => active.has(filter.id))
    .map(filter => filter.label);
}

export function hasActiveFilters() {
  const dims = state.activeFilters.dimensions || {};
  const anyDims = Object.values(dims).some(cfg => cfg?.enabled);
  const anyQuick = (state.activeFilters.quickFilters || []).length > 0;
  return anyDims || anyQuick;
}

export function computePlaceScoring(place, mapCenter) {
  const reviews = place?.reviews || [];
  const profile = (place?.dimensionSums && place?.dimensionCounts)
    ? computePlaceDimensionsFromAggregates(place.dimensionSums, place.dimensionCounts)
    : computePlaceDimensions(reviews);

  let envMatch = 0.5;
  let groupSummary = null;

  if (state.groupMode?.active) {
    groupSummary = computeGroupMatch(profile);
    envMatch = groupSummary?.finalScore ?? 0.5;
  } else {
    const prefs = getUserPreferences();
    const { score, maxScore } = computeMatchScore(profile, prefs);
    envMatch = prefs.enabled.length > 0
      ? 1 - Math.min(1, score / maxScore)
      : 0.5;
  }

  const reviewCount = place?.reviewCount ?? reviews.length;
  const confidence = computeReviewConfidence(reviewCount);
  const distance = computeDistanceScore(place?.location, mapCenter);

  const finalScore =
    (0.55 * envMatch) +
    (0.25 * confidence) +
    (0.20 * distance);

  const hiddenGem = computeHiddenGem(place);

  return {
    envMatch,
    confidence,
    distance,
    finalScore,
    matchStrength: finalScore,
    hiddenGem,
    profile,
    reviewCount,
    groupSummary
  };
}

export function getGroupMatchSummary(placeProfile) {
  if (!state.groupMode?.active) return null;
  return computeGroupMatch(placeProfile);
}

export function getGroupMatchLabel(summary) {
  if (!summary) return "";
  if (summary.minScore >= 0.75) return "Great fit for everyone";
  if (summary.minScore >= 0.55) return "Good compromise";
  return "May not work for everyone";
}

export function getGroupReasons(placeProfile) {
  if (!placeProfile) return [];
  const reasons = [];
  if (placeProfile.navigationEase >= 4) reasons.push("easy to move around");
  if (placeProfile.calmness >= 4) reasons.push("not too noisy");
  if (placeProfile.visualCalm >= 4) reasons.push("calmer visual environment");
  if (placeProfile.spaciousness >= 4) reasons.push("more spacious layout");
  if (placeProfile.accessibility >= 4) reasons.push("low physical barriers");
  return reasons.slice(0, 3);
}

function computeGroupMatch(placeProfile) {
  const profiles = getGroupProfiles();
  if (!profiles.length) {
    return {
      finalScore: 0.5,
      minScore: 0.5,
      avgScore: 0.5,
      fitCount: 0,
      size: 0
    };
  }

  const scores = profiles.map(profile => computeProfileMatch(profile, placeProfile));
  const minScore = Math.min(...scores);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const finalScore = 0.6 * minScore + 0.4 * avgScore;
  const fitCount = scores.filter(score => score >= 0.65).length;

  return {
    finalScore,
    minScore,
    avgScore,
    fitCount,
    size: scores.length
  };
}

function computeProfileMatch(profile, placeProfile) {
  const prefs = buildProfilePrefs(profile);
  const keys = Object.keys(prefs);
  if (!keys.length) return 0.5;

  let total = 0;
  let weightSum = 0;

  keys.forEach((key) => {
    const pref = prefs[key];
    const placeVal = placeProfile?.[key];
    if (placeVal === null || placeVal === undefined || Number.isNaN(placeVal)) return;
    const diff = Math.abs(placeVal - pref.target);
    const match = 1 - Math.min(1, diff / 4);
    const weight = pref.weight ?? 1;
    total += match * weight;
    weightSum += weight;
  });

  if (!weightSum) return 0.5;
  return total / weightSum;
}

function buildProfilePrefs(profile) {
  const needs = profile?.needs || {};
  const prefs = {};
  const targetFrom = (value) => 6 - value;

  if (needs.noise?.enabled) {
    prefs.calmness = { target: targetFrom(needs.noise.value), weight: 2 };
  }
  if (needs.visual?.enabled) {
    prefs.visualCalm = { target: targetFrom(needs.visual.value), weight: 2 };
  }
  if (needs.movement?.enabled) {
    prefs.navigationEase = { target: targetFrom(needs.movement.value), weight: 2 };
  }
  if (needs.effort?.enabled) {
    const target = targetFrom(needs.effort.value);
    prefs.accessibility = { target, weight: 2 };
    prefs.spaciousness = { target, weight: 1.5 };
  }
  if (needs.quiet?.enabled) {
    prefs.quietCorners = { target: targetFrom(needs.quiet.value), weight: 2 };
  }

  return prefs;
}

export function getMatchReasons(summary, activeLabels) {
  const reasons = [];
  if (!summary || !summary.placeProfile) return reasons;

  const profile = summary.placeProfile;
  const soundOverall = summary.sound?.overallAvg;
  const lightingOverall = summary.lighting?.overallAvg;

  if (profile.calmness >= 4) reasons.push("quiet environment");
  if (profile.quietCorners >= 3.5) reasons.push("quiet corners");
  if (profile.visualCalm >= 4) reasons.push("calmer visuals");
  if (profile.navigationEase >= 4) reasons.push("easy to navigate");
  if (profile.spaciousness >= 4) reasons.push("spacious circulation");
  if (profile.accessibility >= 4) reasons.push("accessible entrances");
  if (soundOverall !== null && soundOverall !== undefined && soundOverall <= 2.5) {
    reasons.push("lower background noise");
  }
  if (lightingOverall !== null && lightingOverall !== undefined && lightingOverall >= 3.5) {
    reasons.push("faces clearly visible");
  }

  if (!activeLabels.length) return reasons.slice(0, 3);

  return reasons.slice(0, 3);
}

function computeReviewConfidence(count) {
  if (count <= 0) return 0;
  const cap = 20;
  return Math.min(1, Math.log10(count + 1) / Math.log10(cap));
}

function computeDistanceScore(location, mapCenter) {
  if (!location || !mapCenter) return 0.5;
  const lng = location.lng ?? location.longitude ?? location.lon ?? location._long ?? location._longitude;
  const lat = location.lat ?? location.latitude ?? location._lat ?? location._latitude;
  if (typeof lng !== "number" || typeof lat !== "number") return 0.5;
  const distKm = haversineKm(lat, lng, mapCenter.lat, mapCenter.lng);
  const maxKm = 10;
  return Math.max(0, 1 - distKm / maxKm);
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
}

function initDock(dock) {
  if (!dock) return;

  const root = document.documentElement;
  const collapsed = 56;
  const getExpanded = () => Math.min(420, Math.round(window.innerHeight * 0.6));
  const getMid = () => Math.min(260, Math.round(window.innerHeight * 0.35));
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

  let expanded = getExpanded();
  let mid = getMid();
  let startY = 0;
  let startH = collapsed;
  let dragging = false;

  const setHeight = (h) => {
    const clamped = Math.max(collapsed, Math.min(expanded, h));
    root.style.setProperty("--dock-height", `${clamped}px`);
    dock.classList.toggle("expanded", clamped > collapsed + 20);
    document.body.classList.toggle("dock-expanded", clamped > collapsed + 20);
  };

  setDockHeightFn = (mode) => {
    if (mode === "expand") {
      setHeight(isMobile() ? mid : expanded);
    } else if (mode === "collapse") {
      setHeight(collapsed);
    }
  };

  setHeight(collapsed);

  const startDrag = (e) => {
    if (e.target.closest(".quick-filter-chip")) return;
    if (e.target.closest(".quick-filters")) return;
    dragging = true;
    startY = e.clientY;
    startH = parseFloat(getComputedStyle(dock).height) || collapsed;
    dock.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e) => {
    if (!dragging) return;
    const delta = startY - e.clientY;
    setHeight(startH + delta);
  };

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    const current = parseFloat(getComputedStyle(dock).height) || collapsed;
    if (isMobile()) {
      const snapPoints = [collapsed, mid, expanded];
      const nearest = snapPoints.reduce((prev, val) =>
        Math.abs(val - current) < Math.abs(prev - current) ? val : prev
      );
      setHeight(nearest);
      adjustPanelForDock(nearest);
    } else {
      const threshold = collapsed + (expanded - collapsed) * 0.35;
      const next = current > threshold ? expanded : collapsed;
      setHeight(next);
      adjustPanelForDock(next);
    }
    dock.releasePointerCapture?.(e.pointerId);
  };

  dock.addEventListener("pointerdown", startDrag);
  dock.addEventListener("pointermove", onMove);
  dock.addEventListener("pointerup", endDrag);
  dock.addEventListener("pointercancel", endDrag);

  const grabber = dock.querySelector(".dock-grabber");
  if (grabber) {
    grabber.addEventListener("click", () => {
      const current = parseFloat(getComputedStyle(dock).height) || collapsed;
      if (isMobile()) {
        const snapPoints = [collapsed, mid, expanded];
        const index = snapPoints.findIndex(val => Math.abs(val - current) < 2);
        const next = snapPoints[(index + 1) % snapPoints.length] || collapsed;
        setHeight(next);
        adjustPanelForDock(next);
      } else {
        setHeight(current > collapsed + 20 ? collapsed : expanded);
      }
    });
  }

  dock.addEventListener("dblclick", () => {
    const current = parseFloat(getComputedStyle(dock).height) || collapsed;
    if (isMobile()) {
      const snapPoints = [collapsed, mid, expanded];
      const index = snapPoints.findIndex(val => Math.abs(val - current) < 2);
      const next = snapPoints[(index + 1) % snapPoints.length] || collapsed;
      setHeight(next);
      adjustPanelForDock(next);
    } else {
      setHeight(current > collapsed + 20 ? collapsed : expanded);
    }
  });

  window.addEventListener("resize", () => {
    expanded = getExpanded();
    mid = getMid();
    const current = parseFloat(getComputedStyle(dock).height) || collapsed;
    setHeight(Math.min(current, expanded));
    adjustPanelForDock(current);
  });
}

function adjustPanelForDock(dockHeight) {
  const panel = document.getElementById("sidePanel");
  if (!panel) return;
  if (window.matchMedia("(max-width: 768px)").matches) {
    panel.style.bottom = `calc(${dockHeight}px + env(safe-area-inset-bottom))`;
  } else {
    panel.style.bottom = "";
  }
}

// ---------- PLACE SHEET (MOBILE) ----------

export function initPlaceSheet() {
  const panel = document.getElementById("sidePanel");
  const handle = panel?.querySelector(".panel-handle");
  if (!panel || !handle) return;

  const root = document.documentElement;
  const collapsed = () => Math.round(window.innerHeight * 0.32);
  const mid = () => Math.round(window.innerHeight * 0.56);
  const expanded = () => Math.round(window.innerHeight * 0.78);
  const isMobile = () => window.matchMedia("(max-width: 768px)").matches;

  let startY = 0;
  let startH = 0;
  let dragging = false;

  const setHeight = (h) => {
    if (!isMobile()) return;
    const clamped = Math.max(collapsed(), Math.min(expanded(), h));
    panel.style.height = `${clamped}px`;
    panel.classList.toggle("compact", clamped <= collapsed() + 4);
  };

  setPlaceSheetHeightFn = (mode) => {
    if (!isMobile()) return;
    if (mode === "collapse") setHeight(collapsed());
    if (mode === "mid") setHeight(mid());
    if (mode === "expand") setHeight(expanded());
  };

  const startDrag = (e) => {
    if (!isMobile()) return;
    dragging = true;
    startY = e.clientY;
    startH = parseFloat(getComputedStyle(panel).height) || collapsed();
    panel.setPointerCapture?.(e.pointerId);
  };

  const onMove = (e) => {
    if (!dragging) return;
    const delta = startY - e.clientY;
    setHeight(startH + delta);
  };

  const endDrag = (e) => {
    if (!dragging) return;
    dragging = false;
    const current = parseFloat(getComputedStyle(panel).height) || collapsed();
    const snapPoints = [collapsed(), mid(), expanded()];
    const nearest = snapPoints.reduce((prev, val) =>
      Math.abs(val - current) < Math.abs(prev - current) ? val : prev
    );
    setHeight(nearest);
    panel.classList.toggle("compact", nearest <= collapsed() + 4);
    panel.releasePointerCapture?.(e.pointerId);
  };

  handle.addEventListener("pointerdown", startDrag);
  panel.addEventListener("pointermove", onMove);
  panel.addEventListener("pointerup", endDrag);
  panel.addEventListener("pointercancel", endDrag);

  handle.addEventListener("click", () => {
    if (!isMobile()) return;
    setHeight(mid());
  });

  window.addEventListener("resize", () => {
    if (!isMobile()) {
      panel.style.height = "";
      return;
    }
    setHeight(Math.min(parseFloat(getComputedStyle(panel).height) || mid(), expanded()));
  });
}

export function collapseDockForMobile() {
  if (setDockHeightFn) setDockHeightFn("collapse");
}

export function collapsePlaceSheet() {
  if (setPlaceSheetHeightFn) setPlaceSheetHeightFn("collapse");
}

export function expandPlaceSheet() {
  if (setPlaceSheetHeightFn) setPlaceSheetHeightFn("mid");
}

function syncSpectrumUI(scope) {
  const sliders = scope
    ? [scope]
    : Array.from(document.querySelectorAll(".spectrum-slider"));

  sliders.forEach((slider) => {
    const targetInput = slider.querySelector(".target-range");
    const flexInput = slider.querySelector(".flex-range");
    if (!targetInput || !flexInput) return;

    const target = Number(targetInput.value || 3);
    const flex = Number(flexInput.value || DEFAULT_FLEX);

    const left = Math.max(1, target - flex);
    const right = Math.min(5, target + flex);

    const toPct = (val) => `${((val - 1) / 4) * 100}%`;

    slider.style.setProperty("--target", toPct(target));
    slider.style.setProperty("--left", toPct(left));
    slider.style.setProperty("--right", toPct(right));
  });
}

// ---------- GROUP MODE ----------

function openGroupModal() {
  const modal = document.getElementById("groupModeModal");
  if (!modal) return;
  groupStepIndex = 0;
  groupDraftMembers = [...(state.groupMode?.memberIds || [])];
  renderGroupStep();
  modal.classList.remove("hidden");

  if (!modal.dataset.bound) {
    modal.dataset.bound = "true";
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeGroupModal();
    });
  }
}

function closeGroupModal() {
  const modal = document.getElementById("groupModeModal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function renderGroupStep() {
  const progress = document.getElementById("groupStepProgress");
  const content = document.getElementById("groupStepContent");
  const nextBtn = document.getElementById("groupNextBtn");
  const backBtn = document.getElementById("groupBackBtn");
  const closeBtn = document.getElementById("groupCloseBtn");

  if (!progress || !content || !nextBtn || !backBtn) return;

  progress.textContent = `Step ${groupStepIndex + 1} of 4`;
  backBtn.disabled = groupStepIndex === 0;
  nextBtn.textContent = groupStepIndex === 3 ? "Apply" : "Next";

  if (closeBtn && !closeBtn.dataset.bound) {
    closeBtn.dataset.bound = "true";
    closeBtn.addEventListener("click", closeGroupModal);
  }

  let html = "";
  if (groupStepIndex === 0) {
    html = renderGroupSelectStep();
  } else if (groupStepIndex === 1) {
    html = renderGroupAddStep();
  } else if (groupStepIndex === 2) {
    html = renderGroupSummaryStep();
  } else {
    html = renderGroupConfirmStep();
  }
  content.innerHTML = html;
  bindGroupStep(content);

  nextBtn.onclick = () => {
    if (groupStepIndex === 0 && groupDraftMembers.length === 0) {
      alert("Please select at least one profile.");
      return;
    }
    if (groupStepIndex === 3) {
      applyGroupMode();
      closeGroupModal();
      return;
    }
    groupStepIndex += 1;
    renderGroupStep();
  };

  backBtn.onclick = () => {
    if (groupStepIndex === 0) return;
    groupStepIndex -= 1;
    renderGroupStep();
  };
}

function renderGroupSelectStep() {
  const profiles = getSelectableProfiles();
  return `
    <h3>Who are you going with?</h3>
    <p class="profile-step-subtitle">Select saved profiles or add new ones.</p>
    <div class="group-select-grid">
      ${profiles.map(profile => `
        <button type="button" class="group-option ${groupDraftMembers.includes(profile.profile_id) ? "selected" : ""}" data-group-member="${profile.profile_id}">
          ${profile.name}
          ${profile.is_self ? "<span class='group-badge'>Me</span>" : ""}
        </button>
      `).join("")}
    </div>
    <div class="group-actions">
      <button type="button" class="profile-secondary-btn" data-group-add-profile>Add new profile</button>
      <button type="button" class="profile-ghost-btn" data-group-invite>Invite via link</button>
    </div>
  `;
}

function renderGroupAddStep() {
  const profiles = getSelectableProfiles();
  const selected = profiles.filter(p => groupDraftMembers.includes(p.profile_id));
  return `
    <h3>Add people</h3>
    <p class="profile-step-subtitle">Confirm who is in this group.</p>
    <div class="group-selected-list">
      ${selected.length ? selected.map(p => `
        <div class="group-selected-item">
          <span>${p.name}</span>
          <span class="group-chip">&#10003;</span>
        </div>
      `).join("") : `<div class="group-empty">Select at least one profile to continue.</div>`}
    </div>
  `;
}

function renderGroupSummaryStep() {
  const summary = computeGroupNeedSummary();
  return `
    <h3>Group summary</h3>
    <p class="profile-step-subtitle">Your group needs:</p>
    <div class="group-summary-card">
      <ul>
        ${summary.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>
  `;
}

function renderGroupConfirmStep() {
  const label = getGroupSummaryLabel(groupDraftMembers);
  return `
    <h3>Show results</h3>
    <p class="profile-step-subtitle">Map will update for this group.</p>
    <div class="group-summary-card">
      ${label}
    </div>
  `;
}

function bindGroupStep(scope) {
  scope.querySelectorAll("[data-group-member]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.groupMember;
      if (!id) return;
      const set = new Set(groupDraftMembers);
      if (set.has(id)) {
        set.delete(id);
        btn.classList.remove("selected");
      } else {
        set.add(id);
        btn.classList.add("selected");
      }
      groupDraftMembers = Array.from(set);
    });
  });

  const addBtn = scope.querySelector("[data-group-add-profile]");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const profileBtn = document.getElementById("profileBtn");
      if (profileBtn) profileBtn.click();
    });
  }

  const inviteBtn = scope.querySelector("[data-group-invite]");
  if (inviteBtn) {
    inviteBtn.addEventListener("click", () => {
      const link = `${location.origin}${location.pathname}?group=invite`;
      navigator.clipboard?.writeText(link);
      alert("Invite link copied.");
    });
  }
}

function getSelectableProfiles() {
  return (state.user?.profiles || []).map(p => ({
    profile_id: p.profile_id,
    name: p.name || "Profile",
    is_self: !!p.is_self
  }));
}

function applyGroupMode() {
  if (!groupDraftMembers.length) return;
  state.groupMode = {
    active: true,
    memberIds: groupDraftMembers.slice(0, 5)
  };
  requestFilterPulse();
  renderPlaces();
}

function clearGroupMode() {
  state.groupMode = {
    active: false,
    memberIds: []
  };
  requestFilterPulse();
  renderPlaces();
  renderFilters(extractFilterOptions(state.places || []));
}

function getGroupSummaryLabel(memberIds = state.groupMode?.memberIds || []) {
  const profiles = state.user?.profiles || [];
  if (!memberIds.length) return "No group selected yet.";
  const names = memberIds
    .map(id => profiles.find(p => p.profile_id === id)?.name)
    .filter(Boolean);
  return `${memberIds.length} people: ${names.join(", ")}`;
}

function computeGroupNeedSummary() {
  const profiles = getGroupProfiles();
  if (!profiles.length) return ["Select at least one profile."];

  const noise = averageNeedsValue(profiles, "noise");
  const movement = averageNeedsValue(profiles, "movement");
  const quiet = averageNeedsValue(profiles, "quiet");

  const summary = [];
  if (movement !== null && movement <= 2.8) summary.push("Needs easy movement");
  if (noise !== null && noise <= 2.6) summary.push("Prefers calmer spaces");
  if (noise !== null && noise > 2.6 && noise < 3.4) summary.push("Moderate noise tolerance");
  if (quiet !== null && quiet <= 2.8) summary.push("Often needs quieter corners");
  if (!summary.length) summary.push("Balanced preferences");
  return summary;
}

function getGroupProfiles() {
  const profiles = state.user?.profiles || [];
  const ids = state.groupMode?.active ? state.groupMode.memberIds : groupDraftMembers;
  return profiles.filter(p => ids.includes(p.profile_id));
}

function averageNeedsValue(profiles, key) {
  const values = profiles
    .map(p => p.needs?.[key])
    .filter(entry => entry?.enabled)
    .map(entry => entry.value);
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

let activeHintTimeout = null;

function showFilterHint(filterId, force = false) {
  const filter = QUICK_FILTERS.find(f => f.id === filterId);
  if (!filter) return;
  if (!force && hasHintBeenShown(filterId)) return;

  const existing = document.querySelector(".filter-hint");
  if (existing) existing.remove();

  const hint = document.createElement("div");
  hint.className = "filter-hint";
  hint.innerHTML = `
    <div class="filter-hint-title">${filter.label}</div>
    <div class="filter-hint-items">
      ${(filter.hint || []).map(item => `
        <div class="filter-hint-item">
          <span class="filter-hint-icon">${item.icon}</span>
          <span>${item.text}</span>
        </div>
      `).join("")}
    </div>
  `;

  document.body.appendChild(hint);
  requestAnimationFrame(() => hint.classList.add("show"));

  if (activeHintTimeout) window.clearTimeout(activeHintTimeout);
  activeHintTimeout = window.setTimeout(() => {
    hint.classList.remove("show");
    setTimeout(() => hint.remove(), 200);
  }, 2000);
}

function hasHintBeenShown(filterId) {
  return localStorage.getItem(`maople_hint_${filterId}`) === "1";
}

function markHintShown(filterId) {
  localStorage.setItem(`maople_hint_${filterId}`, "1");
}
