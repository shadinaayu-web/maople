// -------------------------
// REVIEW SCHEMA
// -------------------------

const REVIEW_SCHEMA = {
  movementLayout: {
    quickAccess: [],   // multi select
    continuity: null,  // 1–5
    clarityFactors: {} // statement boolean map
  },

  knowingWhere: {
    understanding: null,  // 1–5
    wayfindingFactors: {} // statement boolean map
  },

  sound: {
    overall: null, // 1–5 calming → distracting
    conversationComfort: null, // yes / lean in / no
    soundComponent: [] // multi select
  },

  lighting: {
    overall: null, // 1–5
    lightingComponent: [] // multi select
  },

  visualLoad: {
    level: null, // minimal-balanced-busy-overloaded
    visualComponent: [] // multi select
  },

  transitions: {
    changes: [] // multi select
  },

  calmZones: {
    availability: null, // clearly / limited / none
    features: [] // multi select
  },

  positiveExtraction: {
    highlights: [], // multi select up to 3
    note: ""
  }
};

window.REVIEW_SCHEMA = REVIEW_SCHEMA;
