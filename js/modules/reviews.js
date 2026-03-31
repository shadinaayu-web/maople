import { percentage, average } from "./utils.js";
import { state } from "./state.js";

// ---------- DIMENSIONS CONFIG ----------

export const DIMENSIONS = [
  {
    id: "calmness",
    label: "Calmness",
    left: "Calm",
    right: "Energetic",
    weight: 1
  },
  {
    id: "navigationEase",
    label: "Navigation Ease",
    left: "Easy to navigate",
    right: "Explore",
    weight: 1
  },
  {
    id: "spaciousness",
    label: "Spaciousness",
    left: "Spacious",
    right: "Compact",
    weight: 1
  },
  {
    id: "visualCalm",
    label: "Visual Calm",
    left: "Visually calm",
    right: "Visually stimulating",
    weight: 1
  },
  {
    id: "quietCorners",
    label: "Quiet Corners",
    left: "Quiet corners",
    right: "Open social",
    weight: 1
  },
  {
    id: "accessibility",
    label: "Accessibility",
    left: "Low barriers",
    right: "Multi-level / complex",
    weight: 1
  }
];

const clampScore = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.min(5, Math.max(1, value));
};

const avgOr = (values, fallback = null) => {
  const avg = average(values);
  return avg === null ? fallback : avg;
};

const hasAny = (arr, keys) => {
  if (!Array.isArray(arr)) return false;
  return keys.some(k => arr.includes(k));
};

function scoreCalmness(review) {
  const sound = review.sound?.overall ?? null;
  const visual = review.visualLoad?.level ?? null;
  const base = avgOr([sound, visual], null);
  if (base === null) return null;

  const soundFlags = review.sound?.soundComponent || [];
  let energetic = base;
  if (hasAny(soundFlags, ["crowdNoise", "suddenLoud", "backgroundMusic"])) {
    energetic += 0.4;
  }

  return clampScore(6 - energetic);
}

function scoreNavigationEase(review) {
  const movement = review.movement?.continuity ?? null;
  const wayfinding = review.wayfinding?.clarity ?? null;
  let score = avgOr([movement, wayfinding], 3);

  const moveStatements = review.movement?.statements || {};
  const wayStatements = review.wayfinding?.statements || {};

  if (moveStatements["see-next"]) score += 0.4;
  if (moveStatements["hesitated"]) score -= 0.4;
  if (moveStatements["reorient"]) score -= 0.4;

  if (wayStatements["find-things"]) score += 0.4;
  if (wayStatements["distinct-areas"]) score += 0.3;
  if (wayStatements["search-things"]) score -= 0.4;

  return clampScore(score);
}

function scoreSpaciousness(review) {
  let score = 3;
  const movement = review.movement?.continuity ?? null;
  if (movement !== null && !Number.isNaN(movement)) {
    score += (movement - 3) * 0.2;
  }

  const changes = review.transitions?.changes || [];
  if (changes.includes("compression")) score -= 0.9;
  if (changes.includes("expansion")) score += 0.7;

  const soundFlags = review.sound?.soundComponent || [];
  if (soundFlags.includes("crowdNoise")) score -= 0.3;

  return clampScore(score);
}

function scoreVisualCalm(review) {
  const visual = review.visualLoad?.level ?? null;
  if (visual === null) return null;

  let score = 6 - visual;
  const visualFlags = review.visualLoad?.visualComponent || [];
  if (hasAny(visualFlags, ["brightColors", "patterns", "movingThings", "decorative"])) {
    score -= 0.3;
  }
  if (visualFlags.includes("noneVisual")) {
    score += 0.6;
  }

  return clampScore(score);
}

function scoreQuietCorners(review) {
  const availability = review.calmZones?.availability ?? null;
  let score = 3;

  if (availability === "clearly") score = 4.5;
  if (availability === "limited") score = 3;
  if (availability === "none") score = 1.5;

  const features = review.calmZones?.features || [];
  score += Math.min(features.length * 0.2, 0.6);

  return clampScore(score);
}

function scoreAccessibility(review) {
  const quickAccess = review.movement?.quickAccess || review.movementLayout?.quickAccess || [];
  let score = 3;

  if (quickAccess.includes("stairs-only")) {
    return 1;
  }

  if (quickAccess.includes("step-free")) score += 1.0;
  if (quickAccess.includes("ramp")) score += 0.7;
  if (quickAccess.includes("lift")) score += 0.7;
  if (quickAccess.includes("escalator")) score += 0.3;

  return clampScore(score);
}

export function computeDimensionScores(review) {
  if (review?.dimensionScores) {
    return normalizeDimensionScores(review.dimensionScores);
  }
  return {
    calmness: scoreCalmness(review),
    navigationEase: scoreNavigationEase(review),
    spaciousness: scoreSpaciousness(review),
    visualCalm: scoreVisualCalm(review),
    quietCorners: scoreQuietCorners(review),
    accessibility: scoreAccessibility(review)
  };
}

export function computePlaceDimensions(reviews) {
  const buckets = {};
  DIMENSIONS.forEach(dim => {
    buckets[dim.id] = [];
  });

  (reviews || []).forEach(review => {
    const scores = computeDimensionScores(review);
    Object.entries(scores).forEach(([id, value]) => {
      if (value === null || value === undefined || Number.isNaN(value)) return;
      buckets[id]?.push(Number(value));
    });
  });

  const result = {};
  DIMENSIONS.forEach(dim => {
    result[dim.id] = average(buckets[dim.id] || []);
  });

  return result;
}

export function computePlaceDimensionsFromAggregates(sums = {}, counts = {}) {
  const result = {};
  DIMENSIONS.forEach(dim => {
    const sum = Number(sums?.[dim.id]);
    const count = Number(counts?.[dim.id]);
    if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) {
      result[dim.id] = null;
    } else {
      result[dim.id] = sum / count;
    }
  });
  return result;
}

function normalizeDimensionScores(scores) {
  const out = {};
  DIMENSIONS.forEach(dim => {
    const value = scores?.[dim.id];
    out[dim.id] = clampScore(value);
  });
  return out;
}


// ---------- DATA ANALYSIS ----------

export function aggregateReviews(reviews) {

  const total = reviews.length;

  if (!total) {
    return {
      total: 0
    };
  }

  const placeProfile = computePlaceDimensions(reviews);

  return {

    total,

    movement: {
      continuityAvg: average(
        reviews.map(r => r.movement?.continuity)
      )
    },

    wayfinding: {
      clarityAvg: average(
        reviews.map(r => r.wayfinding?.clarity)
      )
    },

    visualLoad: {
      avg: average(
        reviews.map(r => r.visualLoad?.level)
      )
    },

    transitions: {
      abruptnessAvg: average(
        reviews.map(r => r.transitions?.abruptness)
      )
    },

    sound: {
      overallAvg: average(
        reviews.map(r => r.sound?.overall)
      )
    },

    lighting: {
      overallAvg: average(
        reviews.map(r => r.lighting?.overall)
      )
    },

    calmZones: {

      clearlyAvailable: percentage(
        reviews.filter(
          r => r.calmZones?.availability === "clearly"
        ).length,
        total
      )

    },

    placeProfile

  };

}

export function aggregateReviewsFromSnapshot(snapshot) {
  const total = snapshot?.reviewCount || 0;
  if (!total) {
    return { total: 0 };
  }

  const placeProfile = computePlaceDimensionsFromAggregates(
    snapshot.dimensionSums || {},
    snapshot.dimensionCounts || {}
  );

  const avg = (key) => {
    const sum = Number(snapshot?.metricSums?.[key]);
    const count = Number(snapshot?.metricCounts?.[key]);
    if (!Number.isFinite(sum) || !Number.isFinite(count) || count <= 0) return null;
    return sum / count;
  };

  const availabilityCount = snapshot.calmZonesAvailabilityCount || 0;
  const clearlyCount = snapshot.calmZonesClearlyCount || 0;

  return {
    total,
    movement: { continuityAvg: avg("movementContinuity") },
    wayfinding: { clarityAvg: avg("wayfindingClarity") },
    visualLoad: { avg: avg("visualLoad") },
    transitions: { abruptnessAvg: avg("transitionsAbruptness") },
    sound: { overallAvg: avg("soundOverall") },
    lighting: { overallAvg: avg("lightingOverall") },
    calmZones: {
      clearlyAvailable: percentage(clearlyCount, availabilityCount || total)
    },
    placeProfile
  };
}


// ---------- INSIGHT GENERATION ----------

export function generateInsight(summary) {

  if (!summary || summary.total === 0) {
    return "No accessibility data yet.";
  }

  const insights = [];


  if (summary.movement?.continuityAvg >= 4) {

    insights.push("Movement flow is generally smooth.");

  } else if (summary.movement?.continuityAvg <= 2.5) {

    insights.push("Movement can feel interrupted or uneven.");

  }


  if (summary.visualLoad?.avg >= 4) {

    insights.push("Visual environment may feel intense.");

  } else if (summary.visualLoad?.avg <= 2) {

    insights.push("Visual environment is relatively calm.");

  }


  if (summary.transitions?.abruptnessAvg >= 4) {

    insights.push("Transitions may feel abrupt.");

  }


  if (summary.calmZones?.clearlyAvailable >= 60) {

    insights.push("Calm areas are commonly reported.");

  }


  if (insights.length === 0) {
    return "Mixed accessibility experience reported.";
  }

  return insights.join(" ");

}


// ---------- REVIEW ORDERING ----------

export function sortReviewsForDisplay(reviews) {

  return [...reviews].sort((a, b) => {

    if (a.userId === state.currentUserId) return -1;

    if (b.userId === state.currentUserId) return 1;

    return new Date(b.createdAt) - new Date(a.createdAt);

  });

}


// ---------- PLACE SUMMARY ----------

export function getPlaceSummary(place) {

  return aggregateReviews(place.reviews || []);

}
