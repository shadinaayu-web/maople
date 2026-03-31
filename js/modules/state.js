// ---------- GLOBAL STATE ----------

export const state = {

  // --- Places + map data ---

  map: null,
  
  places: [],

  mapMarkers: [],

  selectedLocation: null,

  draftMarker: null,
  draftMarkerLocked: false,
  draftMarkerPopup: null,


  // --- Add place workflow ---

  addPlaceState: {
    step: "idle",
    selectedPlace: null,
    entranceLocation: null
  },


  // --- Review form state ---

  currentStep: 0,

  reviewMode: null,

  editingPlaceId: null,


  // --- Filters ---

  activeFilters: {
    profiles: [],
    tags: [],
    dimensions: {},
    quickFilters: []
  },


  // --- User ---

  currentUserId: "anonymous",

  user: {
    user_id: "anonymous",
    username: null,
    email: null,
    password_hash: null,
    profiles: [],
    saved_places: [],
    saved_lists: [],
    reviews: [],
    contribution_stats: {
      reviews_count: 0,
      places_added: 0,
      last_active: null
    },
    badges: []
  },

  activeProfileId: null,
  profileSetupComplete: false,

  groupMode: {
    active: false,
    memberIds: []
  }

};
