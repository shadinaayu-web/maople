export const DEFAULT_REVIEW_SCHEMA_ID = "maople.review";
export const LEGACY_REVIEW_SCHEMA_VERSION = 1;
export const ACTIVE_REVIEW_SCHEMA_VERSION = 13;
export const ACTIVE_REVIEW_FORM_VERSION = "2026-05-09";

function asNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (item === null || item === undefined ? null : String(item)))
    .filter((item) => item);
}

function asString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function asBooleanMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  Object.entries(value).forEach(([key, raw]) => {
    if (raw === true || raw === "true") out[key] = true;
    if (raw === false || raw === "false") out[key] = false;
  });
  return out;
}

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function mapFlowFeelToContinuity(value) {
  switch (value) {
    case "smooth-all-the-way":
      return 5;
    case "slowed-down-few-times":
      return 3;
    case "stopped-to-figure-out":
      return 1;
    default:
      return null;
  }
}

function mapGettingToThingsToClarity(value) {
  switch (value) {
    case "easy-without-thinking":
      return 5;
    case "took-some-effort":
      return 3;
    case "had-to-stop-or-go-around":
      return 2;
    default:
      return null;
  }
}

function mapSignsClarityToClarity(value) {
  switch (value) {
    case "very-clear":
      return 5;
    case "took-some-effort":
      return 3;
    case "hard-to-understand":
      return 1;
    default:
      return null;
  }
}

function mapComfortImpactToDiscomfort(value) {
  switch (value) {
    case "no":
      return 2;
    case "a-little":
      return 3;
    case "yes":
      return 4;
    default:
      return null;
  }
}

function mapOffGuardToAbruptness(value) {
  switch (value) {
    case "no":
      return 1;
    case "a-little":
      return 3;
    case "yes":
      return 4;
    default:
      return null;
  }
}

function mapCalmSpotEaseToAvailability(value) {
  switch (value) {
    case "yes":
      return "clearly";
    case "maybe":
      return "limited";
    case "not-really":
      return "none";
    default:
      return null;
  }
}

function uniqueMerge(...arrays) {
  return [...new Set(arrays.flatMap((arr) => asArray(arr)))];
}

function clampOneToFive(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return Math.min(5, Math.max(1, value));
}

export function normalizeLegacySnapshot(payload = {}) {
  const movementSource = payload.movement || payload.movementLayout || {};
  const wayfindingSource = payload.wayfinding || payload.knowingWhere || {};
  const positivesSource = payload.positives || payload.positiveExtraction || {};
  const transitionsSource = payload.transitions || {};
  const visualSource = payload.visualLoad || {};
  const calmSource = payload.calmZones || {};
  const soundSource = payload.sound || {};
  const lightingSource = payload.lighting || {};
  const visitSource = payload.visit || payload.visitContext || {};
  const arrivingSource = payload.arriving || payload.entry || {};
  const movingSource = payload.movingAround || payload.movementChapter || {};
  const levelsSource = payload.levelsFacilities || payload.levels || {};
  const findingSource = payload.findingYourWay || payload.wayfindingContext || {};
  const environmentSource = payload.howItFelt || payload.environment || {};
  const breakSource = payload.takingABreak || payload.breakSpots || payload.breaks || {};
  const safetySource = payload.feelingSafe || payload.safety || {};
  const whoSource = payload.whoItMayWorkFor || payload.whoItWorksFor || {};
  const movingSlowFactorsRaw = asArray(movingSource.slowFactors);
  const movingSlowFactors = movingSlowFactorsRaw.includes("nothing-easy")
    ? []
    : movingSlowFactorsRaw;
  const movingHarderFactors = asArray(movingSource.harderFactors);
  const movingObservedConditionsRaw = asArray(movingSource.observedConditions);
  const movingObservedConditions = movingObservedConditionsRaw.includes("none")
    ? []
    : movingObservedConditionsRaw;
  const arrivingEntryBarriersRaw = asArray(arrivingSource.entryBarriers || arrivingSource.barriers);
  const arrivingEntryBarriers = arrivingEntryBarriersRaw.includes("nope-all-good")
    ? []
    : arrivingEntryBarriersRaw;
  const rawInterLevelAccess =
    levelsSource.interLevelAccess ?? levelsSource.betweenLevels ?? null;
  const interLevelAccess = Array.isArray(rawInterLevelAccess)
    ? asArray(rawInterLevelAccess)
    : rawInterLevelAccess
      ? [asString(rawInterLevelAccess)]
      : [];
  const helpfulFeatures = asArray(
    levelsSource.helpfulFeatures ||
    levelsSource.availableFacilities ||
    levelsSource.available ||
    levelsSource.features
  );
  const unsureLevel =
    findingSource.unsureLevel ?? findingSource.unsureWhereToGo ?? null;
  const confusingFactors = asArray(findingSource.confusingFactors);
  const signsClarity =
    findingSource.signsClarity ??
    findingSource.signsMenusClarity ??
    findingSource.signClarity ??
    null;
  const hardToUnderstandFactors = asArray(
    findingSource.hardToUnderstandFactors || findingSource.hardFactors
  );
  const comfortImpact =
    environmentSource.comfortImpact ??
    environmentSource.comfortFocusImpact ??
    environmentSource.focusComfortImpact ??
    null;
  const discomfortFactors = asArray(
    environmentSource.discomfortFactors || environmentSource.uncomfortableFactors
  );
  const offGuardLevel =
    environmentSource.offGuardLevel ?? environmentSource.caughtOffGuardLevel ?? null;
  const offGuardFactors = asArray(
    environmentSource.offGuardFactors || environmentSource.caughtOffGuardFactors
  );
  const calmSpotEase =
    breakSource.calmSpotEase ?? breakSource.findCalmSpotEase ?? null;
  const calmAreaHardFactors = asArray(
    breakSource.calmAreaHardFactors || breakSource.hardToFindCalmAreaFactors
  );
  const sitRestAvailability =
    breakSource.sitRestAvailability ?? breakSource.seatRestAvailability ?? null;
  const longStayManageability =
    breakSource.longStayManageability ?? breakSource.stayManageability ?? null;
  const longStayDifficultFactors = asArray(
    breakSource.longStayDifficultFactors || breakSource.stayDifficultFactors
  );
  const openVisible =
    safetySource.openVisible ?? safetySource.spaceOpenVisible ?? null;
  const hiddenAreas =
    safetySource.hiddenAreas ?? safetySource.hiddenIsolatedAreas ?? null;
  const getHelpEase =
    safetySource.getHelpEase ?? safetySource.helpAttentionEase ?? null;
  const comfortableFor = asArray(
    whoSource.comfortableFor || whoSource.goodFor
  );
  const difficultFor = asArray(
    whoSource.difficultFor || whoSource.harderFor
  );
  const derivedContinuity = mapFlowFeelToContinuity(movingSource.flowFeel);
  const derivedClarity = mapGettingToThingsToClarity(movingSource.gettingToThings);
  const derivedSignsClarity = mapSignsClarityToClarity(signsClarity);
  const derivedDiscomfort = mapComfortImpactToDiscomfort(comfortImpact);
  const derivedAbruptness = mapOffGuardToAbruptness(offGuardLevel);
  const derivedCalmAvailability = mapCalmSpotEaseToAvailability(calmSpotEase);
  const movementStatementsSource = movementSource.statements || movementSource.clarityFactors;
  const wayfindingStatementsSource = wayfindingSource.statements || wayfindingSource.wayfindingFactors;
  const movementStatements = asBooleanMap(movementStatementsSource);
  const wayfindingStatements = asBooleanMap(wayfindingStatementsSource);
  const quickAccess = asArray(movementSource.quickAccess);

  if (!Object.keys(movementStatements).length && movingSlowFactors.length) {
    movementStatements["hesitated"] = movingSlowFactors.some((item) =>
      ["steps-level-changes", "tight-narrow-spaces", "people-blocking-way", "slippery-uneven-floor"].includes(item)
    );
    const hasWayfindingConfusion =
      movingHarderFactors.includes("couldnt-see-where-to-go") ||
      movingHarderFactors.includes("hidden-hard-find");
    movementStatements["reorient"] = hasWayfindingConfusion;
    movementStatements["see-next"] = !hasWayfindingConfusion;
  }

  if (!Object.keys(wayfindingStatements).length) {
    if (movingSource.gettingToThings === "easy-without-thinking") {
      wayfindingStatements["find-things"] = true;
      wayfindingStatements["search-things"] = false;
    }
    if (
      movingHarderFactors.includes("couldnt-see-where-to-go") ||
      movingHarderFactors.includes("hidden-hard-find")
    ) {
      wayfindingStatements["search-things"] = true;
    }
  }

  if (unsureLevel === "no") {
    wayfindingStatements["find-things"] = true;
  }

  if (unsureLevel && unsureLevel !== "no") {
    wayfindingStatements["search-things"] = true;
  }

  if (confusingFactors.length || hardToUnderstandFactors.length) {
    wayfindingStatements["search-things"] = true;
  }

  if (confusingFactors.includes("important-areas-not-visible")) {
    wayfindingStatements["see-next"] = false;
  }

  if (confusingFactors.includes("no-clear-path")) {
    wayfindingStatements["reorient"] = true;
  }

  if (signsClarity === "very-clear") {
    wayfindingStatements["find-things"] = true;
  }

  if (signsClarity && signsClarity !== "very-clear") {
    wayfindingStatements["search-things"] = true;
  }

  if (!quickAccess.length) {
    const inferred = new Set();
    const arrivingEntry = arrivingSource.firstEntry || arrivingSource.entryExperience;

    if (arrivingEntry === "flat-easy") inferred.add("step-free");
    if (arrivingEntry === "ramp-available") inferred.add("ramp");
    if (arrivingEntry === "stairs-steep-no-ramp") inferred.add("stairs-only");

    if (interLevelAccess.includes("no-level-changes")) inferred.add("step-free");
    if (interLevelAccess.includes("ramp")) inferred.add("ramp");
    if (interLevelAccess.includes("lift-elevator")) inferred.add("lift");
    if (interLevelAccess.includes("escalator")) inferred.add("escalator");
    if (interLevelAccess.includes("stairs")) inferred.add("stairs-only");
    if (interLevelAccess.includes("stairs-only")) inferred.add("stairs-only");

    if (helpfulFeatures.includes("ramp")) inferred.add("ramp");
    if (helpfulFeatures.includes("lift-elevator")) inferred.add("lift");
    if (helpfulFeatures.includes("escalator")) inferred.add("escalator");

    quickAccess.push(...inferred);
  }

  const derivedSoundFactors = [];
  if (discomfortFactors.includes("background-music-too-loud")) {
    derivedSoundFactors.push("backgroundMusic");
  }
  if (discomfortFactors.includes("sudden-noise")) {
    derivedSoundFactors.push("suddenLoud");
  }
  if (discomfortFactors.includes("people-talking-loudly")) {
    derivedSoundFactors.push("crowdNoise");
  }

  const derivedLightingFactors = [];
  if (discomfortFactors.includes("lighting-harsh-uncomfortable")) {
    derivedLightingFactors.push("glaring");
  }
  if (discomfortFactors.includes("lighting-too-dim")) {
    derivedLightingFactors.push("dim");
  }

  const derivedVisualFactors = [];
  if (discomfortFactors.includes("too-much-visual-happening")) {
    derivedVisualFactors.push("movingThings");
  }

  const derivedTransitionChanges = [];
  if (offGuardFactors.includes("lighting-changed-a-lot")) {
    derivedTransitionChanges.push("light");
    derivedLightingFactors.push("lightingChange");
  }
  if (offGuardFactors.includes("noise-level-changed-suddenly")) {
    derivedTransitionChanges.push("noise");
  }
  if (offGuardFactors.includes("space-became-tight-or-crowded")) {
    derivedTransitionChanges.push("compression");
  }

  if (calmAreaHardFactors.includes("music-noise-reached-every-area")) {
    derivedSoundFactors.push("backgroundMusic");
  }
  if (calmAreaHardFactors.includes("space-felt-visually-busy")) {
    derivedVisualFactors.push("movingThings");
  }
  if (calmAreaHardFactors.includes("too-crowded-everywhere")) {
    derivedSoundFactors.push("crowdNoise");
    derivedTransitionChanges.push("compression");
  }

  const existingSoundOverall = asNumber(soundSource.overall);
  const derivedSoundOverall =
    existingSoundOverall !== null
      ? existingSoundOverall
      : derivedDiscomfort === null
        ? null
        : clampOneToFive(derivedDiscomfort + (derivedSoundFactors.length ? 0.4 : 0));

  const existingLightingOverall = asNumber(lightingSource.overall);
  const derivedLightingOverall =
    existingLightingOverall !== null
      ? existingLightingOverall
      : derivedDiscomfort === null
        ? null
        : clampOneToFive(derivedDiscomfort + (derivedLightingFactors.length ? 0.3 : 0));

  const existingVisualLevel = asNumber(visualSource.level ?? visualSource.intensity);
  const derivedVisualLevel =
    existingVisualLevel !== null
      ? existingVisualLevel
      : derivedDiscomfort === null
        ? null
        : clampOneToFive(derivedDiscomfort + (derivedVisualFactors.length ? 0.4 : 0));

  return {
    visit: {
      timeOfDay: visitSource.timeOfDay ?? visitSource.when ?? null,
      companions: asArray(visitSource.companions || visitSource.how),
      busyLevel: visitSource.busyLevel ?? visitSource.busy ?? null
    },
    arriving: {
      firstEntry: arrivingSource.firstEntry ?? arrivingSource.entryExperience ?? null,
      groundCondition: arrivingSource.groundCondition ?? arrivingSource.ground ?? null,
      entryBarriers: arrivingEntryBarriers
    },
    movingAround: {
      flowFeel: movingSource.flowFeel ?? null,
      slowFactors: movingSlowFactorsRaw,
      gettingToThings: movingSource.gettingToThings ?? null,
      harderFactors: movingHarderFactors,
      observedConditions: movingObservedConditionsRaw
    },
    levelsFacilities: {
      interLevelAccess,
      rampFeel: levelsSource.rampFeel ?? levelsSource.ramp ?? null,
      helpfulFeatures,
      availableFacilities: helpfulFeatures
    },
    findingYourWay: {
      unsureLevel,
      confusingFactors,
      signsClarity,
      hardToUnderstandFactors
    },
    howItFelt: {
      comfortImpact,
      discomfortFactors,
      offGuardLevel,
      offGuardFactors
    },
    takingABreak: {
      calmSpotEase,
      calmAreaHardFactors,
      sitRestAvailability,
      longStayManageability,
      longStayDifficultFactors
    },
    feelingSafe: {
      openVisible,
      hiddenAreas,
      getHelpEase
    },
    whoItMayWorkFor: {
      comfortableFor,
      difficultFor
    },
    movement: {
      quickAccess,
      continuity: asNumber(movementSource.continuity) ?? derivedContinuity,
      statements: movementStatements
    },
    wayfinding: {
      clarity:
        asNumber(wayfindingSource.clarity ?? wayfindingSource.understanding) ??
        derivedClarity ??
        derivedSignsClarity,
      statements: wayfindingStatements
    },
    sound: {
      overall: derivedSoundOverall,
      conversationComfort: soundSource.conversationComfort ?? null,
      soundComponent: uniqueMerge(soundSource.soundComponent, derivedSoundFactors)
    },
    lighting: {
      overall: derivedLightingOverall,
      lightingComponent: uniqueMerge(lightingSource.lightingComponent, derivedLightingFactors)
    },
    visualLoad: {
      level: derivedVisualLevel,
      visualComponent: uniqueMerge(visualSource.visualComponent, derivedVisualFactors)
    },
    transitions: {
      abruptness: asNumber(transitionsSource.abruptness) ?? derivedAbruptness,
      changes: uniqueMerge(transitionsSource.changes, derivedTransitionChanges)
    },
    calmZones: {
      availability: calmSource.availability ?? derivedCalmAvailability,
      features: asArray(calmSource.features)
    },
    positives: {
      highlights: asArray(positivesSource.highlights),
      note: asString(positivesSource.note, "")
    }
  };
}

export function extractReviewPayload(review = {}) {
  if (review.responses && typeof review.responses === "object") {
    return review.responses;
  }
  if (review.payload && typeof review.payload === "object") {
    return review.payload;
  }
  if (review.legacySnapshot && typeof review.legacySnapshot === "object") {
    return review.legacySnapshot;
  }
  return review;
}

export function normalizeReviewForApp(review = {}) {
  const payload = extractReviewPayload(review);
  const legacySnapshot = normalizeLegacySnapshot(payload);

  const schemaVersionRaw = review.schema?.version ?? review.schemaVersion;
  const schemaVersion = Number.isFinite(Number(schemaVersionRaw))
    ? Number(schemaVersionRaw)
    : LEGACY_REVIEW_SCHEMA_VERSION;

  const formVersion =
    review.schema?.formVersion ||
    review.formVersion ||
    "legacy";

  const schemaId =
    review.schema?.id ||
    review.schemaId ||
    DEFAULT_REVIEW_SCHEMA_ID;

  return {
    ...review,
    ...legacySnapshot,
    schema: {
      id: schemaId,
      version: schemaVersion,
      formVersion
    },
    schemaVersion,
    formVersion,
    responses:
      review.responses && typeof review.responses === "object"
        ? review.responses
        : cloneJson(payload),
    legacySnapshot:
      review.legacySnapshot && typeof review.legacySnapshot === "object"
        ? review.legacySnapshot
        : cloneJson(legacySnapshot)
  };
}

export function buildReviewRecordForStorage({
  base = {},
  responses = {},
  legacySnapshot = null,
  schemaId = DEFAULT_REVIEW_SCHEMA_ID,
  schemaVersion = ACTIVE_REVIEW_SCHEMA_VERSION,
  formVersion = ACTIVE_REVIEW_FORM_VERSION
} = {}) {
  const normalizedLegacy =
    legacySnapshot && typeof legacySnapshot === "object"
      ? normalizeLegacySnapshot(legacySnapshot)
      : normalizeLegacySnapshot(responses);

  return {
    ...base,
    ...normalizedLegacy,
    schema: {
      id: schemaId,
      version: schemaVersion,
      formVersion
    },
    schemaVersion,
    formVersion,
    responses: cloneJson(responses),
    legacySnapshot: cloneJson(normalizedLegacy)
  };
}
