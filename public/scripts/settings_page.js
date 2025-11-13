/**
 * EXPLANATION: Updated settings_page.js for session-based authentication
 * 
 * KEY CHANGES:
 * 1. Removed localStorage.getItem("userId") - now uses getSession()
 * 2. Removed localStorage.setItem("profilesCache") - caching removed (server is source of truth)
 * 3. Added credentials: 'same-origin' to all fetch requests
 * 4. Updated initialization to use async getSession()
 * 
 * Benefits:
 * - UserId fetched from server session
 * - Profile data always fresh from server
 * - No client-side caching issues
 * - More secure
 */

(function () {
  const FALLBACK_AVATARS = [
    "/images/profiles/white.png",
    "/images/profiles/green.png",
    "/images/profiles/pink.png",
    "/images/profiles/purple.png",
    "/images/profiles/yellow.png",
  ];
  const DEFAULT_AVATAR_API = "/api/profiles/default-avatars";
  const MAX_PROFILES = 5;
  const NAME_REGEX = /^[A-Za-z0-9 _-]{1,32}$/;

  const state = {
    userId: null, // Changed: Will be set from session
    profiles: [],
    selectedProfileId: null,
    mode: "idle", // idle | edit | create
    defaultAvatars: [...FALLBACK_AVATARS],
    avatarSelection: {
      source: "default", // default | upload | existing
      url: FALLBACK_AVATARS[0],
      file: null,
    },
  };

  const selectors = {
    card: ".settings-card",
    profilesList: "#profilesList",
    profilesListEmpty: "#profilesListEmpty",
    addProfileBtn: "#addProfileBtn",
    createFirstProfileBtn: "#createFirstProfileBtn",
    editorForm: "#profileEditorForm",
    editorEmptyState: "#profileEditorEmptyState",
    flash: "#profileEditorFlash",
    avatarPreview: "#profileAvatarPreview",
    defaultAvatarGrid: "#defaultAvatarGrid",
    avatarUpload: "#avatarUploadInput",
    profileNameInput: "#profileNameInput",
    saveButton: "#saveProfileBtn",
    deleteButton: "#deleteProfileBtn",
    cancelButton: "#cancelEditBtn",
    statsTab: "#statisticsTab",
    statsLoadingState: "#statsLoadingState",
    statsContent: "#statsContent",
    statsEmptyState: "#statsEmptyState",
  };

  const elements = {};
  let defaultAvatarButtons = [];
  let uploadPreviewUrl = null;

  function getDefaultAvatar(index = 0) {
    const fromState = state.defaultAvatars?.[index];
    if (fromState) return fromState;
    return FALLBACK_AVATARS[index] || FALLBACK_AVATARS[0];
  }

  function sanitiseAvatarUrl(url) {
    if (!url) return null;
    try {
      const trimmed = url.trim();
      return trimmed ? trimmed : null;
    } catch (error) {
      console.warn("Invalid avatar url", url, error);
      return null;
    }
  }

  function applyDefaultAvatars(urls) {
    const unique = Array.from(
      new Set((urls || []).map(sanitiseAvatarUrl).filter(Boolean))
    );

    state.defaultAvatars = unique.length ? unique : [...FALLBACK_AVATARS];
    renderDefaultAvatarGrid();

    if (state.avatarSelection.source === "default") {
      const nextUrl = state.defaultAvatars.includes(state.avatarSelection.url)
        ? state.avatarSelection.url
        : state.defaultAvatars[0];
      setAvatarSelection({ source: "default", url: nextUrl, file: null });
    } else {
      updateAvatarGridSelection();
    }
  }

  async function loadDefaultAvatars() {
    try {
      const response = await fetch(DEFAULT_AVATAR_API, {
        credentials: 'same-origin', // Include session cookie
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch default avatars (${response.status})`);
      }

      const data = await response.json();
      const urls = Array.isArray(data?.avatars)
        ? data.avatars
        : Array.isArray(data)
        ? data
        : [];
      applyDefaultAvatars(urls);
    } catch (error) {
      console.warn("Falling back to bundled avatars", error);
      applyDefaultAvatars(FALLBACK_AVATARS);
    }
  }

  function initElements() {
    Object.entries(selectors).forEach(([key, selector]) => {
      elements[key] = document.querySelector(selector);
    });
  }

  /**
   * EXPLANATION: ensureUserSession function
   * 
   * CRITICAL CHANGE: Now uses getSession() instead of localStorage
   * 
   * Old: state.userId = localStorage.getItem("userId")
   * New: Fetches session from server and validates authentication
   * 
   * This ensures the page only works with valid server sessions
   */
  async function ensureUserSession() {
    try {
      const session = await getSession();
      
      if (!session || !session.isAuthenticated || !session.userId) {
        const card = elements.card;
        if (card) {
          card.innerHTML = `
            <section class="stats-placeholder py-5">
              <i class="bi bi-lock mb-3"></i>
              <h3>You're not logged in</h3>
              <p class="text-secondary">Sign in to manage profiles and view statistics.</p>
              <a href="/login" class="btn btn-danger">Go to login</a>
            </section>
          `;
        }
        return false;
      }
      
      state.userId = session.userId;
      return true;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  }

  function bindEvents() {
    if (elements.addProfileBtn) {
      elements.addProfileBtn.addEventListener("click", enterCreateMode);
    }
    if (elements.createFirstProfileBtn) {
      elements.createFirstProfileBtn.addEventListener("click", enterCreateMode);
    }
    if (elements.editorForm) {
      elements.editorForm.addEventListener("submit", handleSaveProfile);
    }
    if (elements.deleteButton) {
      elements.deleteButton.addEventListener("click", handleDeleteProfile);
    }
    if (elements.cancelButton) {
      elements.cancelButton.addEventListener("click", handleCancelEdit);
    }
    if (elements.avatarUpload) {
      elements.avatarUpload.addEventListener("change", handleAvatarUpload);
    }
    const statsTabTrigger = document.querySelector("#stats-tab");
    if (statsTabTrigger) {
      statsTabTrigger.addEventListener("shown.bs.tab", () => {
        document.dispatchEvent(new CustomEvent("settings:stats-tab-opened"));
      });
    }
  }

  function renderDefaultAvatarGrid() {
    if (!elements.defaultAvatarGrid) return;
    elements.defaultAvatarGrid.innerHTML = "";
    defaultAvatarButtons = state.defaultAvatars.map((url) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "btn p-0";
      button.innerHTML = `<img src="${url}" alt="Default avatar" />`;
      button.addEventListener("click", () => {
        setAvatarSelection({ source: "default", url, file: null });
        if (elements.avatarUpload) {
          elements.avatarUpload.value = "";
        }
      });
      elements.defaultAvatarGrid.appendChild(button);
      return button;
    });
    updateAvatarGridSelection();
  }

  function updateAvatarGridSelection() {
    if (!defaultAvatarButtons.length) return;
    const selectedUrl =
      state.avatarSelection.source === "default"
        ? state.avatarSelection.url
        : null;
    defaultAvatarButtons.forEach((btn) => {
      if (
        selectedUrl &&
        btn.querySelector("img")?.getAttribute("src") === selectedUrl
      ) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
  }

  function setAvatarSelection(selection) {
    state.avatarSelection = {
      source: selection.source,
      url: selection.url || state.avatarSelection.url || getDefaultAvatar(0),
      file: selection.file || null,
    };
    updateAvatarPreview();
    updateAvatarGridSelection();
  }

  function updateAvatarPreview() {
    if (!elements.avatarPreview) return;

    if (uploadPreviewUrl) {
      URL.revokeObjectURL(uploadPreviewUrl);
      uploadPreviewUrl = null;
    }

    let src = state.avatarSelection.url || getDefaultAvatar(0);
    if (
      state.avatarSelection.source === "upload" &&
      state.avatarSelection.file
    ) {
      uploadPreviewUrl = URL.createObjectURL(state.avatarSelection.file);
      src = uploadPreviewUrl;
    }
    elements.avatarPreview.src = src;
  }

  function renderProfilesLoading() {
    if (elements.profilesList) {
      elements.profilesList.innerHTML = `
        <div class="d-flex justify-content-center py-4">
          <div class="spinner-border text-light" role="status" aria-hidden="true"></div>
        </div>
      `;
    }
  }

  function renderProfilesList() {
    if (!elements.profilesList) return;

    elements.profilesList.innerHTML = "";

    if (!state.profiles.length) {
      elements.profilesListEmpty?.classList.remove("d-none");
      updateAddButtonState();
      return;
    }

    elements.profilesListEmpty?.classList.add("d-none");

    state.profiles.forEach((profile) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "profile-list-item";
      button.setAttribute("role", "option");
      button.dataset.profileId = profile._id || profile.id || "";
      button.innerHTML = `
        <img src="${profile.avatar || getDefaultAvatar(0)}" alt="${
        profile.name
      } avatar" />
        <span>${profile.name}</span>
      `;

      if (button.dataset.profileId === state.selectedProfileId) {
        button.classList.add("profile-list-item--active");
      }

      button.addEventListener("click", () => {
        enterEditMode(button.dataset.profileId);
      });

      elements.profilesList.appendChild(button);
    });

    updateAddButtonState();
  }

  function updateAddButtonState() {
    const disabled = state.profiles.length >= MAX_PROFILES;
    if (elements.addProfileBtn) {
      elements.addProfileBtn.disabled = disabled;
      elements.addProfileBtn.title = disabled ? "Profile limit reached" : "";
    }
    if (elements.createFirstProfileBtn) {
      elements.createFirstProfileBtn.disabled = disabled;
    }
  }

  function showEditor() {
    elements.editorForm?.classList.remove("d-none");
    elements.editorEmptyState?.classList.add("d-none");
  }

  function hideEditor(showEmpty = true) {
    elements.editorForm?.classList.add("d-none");
    if (showEmpty) {
      elements.editorEmptyState?.classList.remove("d-none");
    }
  }

  function resetForm() {
    if (elements.profileNameInput) {
      elements.profileNameInput.value = "";
    }
    if (elements.avatarUpload) {
      elements.avatarUpload.value = "";
    }
    setAvatarSelection({
      source: "default",
      url: getDefaultAvatar(0),
      file: null,
    });
    elements.deleteButton?.classList.add("d-none");
    clearFlash();
  }

  function enterCreateMode() {
    if (state.profiles.length >= MAX_PROFILES) {
      showFlash("danger", "You can create up to five profiles per user.");
      return;
    }

    state.mode = "create";
    state.selectedProfileId = null;
    resetForm();
    showEditor();
    highlightSelectedProfile(null);
    elements.profileNameInput.focus();
  }

  function getProfileById(profileId) {
    return (
      state.profiles.find(
        (profile) => (profile._id || profile.id) === profileId
      ) || null
    );
  }

  function enterEditMode(profileId, preserveFlash = false) {
    const profile = getProfileById(profileId);
    if (!profile) return;

    state.mode = "edit";
    state.selectedProfileId = profileId;

    showEditor();
    if (!preserveFlash) {
      clearFlash();
    }
    elements.deleteButton?.classList.remove("d-none");

    elements.profileNameInput.value = profile.name;

    setAvatarSelection({
      source: "existing",
      url: profile.avatar || getDefaultAvatar(0),
      file: null,
    });

    highlightSelectedProfile(profileId);
  }

  function highlightSelectedProfile(profileId) {
    const buttons =
      elements.profilesList?.querySelectorAll(".profile-list-item") || [];
    buttons.forEach((btn) => {
      btn.classList.toggle(
        "profile-list-item--active",
        btn.dataset.profileId === profileId
      );
    });
  }

  function handleAvatarUpload(event) {
    const file = event.target?.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showFlash("danger", "Image too large. Please choose a file under 2MB.");
      event.target.value = "";
      return;
    }

    setAvatarSelection({ source: "upload", url: null, file });
  }

  function handleCancelEdit() {
    if (state.mode === "create") {
      if (state.profiles.length) {
        state.mode = "edit";
        enterEditMode(state.profiles[0]._id || state.profiles[0].id);
      } else {
        state.mode = "idle";
        hideEditor(true);
      }
    } else if (state.mode === "edit" && state.selectedProfileId) {
      enterEditMode(state.selectedProfileId);
    } else {
      hideEditor(true);
    }
  }

  function clearFlash() {
    if (!elements.flash) return;
    elements.flash.classList.add("d-none");
    elements.flash.textContent = "";
    elements.flash.classList.remove("alert-danger", "alert-success");
  }

  function showFlash(type, message) {
    if (!elements.flash) return;
    elements.flash.classList.remove("alert-danger", "alert-success");
    if (type === "danger") {
      elements.flash.classList.add("alert", "alert-danger");
    } else {
      elements.flash.classList.add("alert", "alert-success");
    }
    elements.flash.textContent = message;
    elements.flash.classList.remove("d-none");
  }

  function setSaving(isSaving) {
    if (elements.saveButton) {
      elements.saveButton.disabled = isSaving;
      elements.saveButton.innerHTML = isSaving
        ? '<span class="spinner-border spinner-border-sm me-2" role="status"></span>Saving...'
        : "Save changes";
    }
    if (elements.deleteButton) {
      elements.deleteButton.disabled = isSaving;
    }
    if (elements.addProfileBtn) {
      elements.addProfileBtn.disabled =
        isSaving || state.profiles.length >= MAX_PROFILES;
    }
  }

  function validateProfileName(name) {
    if (!name) {
      showFlash("danger", "Profile name is required.");
      return false;
    }
    if (!NAME_REGEX.test(name)) {
      showFlash(
        "danger",
        "Use letters, numbers, spaces, hyphens or underscores only."
      );
      return false;
    }
    return true;
  }

  async function fileFromUrl(url, fileName = "avatar.png") {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to load avatar image");
    }
    const blob = await response.blob();
    return new File([blob], fileName, { type: blob.type || "image/png" });
  }

  async function handleSaveProfile(event) {
    event.preventDefault();
    if (!elements.profileNameInput) return;

    const name = elements.profileNameInput.value.trim();
    if (!validateProfileName(name)) {
      return;
    }

    try {
      setSaving(true);
      clearFlash();

      if (state.mode === "create") {
        await createProfile(name);
        showFlash("success", "Profile created successfully.");
      } else if (state.mode === "edit" && state.selectedProfileId) {
        const changes = await updateProfile(state.selectedProfileId, name);
        if (!changes) {
          showFlash("success", "Profile is already up to date.");
        } else {
          showFlash("success", "Profile updated successfully.");
        }
      } else {
        showFlash("danger", "Select a profile first.");
        return;
      }

      await loadProfiles(state.selectedProfileId, true);
    } catch (error) {
      console.error(error);
      showFlash("danger", error.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function createProfile(name) {
    const fd = new FormData();
    fd.append("name", name);
    fd.append("userId", state.userId);

    if (
      state.avatarSelection.source === "upload" &&
      state.avatarSelection.file
    ) {
      fd.append("avatar", state.avatarSelection.file);
    } else {
      const avatarUrl = state.avatarSelection.url || getDefaultAvatar(0);
      fd.append("avatarUrl", avatarUrl);
    }

    const response = await fetch("/api/profiles/create", {
      method: "POST",
      credentials: 'same-origin', // Include session cookie
      body: fd,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to create profile");
    }
  }

  async function updateProfile(profileId, name) {
    const currentProfile = getProfileById(profileId);
    if (!currentProfile) {
      throw new Error("Profile not found");
    }

    const fd = new FormData();
    let hasChanges = false;

    if (name && name !== currentProfile.name) {
      fd.append("name", name);
      hasChanges = true;
    }

    if (state.avatarSelection.source === "default") {
      const avatarUrl = state.avatarSelection.url;
      if (!avatarUrl || avatarUrl === currentProfile.avatar) {
        // no change
      } else {
        fd.append("avatarUrl", avatarUrl);
        hasChanges = true;
      }
    } else if (
      state.avatarSelection.source === "upload" &&
      state.avatarSelection.file
    ) {
      fd.append("avatar", state.avatarSelection.file);
      hasChanges = true;
    }

    if (!hasChanges) {
      return false;
    }

    const response = await fetch(`/api/profiles/${profileId}`, {
      method: "PUT",
      credentials: 'same-origin', // Include session cookie
      body: fd,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || "Failed to update profile");
    }

    return true;
  }

  async function handleDeleteProfile() {
    if (!state.selectedProfileId) return;

    const profile = getProfileById(state.selectedProfileId);
    if (!profile) return;

    const confirmed = window.confirm(
      `Delete profile "${profile.name}"? This cannot be undone.`
    );
    if (!confirmed) return;

    try {
      setSaving(true);

      const response = await fetch(`/api/profiles/${state.selectedProfileId}`, {
        method: "DELETE",
        credentials: 'same-origin', // Include session cookie
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to delete profile");
      }

      showFlash("success", "Profile deleted.");

      const remainingProfiles = state.profiles.filter(
        (p) => (p._id || p.id) !== state.selectedProfileId
      );
      const nextSelection = remainingProfiles.length
        ? remainingProfiles[0]._id || remainingProfiles[0].id
        : null;

      await loadProfiles(nextSelection);
    } catch (error) {
      console.error(error);
      showFlash("danger", error.message || "Unable to delete profile.");
    } finally {
      setSaving(false);
    }
  }

  async function loadProfiles(
    preferredSelection = null,
    preserveFlash = false
  ) {
    if (!state.userId) return;

    renderProfilesLoading();

    try {
      const response = await fetch(`/api/profiles/user/${state.userId}`, {
        credentials: 'same-origin' // Include session cookie
      });
      if (!response.ok) {
        throw new Error("Failed to load profiles");
      }
      const profiles = await response.json();
      if (!Array.isArray(profiles)) {
        throw new Error("Unexpected response from server");
      }

      state.profiles = profiles;

      renderProfilesList();

      if (!state.profiles.length) {
        enterCreateMode();
        return;
      }

      let targetId = preferredSelection;
      if (!targetId || !getProfileById(targetId)) {
        if (
          state.selectedProfileId &&
          getProfileById(state.selectedProfileId)
        ) {
          targetId = state.selectedProfileId;
        } else {
          targetId = state.profiles[0]._id || state.profiles[0].id;
        }
      }

      enterEditMode(targetId, preserveFlash);
    } catch (error) {
      console.error(error);
      if (elements.profilesList) {
        elements.profilesList.innerHTML = `
          <div class="text-center py-4">
            <p class="text-danger mb-2">Unable to load profiles.</p>
            <button type="button" class="btn btn-outline-light btn-sm" id="profilesReloadBtn">Retry</button>
          </div>
        `;
        const retryBtn = document.getElementById("profilesReloadBtn");
        retryBtn?.addEventListener("click", () =>
          loadProfiles(preferredSelection)
        );
      }
    }
  }

  function initialiseStatsPlaceholder() {
    document.addEventListener(
      "settings:stats-tab-opened",
      () => {
        document.dispatchEvent(new CustomEvent("settings:load-stats"));
      },
      { once: true }
    );
  }

  /**
   * EXPLANATION: Async initialization
   * 
   * CRITICAL CHANGE: Now async to await getSession()
   * 
   * Flow:
   * 1. Initialize DOM elements
   * 2. Fetch and validate session from server
   * 3. If valid, proceed with normal initialization
   * 4. If invalid, show login prompt
   */
  async function init() {
    initElements();
    const hasSession = await ensureUserSession();
    if (!hasSession) return;
    bindEvents();
    renderDefaultAvatarGrid();
    updateAvatarPreview();
    loadDefaultAvatars();
    initialiseStatsPlaceholder();
    loadProfiles();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
