import { db } from "./firebase.js";
import { aggregateReviews, aggregateReviewsFromSnapshot, generateInsight, DIMENSIONS, sortReviewsForDisplay } from "./reviews.js";
import {
  getActiveQuickFilterLabels,
  getMatchReasons,
  hasActiveFilters,
  getGroupMatchSummary,
  getGroupMatchLabel,
  getGroupReasons
} from "./filters.js";
import { openAddReviewForm, cancelReview } from "./search.js";
import { getMap } from "./map.js";
import { collapseDockForMobile, expandPlaceSheet } from "./filters.js";

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


// ---------- SIDE PANEL UI ----------

let currentPlaceForReview = null;

export async function openSidePanel(place) {

  const panel = document.getElementById("sidePanel");
  const title = document.getElementById("panelTitle");
  const content = document.getElementById("panelContent");
  const tab = document.getElementById("sidePanelTab");
  const tagsEl = document.getElementById("panelTags");

  title.innerText = place.name;
  const compactPreview = panel.querySelector(".panel-compact-preview");
  if (compactPreview) compactPreview.innerHTML = "";
  currentPlaceForReview = place;
  panel.dataset.placeId = place.id;
  panel.dataset.placeName = place.name;

  if (place?.location) {
    const map = getMap();
    const loc = place.location;
    const lng = Number(
      Array.isArray(loc) ? loc[0] : loc.lng ??
      loc.longitude ??
      loc.lon ??
      loc._long ??
      loc._longitude
    );
    const lat = Number(
      Array.isArray(loc) ? loc[1] : loc.lat ??
      loc.latitude ??
      loc._lat ??
      loc._latitude
    );
    if (Number.isFinite(lng) && Number.isFinite(lat)) {
      const doFly = () =>
        map?.flyTo({
          center: [lng, lat],
          zoom: 16,
          duration: 800
        });

      if (map && typeof map.loaded === "function" && !map.loaded()) {
        map.once("load", doFly);
      } else {
        doFly();
      }
    }
  }

  const reviewsRef = collection(db, "places", place.id, "reviews");
  const useSnapshot = place?.reviewCount >= 200;
  const reviewsSnap = useSnapshot
    ? await getDocs(query(reviewsRef, orderBy("createdAt", "desc"), limit(100)))
    : await getDocs(reviewsRef);

  const reviews = [];

  reviewsSnap.forEach(doc => reviews.push(doc.data()));

  const summary = useSnapshot
    ? aggregateReviewsFromSnapshot(place)
    : aggregateReviews(reviews);

  const insight = generateInsight(summary);
  const placeProfile = summary.placeProfile || {};
  const activeFilters = getActiveQuickFilterLabels();
  const reasons = getMatchReasons(summary, activeFilters);
  const groupSummary = getGroupMatchSummary(placeProfile);
  const showFilterNote = hasActiveFilters();
  const lowData = summary.total > 0 && summary.total < 4 && showFilterNote;
  const needsMore = summary.total < 3;
  const orderedReviews = sortReviewsForDisplay(reviews);
  const peopleTags = getPeopleComeHereFor(summary);
  const headerInfo = getHeaderInfo(place, reviews);

  content.innerHTML = `
    <div class="panel-layout">
      <div class="panel-action-area">
        <button id="add-review-btn" class="add-review-btn" data-place-id="${place.id}" data-place-name="${place.name}">Add your experience</button>
      </div>

      <div class="panel-tabs" role="tablist">
        <button class="panel-tab active" data-tab="overview" role="tab" aria-selected="true">Overview</button>
        <button class="panel-tab" data-tab="details" role="tab" aria-selected="false">Details</button>
        <button class="panel-tab" data-tab="reviews" role="tab" aria-selected="false">Reviews</button>
      </div>

      <div class="panel-scroll">
        <section class="panel-tab-panel active" data-tab="overview">
          <p class="insight-text">${insight}</p>

          ${renderPeopleComeHere(peopleTags)}

          ${renderGroupMatch(groupSummary, placeProfile)}

          ${renderFilterMatch(activeFilters, reasons)}

          ${lowData ? `
            <div class="data-warning">
              &#9888; Limited data for these filters - only ${summary.total} reviews so far.
              <button type="button" class="review-prompt-btn" data-add-review data-place-id="${place.id}" data-place-name="${place.name}">Share how this place feels</button>
            </div>
          ` : ""}

          <div class="overview-section">
            <h4>Accessibility Snapshot</h4>
            <div class="snapshot-grid">
              ${renderBar("Calmness", summary.placeProfile?.calmness, 1, 5, "compact")}
              ${renderBar("Navigation", summary.placeProfile?.navigationEase, 1, 5, "compact")}
              ${renderBar("Lighting", summary.lighting?.overallAvg, 1, 5, "compact")}
              ${renderBar("Noise", summary.sound?.overallAvg, 1, 5, "compact")}
            </div>
          </div>
        </section>

        <section class="panel-tab-panel" data-tab="details">
          ${renderDimensionProfile(placeProfile)}
          <div class="details-metrics">
            ${renderBar("Movement", summary.movement?.continuityAvg, 1, 5, "compact")}
            ${renderBar("Wayfinding", summary.wayfinding?.clarityAvg, 1, 5, "compact")}
            ${renderBar("Visual Load", summary.visualLoad?.avg, 1, 5, "compact")}
            ${renderBar("Transitions", summary.transitions?.abruptnessAvg, 1, 5, "compact")}
          </div>
          <div class="details-meta">
            <div class="detail-row">
              <span>Calm areas clearly available</span>
              <span>${summary.calmZones?.clearlyAvailable ?? 0}%</span>
            </div>
          </div>
        </section>

        <section class="panel-tab-panel" data-tab="reviews">
          <p class="reviews-count">${summary.total} reviews</p>
          <div class="panel-reviews">
            ${orderedReviews.map(renderReviewCard).join("")}
          </div>
        </section>
      </div>
    </div>
  `;

  panel.classList.add("active");
  panel.classList.remove("reviewing");
  if (compactPreview) {
    compactPreview.innerHTML = buildCompactPills(place, summary)
      .map(label => `<span class="compact-pill">${label}</span>`)
      .join("");
  }
  collapseDockForMobile();
  expandPlaceSheet();
  if (tab) tab.classList.remove("visible");
  if (tagsEl) {
    tagsEl.innerHTML = renderHeaderInfo(headerInfo);
  }

}


// ---------- REVIEW CARD ----------

export function renderReviewCard(review, index) {
  const tags = collectReviewTags(review);

  return `
    <div class="review-card" data-review-index="${index}">
      <button type="button" class="review-toggle" aria-expanded="false">
        <div>
          <strong>Visitor snapshot</strong>
          ${
            review.profile?.name
              ? `<span class="profile-badge">${review.profile.name}</span>`
              : ""
          }
        </div>
        <span class="review-expand-hint">Tap to expand</span>
      </button>

      <div class="review-summary">
        ${renderBar("Movement", review.movement?.continuity, 1, 5, "mini")}
        ${renderBar("Wayfinding", review.wayfinding?.clarity, 1, 5, "mini")}
        ${renderBar("Visual Load", review.visualLoad?.level, 1, 5, "mini")}
      </div>

      ${tags.length ? renderTags(tags) : ""}

      <div class="review-body collapsed" id="review-${index}">
        <div class="review-section">
          <h5>Movement</h5>
          ${renderBar("Continuity", review.movement?.continuity, 1, 5)}
        </div>

        <div class="review-section">
          <h5>Wayfinding</h5>
          ${renderBar("Clarity", review.wayfinding?.clarity, 1, 5)}
        </div>

        <div class="review-section">
          <h5>Visual Load</h5>
          ${renderBar("Intensity", review.visualLoad?.level, 1, 5)}
        </div>

        <div class="review-section">
          <h5>Transitions</h5>
          ${renderBar("Abruptness", review.transitions?.abruptness, 1, 5)}
        </div>

        ${tags.length ? renderTags(tags) : ""}
      </div>
    </div>
  `;
}


// ---------- PANEL HELPERS ----------

export function renderBar(label, value, min, max, extraClass = "", emptyText = "No data yet") {

  if (value === null || value === undefined || isNaN(value)) {
    return `
      <div class="metric ${extraClass} metric-empty">
        <div class="metric-header">
          <span>${label}</span>
          <span class="metric-empty-text">${emptyText}</span>
        </div>
      </div>
    `;
  }

  const percentage = ((value - min) / (max - min)) * 100;

  let colorClass = "";

  if (percentage >= 75) {
    colorClass = "bar-high";
  } else if (percentage <= 25) {
    colorClass = "bar-low";
  }

  return `
    <div class="metric ${extraClass}">

      <div class="metric-header">

        <span>${label}</span>

        <span>${value.toFixed(1)}</span>

      </div>

      <div class="metric-bar">

        <div class="metric-bar-fill ${colorClass}"
          style="width:${percentage}%">
        </div>

      </div>

    </div>
  `;
}


export function renderTags(tagsArray) {

  if (!tagsArray || tagsArray.length === 0) return "";

  return `
    <div class="tag-container">

      ${tagsArray.map(tag => `
        <span class="tag-chip">${tag}</span>`).join("")}

    </div>
  `;
}

function renderDimensionProfile(profile) {
  const rows = DIMENSIONS.map(dim => {
    const value = profile[dim.id];
    if (value === null || value === undefined || Number.isNaN(value)) {
      return `
        <div class="dimension-row">
          <span class="dimension-label">${dim.label}</span>
          <span class="dimension-value">No data yet</span>
        </div>
      `;
    }
    return `
      <div class="dimension-row">
        <span class="dimension-label">${dim.label}</span>
        <span class="dimension-value">${value.toFixed(1)}</span>
      </div>
    `;
  }).join("");

  return `
    <div class="dimension-summary">
      <h4>Place profile</h4>
      ${rows}
    </div>
  `;
}

function renderFilterMatch(filters, reasons) {
  if (!filters || filters.length === 0) return "";

  return `
    <div class="filter-match">
      <h4>Matches your filters</h4>
      <div class="filter-stack">
        ${filters.map(label => `<span class="filter-pill">${label}</span>`).join("")}
      </div>
      ${reasons.length ? `
        <ul class="filter-reasons">
          ${reasons.map(r => `<li>&#10003; ${r}</li>`).join("")}
        </ul>
      ` : ""}
    </div>
  `;
}

function renderGroupMatch(summary, placeProfile) {
  if (!summary) return "";
  const label = getGroupMatchLabel(summary);
  const reasons = getGroupReasons(placeProfile);
  return `
    <div class="filter-match group-match">
      <h4>Works for</h4>
      <div class="group-match-score">
        ${summary.fitCount}/${summary.size} people
        <span class="group-match-label">${label}</span>
      </div>
      ${reasons.length ? `
        <ul class="filter-reasons">
          ${reasons.map(r => `<li>&#10003; ${r}</li>`).join("")}
        </ul>
      ` : ""}
    </div>
  `;
}

function renderPeopleComeHere(tags) {
  if (!tags.length) return "";
  return `
    <div class="people-come-here">
      <h4>People come here for</h4>
      <div class="people-tags">
        ${tags.map(tag => `<span class="tag-chip">${tag}</span>`).join("")}
      </div>
    </div>
  `;
}

function renderHeaderInfo(info) {
  const tags = [];
  if (info.category) tags.push(info.category);
  if (info.access && info.access.length) {
    info.access.forEach(item => tags.push(item));
  }
  if (!tags.length) return "";
  return tags.slice(0, 3).map(tag => `<span class="tag-chip">${tag}</span>`).join("");
}

function getHeaderInfo(place, reviews) {
  const rawCategory = place?.category || place?.type || "";
  const category = rawCategory
    ? rawCategory.toString().replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : "";

  const access = getAccessTags(reviews);
  return { category, access };
}

function getAccessTags(reviews) {
  const set = new Set();
  (reviews || []).forEach(review => {
    const quickAccess = review.movement?.quickAccess || review.movementLayout?.quickAccess || [];
    quickAccess.forEach(item => set.add(item));
  });

  if (set.has("stairs-only")) {
    return ["Stairs only"];
  }

  const labels = [];
  if (set.has("step-free")) labels.push("Step-free");
  if (set.has("ramp")) labels.push("Ramp");
  if (set.has("lift")) labels.push("Lift");
  if (set.has("escalator")) labels.push("Escalator");
  return labels;
}

function getPeopleComeHereFor(summary) {
  const tags = [];
  const profile = summary.placeProfile || {};
  const noise = summary.sound?.overallAvg;
  if (profile.navigationEase >= 4) tags.push("&#9889; Quick stop");
  if (noise !== null && noise !== undefined && noise <= 2.5) tags.push("&#128172; Easy conversation");
  if (profile.calmness >= 4 || profile.visualCalm >= 4) tags.push("&#127807; Sensory friendly");
  if (!tags.length) tags.push("&#129489; Easy to navigate");
  return tags.slice(0, 3);
}

function buildCompactPills(place, summary) {
  const tags = getPeopleComeHereFor(summary)
    .map(t => t.replace(/&[^;]+;/g, "").trim());
  const rating = summary.placeProfile?.calmness
    ? `Calm ${summary.placeProfile.calmness.toFixed(1)}`
    : "New place";
  return [rating, ...tags].slice(0, 3);
}

function collectReviewTags(review) {
  const tags = [];
  const sound = review.sound?.soundComponent || [];
  const visual = review.visualLoad?.visualComponent || [];
  const lighting = review.lighting?.lightingComponent || [];
  const transitions = review.transitions?.changes || [];

  const map = {
    backgroundMusic: "sound",
    crowdNoise: "crowded",
    suddenLoud: "sudden noise",
    soundEcho: "echo",
    brightColors: "bright",
    patterns: "patterns",
    movingThings: "movement",
    decorative: "decorative",
    lightingChange: "lighting shift",
    glaring: "glare",
    dim: "dim",
    light: "lighting change",
    noise: "noise change",
    compression: "tight space",
    expansion: "opens up"
  };

  [...sound, ...visual, ...lighting, ...transitions].forEach(key => {
    if (map[key] && !tags.includes(map[key])) tags.push(map[key]);
  });

  if (review.calmZones?.features?.length) {
    review.calmZones.features.forEach(tag => {
      if (!tags.includes(tag)) tags.push(tag);
    });
  }

  return tags.slice(0, 3);
}


// ---------- TOGGLE REVIEW ----------

function toggleReview(index) {

  const target = document.getElementById(`review-${index}`);
  if (!target) return;

  const cards = Array.from(document.querySelectorAll(".review-card"));
  cards.forEach(card => {
    const body = card.querySelector(".review-body");
    const toggle = card.querySelector(".review-toggle");
    const isTarget = card.dataset.reviewIndex === String(index);
    if (!body || !toggle) return;
    if (isTarget) {
      const willExpand = body.classList.contains("collapsed");
      body.classList.toggle("collapsed", !willExpand);
      card.classList.toggle("expanded", willExpand);
      toggle.setAttribute("aria-expanded", willExpand.toString());
    } else {
      body.classList.add("collapsed");
      card.classList.remove("expanded");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

}


// ---------- CLOSE PANEL ----------

export function closeSidePanel() {

  const panel = document.getElementById("sidePanel");
  const tab = document.getElementById("sidePanelTab");
  if (!panel) return;

  panel.classList.remove("active");

  const hasContent = panel.querySelector("#panelContent")?.innerHTML?.trim();
  if (tab && hasContent) {
    tab.classList.add("visible");
  }

}

document
  .getElementById("closePanelBtn")
  .addEventListener("click", closeSidePanel);

document
  .getElementById("sidePanelTab")
  .addEventListener("click", () => {
    const panel = document.getElementById("sidePanel");
    const tab = document.getElementById("sidePanelTab");
    if (panel) panel.classList.add("active");
    if (tab) tab.classList.remove("visible");
  });

document
  .getElementById("cancelReviewBtn")
  .addEventListener("click", () => {
    cancelReview();
    const tab = document.getElementById("sidePanelTab");
    if (tab) tab.classList.remove("visible");
  });

const panelContent = document.getElementById("panelContent");
if (panelContent) {
  panelContent.addEventListener("click", (e) => {
    const btn = e.target.closest("#add-review-btn");
    if (!btn) return;
    const panel = document.getElementById("sidePanel");
    const placeId =
      btn.dataset.placeId ||
      currentPlaceForReview?.id ||
      panel?.dataset?.placeId;
    const placeName =
      btn.dataset.placeName ||
      currentPlaceForReview?.name ||
      panel?.dataset?.placeName;
    if (!placeId || !placeName) return;
    openAddReviewForm(placeId, placeName);
  });

  panelContent.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-add-review]");
    if (!btn) return;
    const panel = document.getElementById("sidePanel");
    const placeId =
      btn.dataset.placeId ||
      currentPlaceForReview?.id ||
      panel?.dataset?.placeId;
    const placeName =
      btn.dataset.placeName ||
      currentPlaceForReview?.name ||
      panel?.dataset?.placeName;
    if (!placeId || !placeName) return;
    openAddReviewForm(placeId, placeName);
  });

  panelContent.addEventListener("click", (e) => {
    const tabBtn = e.target.closest(".panel-tab");
    if (!tabBtn) return;
    const targetTab = tabBtn.dataset.tab;
    panelContent.querySelectorAll(".panel-tab").forEach(btn => {
      const active = btn.dataset.tab === targetTab;
      btn.classList.toggle("active", active);
      btn.setAttribute("aria-selected", active.toString());
    });
    panelContent.querySelectorAll(".panel-tab-panel").forEach(panel => {
      panel.classList.toggle("active", panel.dataset.tab === targetTab);
    });
  });

  panelContent.addEventListener("click", (e) => {
    const toggle = e.target.closest(".review-toggle");
    if (!toggle) return;
    const card = toggle.closest(".review-card");
    if (!card) return;
    const index = Number(card.dataset.reviewIndex);
    toggleReview(index);
  });

  panelContent.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { passive: false }
  );
}
