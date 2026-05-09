// -------------------------
// REVIEW SCHEMAS (GLOBAL)
// -------------------------
// Kept as a plain script (not module) because index.html loads it with <script>.
// The app's module code uses review-compat.js for runtime normalization.

const REVIEW_SCHEMA_REGISTRY = Object.freeze({
  1: Object.freeze({
    id: "maople.review",
    version: 1,
    formVersion: "2026-03-28",
    sections: {
      movement: {
        quickAccess: [],
        continuity: null,
        statements: {}
      },
      wayfinding: {
        clarity: null,
        statements: {}
      },
      sound: {
        overall: null,
        conversationComfort: null,
        soundComponent: []
      },
      lighting: {
        overall: null,
        lightingComponent: []
      },
      visualLoad: {
        level: null,
        visualComponent: []
      },
      transitions: {
        changes: []
      },
      calmZones: {
        availability: null,
        features: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  2: Object.freeze({
    id: "maople.review",
    version: 2,
    formVersion: "2026-05-01",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      movement: {
        quickAccess: [],
        continuity: null,
        statements: {}
      },
      wayfinding: {
        clarity: null,
        statements: {}
      },
      sound: {
        overall: null,
        conversationComfort: null,
        soundComponent: []
      },
      lighting: {
        overall: null,
        lightingComponent: []
      },
      visualLoad: {
        level: null,
        visualComponent: []
      },
      transitions: {
        changes: []
      },
      calmZones: {
        availability: null,
        features: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  3: Object.freeze({
    id: "maople.review",
    version: 3,
    formVersion: "2026-05-01",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movement: {
        quickAccess: [],
        continuity: null,
        statements: {}
      },
      wayfinding: {
        clarity: null,
        statements: {}
      },
      sound: {
        overall: null,
        conversationComfort: null,
        soundComponent: []
      },
      lighting: {
        overall: null,
        lightingComponent: []
      },
      visualLoad: {
        level: null,
        visualComponent: []
      },
      transitions: {
        changes: []
      },
      calmZones: {
        availability: null,
        features: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  4: Object.freeze({
    id: "maople.review",
    version: 4,
    formVersion: "2026-05-01",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      movement: {
        quickAccess: [],
        continuity: null,
        statements: {}
      },
      wayfinding: {
        clarity: null,
        statements: {}
      },
      sound: {
        overall: null,
        conversationComfort: null,
        soundComponent: []
      },
      lighting: {
        overall: null,
        lightingComponent: []
      },
      visualLoad: {
        level: null,
        visualComponent: []
      },
      transitions: {
        changes: []
      },
      calmZones: {
        availability: null,
        features: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  5: Object.freeze({
    id: "maople.review",
    version: 5,
    formVersion: "2026-05-01",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      levelsFacilities: {
        interLevelAccess: null,
        rampFeel: null,
        availableFacilities: []
      },
      movement: {
        quickAccess: [],
        continuity: null,
        statements: {}
      },
      wayfinding: {
        clarity: null,
        statements: {}
      },
      sound: {
        overall: null,
        conversationComfort: null,
        soundComponent: []
      },
      lighting: {
        overall: null,
        lightingComponent: []
      },
      visualLoad: {
        level: null,
        visualComponent: []
      },
      transitions: {
        changes: []
      },
      calmZones: {
        availability: null,
        features: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  6: Object.freeze({
    id: "maople.review",
    version: 6,
    formVersion: "2026-05-01",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      levelsFacilities: {
        interLevelAccess: null,
        rampFeel: null,
        availableFacilities: []
      },
      movement: {
        quickAccess: [],
        continuity: null,
        statements: {}
      },
      wayfinding: {
        clarity: null,
        statements: {}
      },
      sound: {
        overall: null,
        conversationComfort: null,
        soundComponent: []
      },
      lighting: {
        overall: null,
        lightingComponent: []
      },
      visualLoad: {
        level: null,
        visualComponent: []
      },
      transitions: {
        changes: []
      },
      calmZones: {
        availability: null,
        features: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  7: Object.freeze({
    id: "maople.review",
    version: 7,
    formVersion: "2026-05-09",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      levelsFacilities: {
        interLevelAccess: null,
        rampFeel: null,
        availableFacilities: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  8: Object.freeze({
    id: "maople.review",
    version: 8,
    formVersion: "2026-05-09",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      levelsFacilities: {
        interLevelAccess: [],
        rampFeel: null,
        helpfulFeatures: [],
        availableFacilities: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  9: Object.freeze({
    id: "maople.review",
    version: 9,
    formVersion: "2026-05-09",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      levelsFacilities: {
        interLevelAccess: [],
        rampFeel: null,
        helpfulFeatures: [],
        availableFacilities: []
      },
      findingYourWay: {
        unsureLevel: null,
        confusingFactors: [],
        signsClarity: null,
        hardToUnderstandFactors: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  10: Object.freeze({
    id: "maople.review",
    version: 10,
    formVersion: "2026-05-09",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      levelsFacilities: {
        interLevelAccess: [],
        rampFeel: null,
        helpfulFeatures: [],
        availableFacilities: []
      },
      findingYourWay: {
        unsureLevel: null,
        confusingFactors: [],
        signsClarity: null,
        hardToUnderstandFactors: []
      },
      howItFelt: {
        comfortImpact: null,
        discomfortFactors: [],
        offGuardLevel: null,
        offGuardFactors: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  11: Object.freeze({
    id: "maople.review",
    version: 11,
    formVersion: "2026-05-09",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      levelsFacilities: {
        interLevelAccess: [],
        rampFeel: null,
        helpfulFeatures: [],
        availableFacilities: []
      },
      findingYourWay: {
        unsureLevel: null,
        confusingFactors: [],
        signsClarity: null,
        hardToUnderstandFactors: []
      },
      howItFelt: {
        comfortImpact: null,
        discomfortFactors: [],
        offGuardLevel: null,
        offGuardFactors: []
      },
      takingABreak: {
        calmSpotEase: null,
        calmAreaHardFactors: [],
        sitRestAvailability: null,
        longStayManageability: null,
        longStayDifficultFactors: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  12: Object.freeze({
    id: "maople.review",
    version: 12,
    formVersion: "2026-05-09",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      levelsFacilities: {
        interLevelAccess: [],
        rampFeel: null,
        helpfulFeatures: [],
        availableFacilities: []
      },
      findingYourWay: {
        unsureLevel: null,
        confusingFactors: [],
        signsClarity: null,
        hardToUnderstandFactors: []
      },
      howItFelt: {
        comfortImpact: null,
        discomfortFactors: [],
        offGuardLevel: null,
        offGuardFactors: []
      },
      takingABreak: {
        calmSpotEase: null,
        calmAreaHardFactors: [],
        sitRestAvailability: null,
        longStayManageability: null,
        longStayDifficultFactors: []
      },
      feelingSafe: {
        openVisible: null,
        hiddenAreas: null,
        getHelpEase: null
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  }),
  13: Object.freeze({
    id: "maople.review",
    version: 13,
    formVersion: "2026-05-09",
    sections: {
      visit: {
        timeOfDay: null,
        companions: [],
        busyLevel: null
      },
      arriving: {
        firstEntry: null,
        groundCondition: null,
        entryBarriers: []
      },
      movingAround: {
        flowFeel: null,
        slowFactors: [],
        gettingToThings: null,
        harderFactors: [],
        observedConditions: []
      },
      levelsFacilities: {
        interLevelAccess: [],
        rampFeel: null,
        helpfulFeatures: [],
        availableFacilities: []
      },
      findingYourWay: {
        unsureLevel: null,
        confusingFactors: [],
        signsClarity: null,
        hardToUnderstandFactors: []
      },
      howItFelt: {
        comfortImpact: null,
        discomfortFactors: [],
        offGuardLevel: null,
        offGuardFactors: []
      },
      takingABreak: {
        calmSpotEase: null,
        calmAreaHardFactors: [],
        sitRestAvailability: null,
        longStayManageability: null,
        longStayDifficultFactors: []
      },
      feelingSafe: {
        openVisible: null,
        hiddenAreas: null,
        getHelpEase: null
      },
      whoItMayWorkFor: {
        comfortableFor: [],
        difficultFor: []
      },
      positives: {
        highlights: [],
        note: ""
      }
    }
  })
});

const ACTIVE_REVIEW_SCHEMA_VERSION = 13;
const ACTIVE_REVIEW_SCHEMA = REVIEW_SCHEMA_REGISTRY[ACTIVE_REVIEW_SCHEMA_VERSION];

window.REVIEW_SCHEMA = ACTIVE_REVIEW_SCHEMA;
window.REVIEW_SCHEMAS = REVIEW_SCHEMA_REGISTRY;
window.ACTIVE_REVIEW_SCHEMA_VERSION = ACTIVE_REVIEW_SCHEMA_VERSION;
