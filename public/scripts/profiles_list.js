(function () {
  const PROFILES_ENDPOINT_BASE = "/api/profiles/user/";
  const SELECT_PROFILE_ENDPOINT = "/api/user/select-profile";
  const DEFAULT_AVATAR = "/images/profiles/green.png";

  const selectors = {
    grid: ".profiles",
  };

  function showLoading(container, message = "Loading profiles...") {
    container.innerHTML = `
      <div class="w-100 d-flex flex-column align-items-center py-4 text-secondary">
        <div class="spinner-border text-light mb-3" role="status" aria-hidden="true"></div>
        <div>${message}</div>
      </div>
    `;
  }

  function showError(container, message = "Something went wrong.") {
    container.innerHTML = `
      <div class="w-100 d-flex flex-column align-items-center py-4 text-center">
        <div class="text-danger mb-2">${message}</div>
        <button type="button" class="btn btn-sm btn-outline-light" id="profilesRetryBtn">Retry</button>
      </div>
    `;
    const retryBtn = document.getElementById("profilesRetryBtn");
    if (retryBtn) {
      retryBtn.addEventListener("click", loadProfiles);
    }
  }

  function renderEmptyState(container) {
    container.innerHTML = `
      <div class="w-100 d-flex flex-column align-items-center py-5 text-center gap-3">
        <div class="fw-semibold fs-5">No profiles yet</div>
        <div class="text-secondary">Head over to Settings to create your first profile.</div>
        <a class="btn btn-danger" href="/settings">Go to Settings</a>
      </div>
    `;
  }

  async function selectProfile(profile) {
    if (!profile) return;

    const avatar = profile.avatar || profile.image || DEFAULT_AVATAR;

    try {
      const response = await fetch(SELECT_PROFILE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "same-origin", // Include session cookie
        body: JSON.stringify({
          profileId: profile._id || profile.id || "",
          profileName: profile.name || "Profile",
          profileImage: avatar,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to select profile");
      }

      // Profile selection successful, redirect to feed
      window.location.href = "/feed";
    } catch (error) {
      console.error("Error selecting profile:", error);
      alert("Failed to select profile. Please try again.");
    }
  }

  function createProfileTile(profile) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "profile profile-tile";
    button.setAttribute("aria-label", `Use ${profile.name} profile`);
    button.dataset.profileId = profile._id || profile.id || "";

    const avatarWrapper = document.createElement("div");
    avatarWrapper.className = "profile-avatar";
    const img = document.createElement("img");
    img.src = profile.avatar || profile.image || DEFAULT_AVATAR;
    img.alt = `${profile.name} avatar`;
    avatarWrapper.appendChild(img);

    const nameEl = document.createElement("div");
    nameEl.className = "profile-name";
    nameEl.textContent = profile.name;

    button.appendChild(avatarWrapper);
    button.appendChild(nameEl);

    button.addEventListener("click", () => selectProfile(profile));
    button.addEventListener("keyup", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectProfile(profile);
      }
    });

    return button;
  }

  function cacheProfiles(profiles) {
    try {
      const simplified = profiles.map((profile) => ({
        id: profile._id || profile.id,
        name: profile.name,
        avatar: profile.avatar || profile.image || null,
      }));
      localStorage.setItem("profilesCache", JSON.stringify(simplified));
    } catch (err) {
      console.warn("Failed to cache profiles", err);
    }
  }

  async function loadProfiles() {
    const grid = document.querySelector(selectors.grid);
    if (!grid) return;

    // Check session instead of localStorage
    const session = await getSession();
    if (!session || !session.userId) {
      grid.innerHTML = `
        <div class="w-100 d-flex flex-column align-items-center py-5 text-center gap-3">
          <div class="fw-semibold fs-5">You're not logged in</div>
          <div class="text-secondary">Sign in to choose or create profiles.</div>
          <a class="btn btn-danger" href="/login">Go to login</a>
        </div>
      `;
      return;
    }

    showLoading(grid);

    try {
      const response = await fetch(
        `${PROFILES_ENDPOINT_BASE}${session.userId}`,
        {
          credentials: "same-origin", // Include session cookie
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load profiles: ${response.status}`);
      }

      const profiles = await response.json();
      if (!Array.isArray(profiles)) {
        throw new Error("Unexpected response format");
      }

      cacheProfiles(profiles);

      if (profiles.length === 0) {
        renderEmptyState(grid);
        return;
      }

      grid.innerHTML = "";
      profiles.forEach((profile) => {
        const tile = createProfileTile(profile);
        grid.appendChild(tile);
      });
    } catch (error) {
      console.error(error);
      showError(grid, "We couldn't load your profiles. Please try again.");
    }
  }

  window.loadProfiles = loadProfiles;
  document.addEventListener("DOMContentLoaded", loadProfiles);
})();
