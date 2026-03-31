import { state } from "./state.js";
import { renderPlaces } from "./markers.js";
import { requestFilterPulse } from "./filters.js";

const STORAGE_KEY = "maople_profile_setup";
const STORAGE_DATA_KEY = "maople_profile_data";
const USER_STORAGE_KEY = "maople_user";

const SCENARIOS = [
  { id: "work-study", label: "&#128187; Work / Study" },
  { id: "casual-meetup", label: "&#9749; Casual Meet-Up" },
  { id: "night-out", label: "&#127866; Night Out" },
  { id: "relax-stay", label: "&#128719; Relax & Stay" },
  { id: "quick-stop", label: "&#9889; Quick Stop" },
  { id: "wheelchair", label: "&#9855; Wheelchair / Stroller" },
  { id: "sensory-friendly", label: "&#127807; Sensory-Friendly" },
  { id: "easy-convo", label: "&#128172; Easy Conversation" },
  { id: "hidden-gems", label: "&#10024; Hidden Gems" }
];

const NEEDS = [
  {
    id: "noise",
    title: "Noise tolerance",
    left: "Quiet",
    right: "Lively",
    helper: "Do you prefer quieter places or don't mind noise?"
  },
  {
    id: "visual",
    title: "Visual environment",
    left: "Simple",
    right: "Visually busy",
    helper: "Too much visual detail can feel tiring for some people."
  },
  {
    id: "movement",
    title: "Movement ease",
    left: "Very easy",
    right: "Don't mind complexity",
    helper: "Do you prefer places that are easy to move through?"
  },
  {
    id: "effort",
    title: "Physical effort",
    left: "Low effort",
    right: "No preference",
    helper: "Includes stairs, long walking, tight spaces."
  },
  {
    id: "quiet",
    title: "Need for quieter spots",
    left: "Important",
    right: "Not important",
    helper: "Do you usually look for a calmer corner to sit?"
  }
];

const COMPANION_OPTIONS = [
  { id: "child", label: "&#128118; Child / stroller" },
  { id: "elderly", label: "&#128117; Elderly" },
  { id: "mobility", label: "&#9855; Mobility needs" },
  { id: "sensory", label: "&#129504; Sensory-sensitive" },
  { id: "hearing", label: "&#128067; Hearing-related" },
  { id: "service-animal", label: "&#128062; Service animal" }
];

const COMPANION_TAGS = [
  "prefers to sit often",
  "avoids stairs",
  "sensitive to noise",
  "needs clear layout"
];

const SENSITIVE_OPTIONS = [
  { id: "mobility_impairment", label: "Mobility impairment" },
  { id: "wheelchair_user", label: "Wheelchair user" },
  { id: "low_vision", label: "Low vision / blind" },
  { id: "hard_of_hearing", label: "Deaf / hard of hearing" },
  { id: "sensory_sensitive", label: "Sensory sensitivity" },
  { id: "chronic_pain_fatigue", label: "Chronic pain / fatigue" },
  { id: "neurodivergent", label: "Neurodivergent" },
  { id: "prefer_not_to_say", label: "Prefer not to say" }
];

let currentStep = 0;
let localProfiles = [];
let activeProfileId = null;
let authMode = "login";
let showRegisteredStep = false;
let profileFlowActive = false;

export function initProfileSetup() {
  const profileBtn = document.getElementById("profileBtn");
  const prompt = document.getElementById("profileSetupPrompt");
  const promptBtn = document.getElementById("profilePromptBtn");
  const modal = document.getElementById("profileSetupModal");
  const closeBtn = document.getElementById("profileCloseBtn");
  const backBtn = document.getElementById("profileBackBtn");
  const nextBtn = document.getElementById("profileNextBtn");
  const skipBtn = document.getElementById("profileSkipBtn");

  loadUser();
  loadProfiles();

  if (profileBtn && state.currentUserId === "anonymous") {
    profileBtn.textContent = "Sign In";
    profileBtn.classList.add("profile-btn-text");
  }
  updateProfileButton();

  if (profileBtn) {
    profileBtn.addEventListener("click", openProfileSetup);
  }

  if (promptBtn) {
    promptBtn.addEventListener("click", () => {
      if (prompt) prompt.classList.add("hidden");
      openProfileSetup();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeProfileSetup);
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      if (showRegisteredStep) {
        showRegisteredStep = false;
        closeProfileSetup();
        showToast("You can set this up anytime in your profile.");
        return;
      }

      if (!requiresSignup() && !profileFlowActive) {
        closeProfileSetup();
        return;
      }

      if (currentStep > 0) {
        currentStep -= 1;
        renderStep();
      }
    });
  }

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      if (showRegisteredStep) {
        showRegisteredStep = false;
        profileFlowActive = true;
        currentStep = 0;
        renderStep();
        return;
      }

      if (!requiresSignup() && !profileFlowActive) {
        profileFlowActive = true;
        currentStep = 0;
        renderStep();
        return;
      }

      const totalSteps = getTotalSteps();
      if (requiresSignup() && currentStep === 0) {
        const ok = authMode === "signup" ? attemptSignup() : attemptLogin();
        if (!ok) return;
        return;
      } else if (currentStep < totalSteps - 1) {
        currentStep += 1;
        renderStep();
      } else {
        completeProfileSetup();
      }
    });
  }

  if (skipBtn) {
    skipBtn.addEventListener("click", () => {
      completeProfileSetup(true);
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeProfileSetup();
    });
  }
}

export function setActiveProfile(profileId) {
  if (!profileId) return;
  activeProfileId = profileId;
  state.activeProfileId = profileId;
  applyProfileToFilters(getActiveProfile());
}

export function maybePromptProfileSetup() {
  const prompt = document.getElementById("profileSetupPrompt");
  if (!prompt) return;
  if (localStorage.getItem(STORAGE_KEY) === "done") return;
  prompt.classList.remove("hidden");
}

function openProfileSetup() {
  const modal = document.getElementById("profileSetupModal");
  if (!modal) return;
  currentStep = 0;
  authMode = "login";
  showRegisteredStep = false;
  profileFlowActive = false;
  renderStep();
  modal.classList.remove("hidden");
}

function closeProfileSetup() {
  const modal = document.getElementById("profileSetupModal");
  if (!modal) return;
  modal.classList.add("hidden");
}

function loadProfiles() {
  const stored = localStorage.getItem(getProfileStorageKey());
  if (stored) {
    try {
      const payload = JSON.parse(stored);
      localProfiles = (payload?.profiles || []).map(normalizeProfile);
      activeProfileId = payload?.activeProfileId || null;
      if (!localProfiles.length) {
        localProfiles = [createDefaultProfile()];
      }
      if (!activeProfileId) {
        activeProfileId = localProfiles[0].profile_id;
      }
      state.user = buildUserFromProfiles(localProfiles);
      state.activeProfileId = activeProfileId;
      state.profileSetupComplete = true;
      applyProfileToFilters(getActiveProfile());
      return;
    } catch {
      localProfiles = [];
    }
  }

  if (!localProfiles.length) {
    localProfiles = [createDefaultProfile()];
    activeProfileId = localProfiles[0].profile_id;
  }
  syncProfiles();
}

function loadUser() {
  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (!stored) return;
  try {
    const user = JSON.parse(stored);
    if (!user?.user_id) return;
    state.user = {
      ...(state.user || {}),
      ...user
    };
    state.currentUserId = user.user_id || "anonymous";
  } catch {
    // ignore corrupt storage
  }
}

function saveUser() {
  if (!state.user) return;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(state.user));
}

function getProfileStorageKey() {
  const id = state.user?.user_id || "anonymous";
  return `${STORAGE_DATA_KEY}_${id}`;
}

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  requestAnimationFrame(() => toast.classList.add("show"));
  window.setTimeout(() => {
    toast.classList.remove("show");
    window.setTimeout(() => toast.classList.add("hidden"), 200);
  }, 2200);
}

function updateProfileButton() {
  const profileBtn = document.getElementById("profileBtn");
  if (!profileBtn) return;
  if (state.currentUserId === "anonymous") {
    profileBtn.textContent = "Sign In";
    profileBtn.classList.add("profile-btn-text");
  } else {
    profileBtn.classList.remove("profile-btn-text");
    profileBtn.innerHTML = `<span class="profile-btn-icon">${(state.user?.username || "U").slice(0, 1).toUpperCase()}</span>`;
  }
}

function renderStep() {
  const progress = document.getElementById("profileStepProgress");
  const content = document.getElementById("profileStepContent");
  const nextBtn = document.getElementById("profileNextBtn");
  const backBtn = document.getElementById("profileBackBtn");
  const skipBtn = document.getElementById("profileSkipBtn");

  if (!content || !progress || !nextBtn || !backBtn || !skipBtn) return;

  if (showRegisteredStep) {
    progress.textContent = "Account created";
    backBtn.disabled = false;
    backBtn.textContent = "Skip for now";
    nextBtn.textContent = "Set up now";
    skipBtn.style.display = "none";
  } else if (!requiresSignup() && !profileFlowActive) {
    progress.textContent = "Account";
    backBtn.disabled = false;
    backBtn.textContent = "Close";
    nextBtn.textContent = "Set up needs";
    skipBtn.style.display = "none";
  } else {
    const totalSteps = getTotalSteps();
    progress.textContent = `Step ${currentStep + 1} of ${totalSteps}`;
    backBtn.disabled = currentStep === 0;
    backBtn.textContent = "Back";
    nextBtn.textContent = currentStep === totalSteps - 1 ? "Finish" : "Next";
    skipBtn.style.display = currentStep === totalSteps - 1 ? "inline-flex" : "none";
  }

  let stepHtml = "";

  if (showRegisteredStep) {
    stepHtml = renderRegisteredStep();
  } else if (!requiresSignup() && !profileFlowActive) {
    stepHtml = renderAccountStep();
  } else if (requiresSignup() && currentStep === 0) {
    stepHtml = renderAuthStep();
  } else {
    const profileStep = requiresSignup() ? currentStep - 1 : currentStep;
    if (profileStep === 0) {
      stepHtml = renderScenarioStep();
    } else if (profileStep === 1) {
      stepHtml = renderNeedsStep();
    } else if (profileStep === 2) {
      stepHtml = renderCompanionStep();
    } else {
      stepHtml = renderSensitiveStep();
    }
  }

  content.innerHTML = (requiresSignup() && currentStep === 0) || showRegisteredStep || (!requiresSignup() && !profileFlowActive)
    ? stepHtml
    : `
      ${renderProfileSelector()}
      ${stepHtml}
    `;

  if (!(requiresSignup() && currentStep === 0) && !showRegisteredStep && !(!requiresSignup() && !profileFlowActive)) {
    bindProfileSelector(content);
  }

  if (requiresSignup() && currentStep === 0) {
    bindAuthStep(content);
  } else {
    if (showRegisteredStep || (!requiresSignup() && !profileFlowActive)) {
      if (!requiresSignup() && !profileFlowActive) {
        const editBtn = content.querySelector("[data-edit-needs]");
        if (editBtn) {
          editBtn.addEventListener("click", () => {
            profileFlowActive = true;
            currentStep = 0;
            renderStep();
          });
        }
        const logoutBtn = content.querySelector("[data-logout]");
        if (logoutBtn) {
          logoutBtn.addEventListener("click", () => {
            state.currentUserId = "anonymous";
            state.user = {
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
            };
            state.profileSetupComplete = false;
            localProfiles = [createDefaultProfile()];
            activeProfileId = localProfiles[0].profile_id;
            localStorage.removeItem(USER_STORAGE_KEY);
            updateProfileButton();
            closeProfileSetup();
            showToast("Logged out.");
          });
        }
      }
      return;
    }
    const profileStep = requiresSignup() ? currentStep - 1 : currentStep;
    if (profileStep === 0) {
      bindScenarioStep(content);
    } else if (profileStep === 1) {
      bindNeedsStep(content);
    } else if (profileStep === 2) {
      bindCompanionStep(content);
    } else {
      bindSensitiveStep(content);
    }
  }
}

function getTotalSteps() {
  return requiresSignup() ? 5 : 4;
}

function requiresSignup() {
  return state.currentUserId === "anonymous";
}

function renderAuthStep() {
  const user = state.user || {};
  const isSignup = authMode === "signup";
  return `
    <h3>${isSignup ? "Create your account" : "Welcome back"}</h3>
    <p class="profile-step-subtitle">
      ${isSignup
        ? "Your username will be visible to others. You can stay anonymous."
        : "Log in to save preferences and reviews."}
    </p>
    <div class="profile-auth">
      <label class="profile-field">
        <span>${isSignup ? "Email" : "Email or username"}</span>
        <input type="${isSignup ? "email" : "text"}" id="profileEmail" placeholder="${isSignup ? "you@email.com" : "email or username"}" value="${user.email || ""}">
      </label>
      ${isSignup ? `
        <label class="profile-field">
          <span>Username</span>
          <input type="text" id="profileUsername" placeholder="e.g., calmwanderer" value="${user.username || ""}">
        </label>
      ` : ""}
      <label class="profile-field">
        <span>Password</span>
        <input type="password" id="profilePassword" placeholder="${isSignup ? "Create a password" : "Enter your password"}">
      </label>
      <button type="button" class="profile-ghost-btn auth-toggle" data-auth-toggle>
        ${isSignup ? "Already have an account? Log in" : "Don't have an account? Sign up"}
      </button>
    </div>
  `;
}

function renderRegisteredStep() {
  return `
    <h3>You are registered</h3>
    <p class="profile-step-subtitle">Your account is ready. Want to set up your needs profile now?</p>
  `;
}

function renderAccountStep() {
  const username = state.user?.username || "User";
  const email = state.user?.email || "email@example.com";
  const isComplete = state.profileSetupComplete;
  return `
    <h3>Your account</h3>
    <div class="profile-account">
      <div class="profile-avatar">${username.slice(0, 1).toUpperCase()}</div>
      <div>
        <div class="profile-account-name">${username}</div>
        <div class="profile-account-email">${email}</div>
      </div>
    </div>
    <p class="profile-step-subtitle">You can update your needs profile anytime.</p>
    ${!isComplete ? `<div class="profile-incomplete">Needs profile incomplete</div>` : ""}
    <div class="profile-account-actions">
      <button type="button" class="profile-primary-btn" data-edit-needs>Edit needs profile</button>
      <button type="button" class="profile-secondary-btn" data-logout>Log out</button>
    </div>
  `;
}

function bindAuthStep(scope) {
  const toggle = scope.querySelector("[data-auth-toggle]");
  if (toggle) {
    toggle.addEventListener("click", () => {
      authMode = authMode === "login" ? "signup" : "login";
      renderStep();
    });
  }
}

function attemptSignup() {
  const emailInput = document.getElementById("profileEmail");
  const usernameInput = document.getElementById("profileUsername");
  const passwordInput = document.getElementById("profilePassword");

  const email = emailInput?.value.trim();
  const username = usernameInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!email || !username || !password) {
    alert("Please fill in email, username, and password.");
    return false;
  }

  const userId = state.user?.user_id && state.user.user_id !== "anonymous"
    ? state.user.user_id
    : `user_${Date.now()}`;

  state.currentUserId = userId;
  state.user = {
    ...(state.user || {}),
    user_id: userId,
    username,
    email,
    password_hash: `local:${btoa(password).slice(0, 12)}`
  };

  saveUser();
  updateProfileButton();
  showRegisteredStep = true;
  profileFlowActive = false;
  currentStep = 0;
  showToast("You're registered.");
  renderStep();
  return true;
}

function attemptLogin() {
  const emailInput = document.getElementById("profileEmail");
  const passwordInput = document.getElementById("profilePassword");

  const identifier = emailInput?.value.trim();
  const password = passwordInput?.value.trim();

  if (!identifier || !password) {
    alert("Please enter your email/username and password.");
    return false;
  }

  const stored = localStorage.getItem(USER_STORAGE_KEY);
  if (!stored) {
    alert("No account found. Please sign up.");
    authMode = "signup";
    renderStep();
    return false;
  }

  try {
    const user = JSON.parse(stored);
    const hash = `local:${btoa(password).slice(0, 12)}`;
    const matches =
      user?.email === identifier ||
      user?.username === identifier;
    if (!matches || user?.password_hash !== hash) {
      alert("Incorrect email/username or password.");
      return false;
    }

    state.user = {
      ...(state.user || {}),
      ...user
    };
    state.currentUserId = user.user_id || "anonymous";
    updateProfileButton();
    showRegisteredStep = false;
    profileFlowActive = false;
    currentStep = 0;
    renderStep();
    return true;
  } catch {
    alert("Login failed. Please sign up.");
    authMode = "signup";
    renderStep();
    return false;
  }
}

function renderProfileSelector() {
  return `
    <div class="profile-selector">
      <div class="profile-selector-title">Your profiles</div>
      <div class="profile-selector-list">
        ${localProfiles.map(profile => `
          <button type="button" class="profile-selector-btn ${profile.profile_id === activeProfileId ? "active" : ""}" data-profile-id="${profile.profile_id}">
            ${profile.name}
          </button>
        `).join("")}
        <button type="button" class="profile-selector-add" data-add-profile>+ Add new</button>
      </div>
    </div>
  `;
}

function bindProfileSelector(scope) {
  scope.querySelectorAll(".profile-selector-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.profileId;
      if (!id) return;
      activeProfileId = id;
      renderStep();
    });
  });

  const addBtn = scope.querySelector("[data-add-profile]");
  if (addBtn) {
    addBtn.addEventListener("click", () => {
      const newProfile = createProfile("New profile", false);
      localProfiles.push(newProfile);
      activeProfileId = newProfile.profile_id;
      renderStep();
    });
  }
}

function renderScenarioStep() {
  const profile = getActiveProfile();
  return `
    <h3>How do you usually go out?</h3>
    <p class="profile-step-subtitle">Which of these do you do often? (Pick 2-5)</p>
    <div class="profile-card-grid">
      ${SCENARIOS.map(item => `
        <button type="button" class="profile-card ${profile.scenarios?.includes(item.id) ? "selected" : ""}" data-scenario-id="${item.id}">
          ${item.label}
        </button>
      `).join("")}
    </div>
  `;
}

function bindScenarioStep(scope) {
  scope.querySelectorAll(".profile-card").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.dataset.scenarioId;
      if (!id) return;
      const profile = getActiveProfile();
      const set = new Set(profile.scenarios || []);
      if (set.has(id)) {
        set.delete(id);
      } else {
        set.add(id);
      }
      profile.scenarios = Array.from(set);
      card.classList.toggle("selected");
      syncProfiles();
    });
  });
}

function renderNeedsStep() {
  const profile = getActiveProfile();
  return `
    <h3>What usually makes a place work (or not work) for you?</h3>
    <p class="profile-step-subtitle">These are optional. Choose only what matters.</p>
    <div class="needs-list">
      ${NEEDS.map(need => {
        const entry = profile.needs?.[need.id] || {};
        const enabled = entry.enabled ? "checked" : "";
        const value = entry.value ?? 3;
        return `
          <div class="needs-row" data-need-id="${need.id}">
            <div class="needs-row-head">
              <label class="needs-toggle">
                <input type="checkbox" class="need-enable" ${enabled}>
                <span>${need.title}</span>
              </label>
              <span class="needs-status">${entry.enabled ? "Active" : "Optional"}</span>
            </div>
            <div class="needs-helper">${need.helper}</div>
            <div class="needs-slider">
              <span>${need.left}</span>
              <input type="range" min="1" max="5" step="0.1" value="${value}" ${entry.enabled ? "" : "disabled"}>
              <span>${need.right}</span>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function bindNeedsStep(scope) {
  scope.querySelectorAll(".needs-row").forEach(row => {
    const id = row.dataset.needId;
    const toggle = row.querySelector(".need-enable");
    const slider = row.querySelector("input[type=range]");

    if (toggle) {
      toggle.addEventListener("change", () => {
        const profile = getActiveProfile();
        const enabled = toggle.checked;
        slider.disabled = !enabled;
        profile.needs = profile.needs || {};
        profile.needs[id] = {
          enabled,
          value: Number(slider.value)
        };
        updateProfileDerivedFields(profile);
        syncProfiles();
      });
    }

    if (slider) {
      slider.addEventListener("input", () => {
        const profile = getActiveProfile();
        const enabled = toggle?.checked;
        profile.needs = profile.needs || {};
        profile.needs[id] = {
          enabled: !!enabled,
          value: Number(slider.value)
        };
        updateProfileDerivedFields(profile);
        syncProfiles();
      });
    }
  });
}

function renderCompanionStep() {
  const companions = getCompanionProfiles();
  return `
    <h3>Do you go out with others regularly?</h3>
    <p class="profile-step-subtitle">Select anyone you often go with.</p>
    <div class="companion-grid">
      ${COMPANION_OPTIONS.map(opt => {
        const checked = companions.some(p => p.tags?.includes(opt.id));
        return `
          <label class="companion-pill">
            <input type="checkbox" value="${opt.id}" ${checked ? "checked" : ""}>
            <span>${opt.label}</span>
          </label>
        `;
      }).join("")}
    </div>
    <div class="companion-custom">
      <label>Custom companion name</label>
      <input type="text" id="customCompanionName" placeholder="e.g., My mom">
      <div class="companion-tags">
        ${COMPANION_TAGS.map(tag => `
          <label class="companion-tag">
            <input type="checkbox" value="${tag}">
            <span>${tag}</span>
          </label>
        `).join("")}
      </div>
      <button type="button" id="addCustomCompanion" class="profile-secondary-btn">Add custom companion</button>
      <div id="customCompanionList" class="companion-list"></div>
    </div>
  `;
}

function bindCompanionStep(scope) {
  const list = scope.querySelector("#customCompanionList");
  const addBtn = scope.querySelector("#addCustomCompanion");
  const nameInput = scope.querySelector("#customCompanionName");
  const tagInputs = Array.from(scope.querySelectorAll(".companion-tag input"));

  scope.querySelectorAll(".companion-pill input").forEach(input => {
    input.addEventListener("change", () => {
      const id = input.value;
      if (input.checked) {
        addCompanionProfile(id);
      } else {
        removeCompanionProfile(id);
      }
      syncProfiles();
    });
  });

  if (addBtn && nameInput) {
    addBtn.addEventListener("click", () => {
      const name = nameInput.value.trim();
      if (!name) return;
      const tags = tagInputs.filter(i => i.checked).map(i => i.value);
      const custom = createProfile(name, false);
      custom.tags = tags;
      localProfiles.push(custom);
      nameInput.value = "";
      tagInputs.forEach(i => { i.checked = false; });
      renderCustomCompanions(list, getCustomCompanions());
      syncProfiles();
    });
  }

  renderCustomCompanions(list, getCustomCompanions());
}

function renderCustomCompanions(list, items) {
  if (!list) return;
  if (!items.length) {
    list.innerHTML = "";
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="companion-card">
      <strong>${item.name}</strong>
      <div class="companion-card-tags">
        ${(item.tags || []).map(tag => `<span class="tag-chip">${tag}</span>`).join("")}
      </div>
    </div>
  `).join("");
}

function renderSensitiveStep() {
  const profile = getActiveProfile();
  return `
    <h3>Accessibility needs (optional)</h3>
    <p class="profile-step-subtitle">This information helps improve recommendations and helps planners understand accessibility gaps. It will never be shown publicly.</p>
    <div class="sensitive-list">
      ${SENSITIVE_OPTIONS.map(opt => `
        <label class="sensitive-option">
          <input type="checkbox" value="${opt.id}" ${profile.tags?.includes(opt.id) || profile.tags?.includes(opt.label) ? "checked" : ""}>
          <span>${opt.label}</span>
        </label>
      `).join("")}
    </div>
    <div class="profile-summary">
      <h4>Your preferences</h4>
      ${renderSummary()}
    </div>
  `;
}

function bindSensitiveStep(scope) {
  const profile = getActiveProfile();
  scope.querySelectorAll(".sensitive-option input").forEach(input => {
    input.addEventListener("change", () => {
      const set = new Set(profile.tags || []);
      if (input.checked) {
        if (input.value === "prefer_not_to_say") {
          profile.tags = ["prefer_not_to_say"];
        } else {
          set.add(input.value);
          set.delete("prefer_not_to_say");
          profile.tags = Array.from(set);
        }
      } else {
        set.delete(input.value);
        profile.tags = Array.from(set);
      }
      syncProfiles();
    });
  });
}

function renderSummary() {
  const profile = getActiveProfile();
  const prefs = [];
  const needs = profile.needs || {};
  if (needs.noise?.enabled && needs.noise.value <= 2.5) prefs.push("quieter places");
  if (needs.movement?.enabled && needs.movement.value <= 2.5) prefs.push("easy to move around");
  if (needs.quiet?.enabled && needs.quiet.value <= 2.5) prefs.push("calmer corners");
  if (!prefs.length) prefs.push("balanced recommendations");

  return `
    <ul>
      ${prefs.map(p => `<li>${p}</li>`).join("")}
    </ul>
  `;
}

function completeProfileSetup(skipped = false) {
  if (!skipped) {
    syncProfiles();
    localStorage.setItem(getProfileStorageKey(), JSON.stringify({
      profiles: localProfiles,
      activeProfileId
    }));
    localStorage.setItem(STORAGE_KEY, "done");
    state.profileSetupComplete = true;
    applyProfileToFilters(getActiveProfile());
  }

  showRegisteredStep = false;
  profileFlowActive = false;
  closeProfileSetup();
  const prompt = document.getElementById("profileSetupPrompt");
  if (prompt) prompt.classList.add("hidden");
  renderStep();
}

function applyProfileToFilters(profile) {
  if (!profile) return;
  const next = { ...(state.activeFilters.dimensions || {}) };
  const needs = profile.needs || {};
  const getTarget = (value) => 6 - value;

  if (needs.noise?.enabled) {
    next.calmness = { enabled: true, target: getTarget(needs.noise.value), flex: 1, weight: 2 };
  }
  if (needs.visual?.enabled) {
    next.visualCalm = { enabled: true, target: getTarget(needs.visual.value), flex: 1, weight: 2 };
  }
  if (needs.movement?.enabled) {
    next.navigationEase = { enabled: true, target: getTarget(needs.movement.value), flex: 1, weight: 2 };
  }
  if (needs.effort?.enabled) {
    next.accessibility = { enabled: true, target: getTarget(needs.effort.value), flex: 1, weight: 2 };
    next.spaciousness = { enabled: true, target: getTarget(needs.effort.value), flex: 1, weight: 1.5 };
  }
  if (needs.quiet?.enabled) {
    next.quietCorners = { enabled: true, target: getTarget(needs.quiet.value), flex: 1, weight: 2 };
  }

  state.activeFilters.dimensions = next;
  requestFilterPulse();
  renderPlaces();
}

function syncProfiles() {
  state.user = buildUserFromProfiles(localProfiles);
  state.activeProfileId = activeProfileId;
}

function buildUserFromProfiles(profiles) {
  return {
    user_id: state.user?.user_id || "anonymous",
    username: state.user?.username || null,
    email: state.user?.email || null,
    password_hash: state.user?.password_hash || null,
    profiles: profiles,
    saved_places: state.user?.saved_places || [],
    saved_lists: state.user?.saved_lists || [],
    reviews: state.user?.reviews || [],
    contribution_stats: state.user?.contribution_stats || {
      reviews_count: 0,
      places_added: 0,
      last_active: null
    },
    badges: state.user?.badges || []
  };
}

function getActiveProfile() {
  return localProfiles.find(p => p.profile_id === activeProfileId) || localProfiles[0];
}

function getCompanionProfiles() {
  return localProfiles.filter(p => !p.is_self);
}

function addCompanionProfile(id) {
  if (localProfiles.some(p => p.tags?.includes(id))) return;
  const label = COMPANION_OPTIONS.find(opt => opt.id === id)?.label || id;
  const name = stripEmoji(label);
  const profile = createProfile(name, false);
  profile.tags = [id];
  localProfiles.push(profile);
}

function removeCompanionProfile(id) {
  localProfiles = localProfiles.filter(p => !p.tags?.includes(id));
}

function getCustomCompanions() {
  return localProfiles.filter(p => !p.is_self && !p.tags?.some(tag => COMPANION_OPTIONS.some(opt => opt.id === tag)));
}

function createDefaultProfile() {
  return createProfile("Me", true);
}

function createProfile(name, isSelf) {
  return {
    profile_id: createId(),
    name,
    is_self: isSelf,
    mobility_level: null,
    sensory_preference: null,
    navigation_need: null,
    stamina_level: null,
    tags: [],
    visibility: "private",
    scenarios: [],
    needs: {}
  };
}

function updateProfileDerivedFields(profile) {
  const needs = profile.needs || {};
  const toNeedLevel = (value) => {
    if (value <= 2.2) return "high";
    if (value <= 3.4) return "medium";
    return "low";
  };
  const toStamina = (value) => {
    if (value <= 2.2) return "low";
    if (value <= 3.4) return "medium";
    return "high";
  };
  const toPreference = (value) => {
    if (value <= 2.2) return "calm";
    if (value >= 3.8) return "lively";
    return "balanced";
  };

  if (needs.effort?.enabled) {
    profile.mobility_level = toNeedLevel(needs.effort.value);
    profile.stamina_level = toStamina(needs.effort.value);
  }

  if (needs.movement?.enabled) {
    profile.navigation_need = toNeedLevel(needs.movement.value);
  }

  const sensoryValues = [];
  if (needs.noise?.enabled) sensoryValues.push(needs.noise.value);
  if (needs.visual?.enabled) sensoryValues.push(needs.visual.value);
  if (sensoryValues.length) {
    const avg = sensoryValues.reduce((a, b) => a + b, 0) / sensoryValues.length;
    profile.sensory_preference = toPreference(avg);
  }
}

function createId() {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function stripEmoji(label) {
  return label.replace(/&[^;]+;\s*/g, "").trim();
}

function normalizeProfile(profile) {
  if (!profile) return profile;
  const labelToId = new Map(SENSITIVE_OPTIONS.map(opt => [opt.label, opt.id]));
  const tags = (profile.tags || []).map(tag => labelToId.get(tag) || tag);
  return {
    ...profile,
    tags
  };
}
