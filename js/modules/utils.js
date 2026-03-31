// ---------- GENERIC HELPERS ----------

export function percentage(count, total) {
  return total === 0 ? 0 : Math.round((count / total) * 100);
}

export function average(values) {
  const valid = values
    .map(v => Number(v))
    .filter(v => !Number.isNaN(v));

  if (!valid.length) return null;

  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function normalizeToPercent(value, min, max) {
  if (value === null || value === undefined) return null;
  const raw = ((value - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function normalizeResponses(raw) {

  const movementScore = raw.movement?.continuity
    ? (raw.movement.continuity / 5) * 100
    : null;

  const visualLoadScore = raw.visualLoad?.intensity
    ? (raw.visualLoad.intensity / 5) * 100
    : null;

  return {
    movementScore,
    visualLoadScore
  };
}

// ---------- REVIEW HELPERS ----------

export function getMultiSelect(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)]
    .map(input => input.value);
}

export function getBarValue(id) {
  const el = document.getElementById(id);
  return el ? Number(el.value) : null;
}

export function getRadioValue(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : null;
}

export function getStatementMap(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return {};

  const result = {};
  container.querySelectorAll("[data-statement]").forEach(el => {
    result[el.dataset.statement] = el.dataset.value === "true";
  });

  return result;
}