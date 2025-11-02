// Settings & Profiles Manager + Statistics (Charts)
// Assumptions:
// - Environment variables SERVER_URL and SERVER_PORT exposed via global (window) or replaced at build. We'll fallback to localhost:3000.
// - Backend endpoints (REST):
//    GET    /profiles              -> list [{id,name,image_url}]
//    POST   /profiles              -> create {name,image_url}
//    PUT    /profiles/:id          -> update {name,image_url}
//    DELETE /profiles/:id          -> delete
// (If endpoints differ, adjust fetchProfile* functions.)

(function () {
  const MAX_PROFILES = 5;
  const baseProfilesEndpoint = "/api/profiles";
  const singleProfileCreateEndpoint = "/api/profiles/create";

  // Elements
  const profilesListEl = () => document.getElementById("profilesList");
  const profilesCountLabelEl = () =>
    document.getElementById("profilesCountLabel");
  const addProfileBtn = () => document.getElementById("addProfileBtn");
  const profileFormWrapper = () =>
    document.getElementById("profileFormWrapper");
  const profileForm = () => document.getElementById("profileForm");
  const profileFormTitle = () => document.getElementById("profileFormTitle");
  const profileIdInput = () => document.getElementById("profileId");
  const profileNameInput = () => document.getElementById("profileName");
  const profileImageFileInput = () =>
    document.getElementById("profileImageFile");
  const imagePreviewEl = () => document.getElementById("imagePreview");
  const cancelProfileBtn = () => document.getElementById("cancelProfileBtn");

  // State
  let profiles = [];

  // Fetch helpers
  async function apiGet(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("GET failed: " + r.status);
    return r.json();
  }
  async function apiMultipart(method, url, formData) {
    const r = await fetch(url, { method, body: formData });
    if (!r.ok) throw new Error(method + " failed: " + r.status);
    return r.json();
  }
  async function fetchProfiles() {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) throw new Error("No userId in localStorage");
      // Route: GET /api/profiles/user/:userId
      profiles = await apiGet(baseProfilesEndpoint + "/user/" + userId);
    } catch (err) {
      console.error("Failed loading profiles, using fallback.", err);
      // Fallback: try localStorage cache or sample
      profiles = JSON.parse(localStorage.getItem("profilesCache") || "[]");
    }
    localStorage.setItem("profilesCache", JSON.stringify(profiles));
    renderProfiles();
  }
  async function createProfile({ name, file }) {
    try {
      const fd = new FormData();
      const userId = localStorage.getItem("userId");
      fd.append("name", name);
      if (file) fd.append("avatar", file); // server expects req.file (multer) and uses media.uploadFromMultipart
      fd.append("userId", userId);
      const created = await apiMultipart("POST", singleProfileCreateEndpoint, fd);
      // After create, refresh profiles list from backend to reflect authoritative state
      await fetchProfiles();
    } catch (err) {
      console.error("Create failed, using temp ID.", err);
      const objectUrl = file
        ? URL.createObjectURL(file)
        : "../images/profiles/white.png";
      // fallback local optimistic add
      profiles.push({ id: "temp-" + Date.now(), name, image_url: objectUrl });
    }
    renderProfiles();
  }
  async function updateProfile(id, { name, file }) {
    try {
      const fd = new FormData();
      fd.append("name", name);
      if (file) fd.append("avatar", file);
      // Route: PUT /api/profiles/:profileId (multer single 'avatar')
      const updated = await apiMultipart("PUT", baseProfilesEndpoint + "/" + id, fd);
      // After successful update, refresh list from backend
      await fetchProfiles();
    } catch (err) {
      console.error("Update failed, applying client-side only.", err);
      const p = profiles.find((p) => String(p.id) === String(id));
      if (p) {
        p.name = name;
        if (file) {
          p.image_url = URL.createObjectURL(file);
        }
      }
    }
    renderProfiles();
  }
  async function deleteProfile(id) {
    try {
      // Route: DELETE /api/profiles/:profileId
      const res = await fetch(baseProfilesEndpoint + "/" + id, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed: " + res.status);
    } catch (err) {
      console.warn("Delete failed, removing locally.", err);
    }
    // Refresh profiles from backend (or remove locally if backend failed)
    await fetchProfiles();
  }

  // Rendering
  function renderProfiles() {
    const list = profilesListEl();
    if (!list) return;
    list.innerHTML = "";
    profilesCountLabelEl().textContent = `(${profiles.length}/${MAX_PROFILES})`;

    addProfileBtn().disabled = profiles.length >= MAX_PROFILES;
    addProfileBtn().classList.toggle("disabled", addProfileBtn().disabled);

    if (profiles.length === 0) {
      list.innerHTML =
        '<p class="text-secondary">No profiles yet. Click "Add Profile" to create one.</p>';
      return;
    }

    // Ensure each profile has `id` normalized to either `id` or `_id`
    profiles = profiles.map((p) => ({ ...p, id: p.id || p._id }));

    profiles.forEach((p) => {
      const col = document.createElement("div");
      col.className = "col mb-3";
      const card = document.createElement("div");
      card.className = "card h-100 bg-black border-secondary profile-card";

      const img = document.createElement("img");
      img.src = p.avatar || p.image_url;
      img.alt = p.name;
      img.className = "card-img-top profile-thumb";
      img.onerror = () => (img.src = "../images/profiles/white.png");
      card.appendChild(img);

      const cardBody = document.createElement("div");
      cardBody.className = "card-body p-2 d-flex flex-column";

      const title = document.createElement("h6");
      title.className = "card-title text-truncate mb-2 text-white";
      title.title = p.name;
      title.textContent = p.name;
      cardBody.appendChild(title);

      const buttonContainer = document.createElement("div");
      buttonContainer.className = "mt-auto d-flex gap-2";

      const editButton = document.createElement("button");
      editButton.className = "btn btn-sm btn-outline-light flex-grow-1";
      editButton.setAttribute("data-action", "edit");
      editButton.setAttribute("data-id", p.id);
      editButton.innerHTML = '<i class="bi bi-pencil"></i>';
      buttonContainer.appendChild(editButton);

      const deleteButton = document.createElement("button");
      deleteButton.className = "btn btn-sm btn-outline-danger";
      deleteButton.setAttribute("data-action", "delete");
      deleteButton.setAttribute("data-id", p.id);
      deleteButton.innerHTML = '<i class="bi bi-trash"></i>';
      buttonContainer.appendChild(deleteButton);

      cardBody.appendChild(buttonContainer);
      card.appendChild(cardBody);

      col.appendChild(card);
      list.appendChild(col);
    });
  }

  function escapeHtml(str) {
    return String(str || "").replace(
      /[&<>"]+/g,
      (s) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[s])
    );
  }

  // Profile form handlers
  function openCreateForm() {
    profileFormWrapper().style.display = "block";
    profileFormTitle().textContent = "Create Profile";
    profileIdInput().value = "";
    profileNameInput().value = "";
    if (profileImageFileInput()) profileImageFileInput().value = "";
    resetPreview();
  }
  function openEditForm(profile) {
    profileFormWrapper().style.display = "block";
    profileFormTitle().textContent = "Edit Profile";
    profileIdInput().value = profile.id;
    profileNameInput().value = profile.name;
    setPreview(profile.image_url);
  }
  function closeForm() {
    profileFormWrapper().style.display = "none";
  }

  function bindEvents() {
    // Add button
    addProfileBtn().addEventListener("click", () => openCreateForm());

    // Cancel
    cancelProfileBtn().addEventListener("click", () => closeForm());

    // Submit
    profileForm().addEventListener("submit", (e) => {
      e.preventDefault();
      const id = profileIdInput().value.trim();
      const name = profileNameInput().value.trim();
      const fileInput = profileImageFileInput();
      const file = fileInput && fileInput.files && fileInput.files[0];
      if (!name) return;
      if (id) {
        updateProfile(id, { name, file });
      } else {
        if (profiles.length >= MAX_PROFILES) {
          alert("Maximum profiles reached");
          return;
        }
        createProfile({ name, file });
      }
      closeForm();
    });

    // Delegated actions
    profilesListEl().addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-action]");
      if (!btn) return;
      const id = btn.getAttribute("data-id");
      const action = btn.getAttribute("data-action");
      const profile = profiles.find((p) => String(p.id) === String(id));
      if (action === "edit" && profile) {
        openEditForm(profile);
      } else if (action === "delete") {
        if (confirm("Delete this profile?")) deleteProfile(id);
      }
    });

    // Preview updates when file chosen
    if (profileImageFileInput()) {
      profileImageFileInput().addEventListener("change", () => {
        const file =
          profileImageFileInput().files && profileImageFileInput().files[0];
        if (file) {
          const url = URL.createObjectURL(file);
          setPreview(url);
        } else {
          resetPreview();
        }
      });
    }

    // When modal shown refresh profiles
    const settingsModal = document.getElementById("settingsModal");
    settingsModal.addEventListener("show.bs.modal", () => {
      fetchProfiles();
    });

    // Charts initialization when Stats tab becomes visible
    const statsTabTrigger = document.getElementById("stats-tab");
    statsTabTrigger.addEventListener("shown.bs.tab", () => {
      renderStatistics();
    });
  }

  // ------------------- Statistics --------------------
  let dailyChartInstance = null;
  let popularityChartInstance = null;

  function generateDailyWatchesData() {
    // Last 7 days labels
    const days = [...Array(7)].map((_, i) => {
      const d = new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000);
      return d.toLocaleDateString(undefined, { weekday: "short" });
    });
    // For each profile random watches 0-10 (simulate) – real impl would call backend
    const datasets = profiles.map((p) => ({
      label: p.name,
      data: days.map(() => Math.floor(Math.random() * 11)),
      borderWidth: 1,
    }));
    // Assign colors
    const palette = [
      "#e50914",
      "#e87c03",
      "#46d369",
      "#2fb7f5",
      "#a259ff",
      "#ffd700",
    ];
    datasets.forEach((ds, i) => {
      const c = palette[i % palette.length];
      ds.backgroundColor = c + "80";
      ds.borderColor = c;
    });
    return { days, datasets };
  }

  function generateContentPopularity() {
    // Aggregate likes from localStorage as a proxy for popularity
    const likesDataAll = JSON.parse(localStorage.getItem("likesData")) || {};
    const totals = Object.entries(likesDataAll).map(([id, entry]) => ({
      id,
      total: Number(entry.base || 0) + Number(entry.extra || 0),
    }));
    totals.sort((a, b) => b.total - a.total);
    const top = totals.slice(0, 6);
    const labels = top.map((t) => t.id);
    const data = top.map((t) => t.total);
    const colors = [
      "#e50914",
      "#e87c03",
      "#46d369",
      "#2fb7f5",
      "#a259ff",
      "#ffd700",
    ];
    return { labels, data, colors };
  }

  function renderStatistics() {
    // Daily Watches
    const dailyCtx = document.getElementById("dailyWatchesChart");
    const popularityCtx = document.getElementById("contentPopularityChart");
    if (!dailyCtx || !popularityCtx) return;

    const { days, datasets } = generateDailyWatchesData();
    if (dailyChartInstance) {
      dailyChartInstance.destroy();
    }
    dailyChartInstance = new Chart(dailyCtx, {
      type: "bar",
      data: { labels: days, datasets },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: "#fff" } } },
        scales: {
          x: {
            ticks: { color: "#bbb" },
            grid: { color: "rgba(255,255,255,0.1)" },
          },
          y: {
            ticks: { color: "#bbb" },
            grid: { color: "rgba(255,255,255,0.1)" },
            beginAtZero: true,
          },
        },
      },
    });

    const { labels, data, colors } = generateContentPopularity();
    if (popularityChartInstance) {
      popularityChartInstance.destroy();
    }
    popularityChartInstance = new Chart(popularityCtx, {
      type: "pie",
      data: { labels, datasets: [{ data, backgroundColor: colors }] },
      options: { plugins: { legend: { labels: { color: "#fff" } } } },
    });
  }

  // Image preview helpers
  function setPreview(url) {
    const wrap = imagePreviewEl();
    if (!wrap) return;
    wrap.innerHTML = `<img src="${escapeHtml(
      url
    )}" alt="preview" class="w-100 h-100 object-fit-cover" />`;
  }
  function resetPreview() {
    const wrap = imagePreviewEl();
    if (!wrap) return;
    wrap.innerHTML = '<span class="text-secondary small">No Image</span>';
  }

  // Initialize after DOM ready
  document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("settingsModal")) return; // safety
    bindEvents();
  });
})();
