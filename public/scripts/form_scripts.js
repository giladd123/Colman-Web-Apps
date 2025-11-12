// --- Admin Verification ---
async function checkAdminAccess() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    alert("Please log in to access admin functions.");
    window.location.href = "/login";
    return false;
  }

  try {
    const response = await fetch(`/api/user/${userId}`);
    if (!response.ok) {
      throw new Error("User not found");
    }

    const user = await response.json();

    // Check if user is admin (using 'bashari' as admin username)
    if (user.username !== "bashari" && !user.isAdmin) {
      alert("Admin access required. You will be redirected to the main page.");
      window.location.href = "/feed";
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error checking admin access:", error);
    alert("Error verifying admin access. Please log in again.");
    window.location.href = "/login";
    return false;
  }
}

// Check admin access when page loads
document.addEventListener("DOMContentLoaded", async () => {
  const hasAccess = await checkAdminAccess();
  if (hasAccess) {
    restoreFormData();
  }
});

// --- Cached DOM Elements ---
const form = document.querySelector("form");
const typeSelect = form.querySelector('select[name="type"]');
const titleField = form.querySelector("#titleField");
const episodeTitleField = form.querySelector("#episodeTitleField");
const descriptionField = form.querySelector("#descriptionField");
const episodeDescriptionField = form.querySelector("#episodeDescriptionField");
const yearField = form.querySelector('input[name="year"]');
const releaseDateField = form.querySelector("#releaseDateField");
const directorField = form.querySelector("#directorField");
const actorsField = form.querySelector("#actorsField");
const posterUrlField = form.querySelector('input[name="posterUrl"]');
const videoFields = document.getElementById("videoFields");
const episodeFields = document.getElementById("episodeFields");

// IMDb info box
const imdbInfoMessage = document.getElementById("imdbInfoMessage");
const imdbInfoText = document.getElementById("imdbInfoText");
const imdbInfoClose = document.getElementById("imdbInfoClose");

imdbInfoClose.addEventListener("click", () => {
  imdbInfoMessage.style.display = "none";
});

// Genre section
const toggleGenres = document.getElementById("toggleGenres");
const genresContainer = document.getElementById("genresContainer");
const genreOther = document.getElementById("genreOther");
const otherGenresArea = document.getElementById("otherGenresArea");
const addGenreBtn = document.getElementById("addGenreBtn");
const newGenreInput = document.getElementById("newGenreInput");
const addedGenres = document.getElementById("addedGenres");

// IMDb
const imdbCheckbox = document.getElementById("imdbAutoFill");
const imdbRatingContainer = document.getElementById("imdbRatingContainer");
const imdbRatingSpan = document.getElementById("imdbRating");
const imdbLabel = document.querySelector('label[for="imdbAutoFill"]');
const originalImdbLabelText = imdbLabel
  ? imdbLabel.innerText
  : "Pull information from IMDb";

// Clear errors and reset IMDb when user edits these fields
titleField.addEventListener("input", () => {
  clearError(titleField);
  // Reset IMDb data if user edits the title
  if (imdbCheckbox.checked) {
    imdbCheckbox.checked = false;
    imdbLabel.innerText = originalImdbLabelText;
    imdbRatingContainer.style.display = "none";
    imdbRatingSpan.textContent = "N/A";

    // Reset readonly fields
    setReadonlyFields(
      [
        titleField,
        descriptionField,
        directorField,
        actorsField,
        posterUrlField,
        yearField,
        episodeTitleField,
        episodeDescriptionField,
        releaseDateField,
      ],
      false
    );
    setGenresReadonly(false);

    // Clear episode-specific fields if we're in episode mode
    if (typeSelect.value === "episode") {
      episodeTitleField.value = "";
      episodeDescriptionField.value = "";
      releaseDateField.value = new Date().toISOString().split("T")[0];
      posterUrlField.value = "";
    }
  }
});

typeSelect.addEventListener("change", () => {
  clearError(typeSelect);
  // also clear any episode-related anchored error when changing type
  clearErrorByKey("seasonEpisode");
});

// Episode fields (may be hidden) - attach clearing handlers if present
const seasonFieldInit = form.querySelector('input[name="seasonNumber"]');
const episodeFieldInit = form.querySelector('input[name="episodeNumber"]');
const clearSeasonEpisodeErrors = () => {
  clearErrorByKey("seasonEpisode");
  if (seasonFieldInit) {
    clearError(seasonFieldInit);
    seasonFieldInit.classList.remove("is-invalid");
  }
  if (episodeFieldInit) {
    clearError(episodeFieldInit);
    episodeFieldInit.classList.remove("is-invalid");
  }
};
if (seasonFieldInit)
  seasonFieldInit.addEventListener("input", clearSeasonEpisodeErrors);
if (episodeFieldInit)
  episodeFieldInit.addEventListener("input", clearSeasonEpisodeErrors);

// --- Utilities ---
function setReadonlyFields(fields, readonly) {
  fields.forEach((f) => f && (f.readOnly = readonly));
}
function setGenresReadonly(readonly) {
  genresContainer
    .querySelectorAll('input[type="checkbox"][name="genres"]')
    .forEach((cb) => (cb.disabled = readonly));
  if (genreOther) genreOther.disabled = readonly;
  if (newGenreInput) newGenreInput.disabled = readonly;
  if (addGenreBtn) addGenreBtn.disabled = readonly;
  addedGenres
    .querySelectorAll(".remove-genre")
    .forEach((btn) => (btn.disabled = readonly));
}

function showError(input, message) {
  const args = Array.from(arguments);
  const anchor = args[2] || input;
  input.classList.add("is-invalid");
  const key = args[3] || input.name || input.id || "__unknown__";
  let errorEl = document.querySelector(`.error-message[data-for="${key}"]`);
  if (!errorEl) {
    errorEl = document.createElement("div");
    errorEl.className = "error-message active d-block";
    errorEl.dataset.for = key;
    errorEl.style.cssText =
      "color: #dc3545; font-size: 0.875em; margin: -0.5rem 0 1rem 0;";
    anchor.parentNode.insertBefore(errorEl, anchor.nextSibling);
  }
  errorEl.textContent = message;
  errorEl.classList.add("active");
}

function clearError(input) {
  input.classList.remove("is-invalid");
  const key = input.name || input.id;
  if (!key) return;
  const errorEl = document.querySelector(`.error-message[data-for="${key}"]`);
  if (errorEl) {
    errorEl.classList.remove("active");
    errorEl.textContent = "";
    // remove node to avoid stale anchors
    errorEl.remove();
  }
}
// Remove anchored error by explicit key
function clearErrorByKey(key) {
  if (!key) return;
  const errorEl = document.querySelector(`.error-message[data-for="${key}"]`);
  if (errorEl) errorEl.remove();
}

function isValidUrl(url) {
  try {
    if (!url) return false;
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

async function checkShowExists(showTitle) {
  if (!showTitle.trim()) return false;
  try {
    const userId = localStorage.getItem("userId");
    const res = await fetch(
      `/admin/fetch-imdb?title=${encodeURIComponent(
        showTitle
      )}&type=series&userId=${userId}`
    );
    const data = await res.json();
    return !data.error;
  } catch (err) {
    console.error(err);
    return false;
  }
}

function extractContentIdFromAction() {
  const actionAttr = form.getAttribute("action") || "";
  const match = actionAttr.match(/\/edit\/(.+)$/);
  return match ? match[1] : "";
}

function ensureFormContentId(contentId) {
  if (!contentId) return;
  form.dataset.contentId = contentId;
  form.setAttribute("action", `/admin/edit/${contentId}`);
}

const initialContentId = extractContentIdFromAction();
if (initialContentId) ensureFormContentId(initialContentId);

function getCurrentContentId() {
  return form.dataset.contentId || extractContentIdFromAction();
}

// Check if content exists in the database (for edit form validation)
async function checkContentExists(type, title, seasonNumber, episodeNumber) {
  if (!type || !title.trim()) return { exists: false, contentId: null };
  try {
    const userId = localStorage.getItem("userId");
    let url = `/admin/check-content?type=${encodeURIComponent(
      type
    )}&title=${encodeURIComponent(title)}&userId=${userId}`;

    // Add season and episode number for episodes
    if (type === "episode" && seasonNumber && episodeNumber) {
      url += `&seasonNumber=${seasonNumber}&episodeNumber=${episodeNumber}`;
    }

    const res = await fetch(url);
    const data = await res.json();

    if (data.success && data.data) {
      return {
        exists: Boolean(data.data.exists),
        contentId: data.data.contentId || null,
      };
    }
    return { exists: false, contentId: null };
  } catch (err) {
    console.error("Error checking content existence:", err);
    return { exists: false, contentId: null };
  }
}

function copyGenresToHidden() {
  addedGenres.querySelectorAll(".genre-tag").forEach((tag) => {
    const input = tag.querySelector('input[type="hidden"]');
    if (input) input.value = tag.querySelector("span").innerText;
  });
  genresContainer
    .querySelectorAll('input[type="checkbox"][name="genres"]')
    .forEach((cb) => {
      if (cb.checked) {
        let hidden = cb.nextElementSibling;
        if (!hidden || hidden.type !== "hidden") {
          hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = cb.name;
          cb.parentNode.insertBefore(hidden, cb.nextSibling);
        }
        hidden.value = cb.value;
      }
    });
}

// --- Genres Toggle ---
toggleGenres.addEventListener("click", () => {
  const visible = genresContainer.style.display === "block";
  genresContainer.style.display = visible ? "none" : "block";
  toggleGenres.innerText = visible ? "Choose Genres ▾" : "Hide Genres ▴";
});

genreOther.addEventListener("change", () => {
  otherGenresArea.style.display = genreOther.checked ? "block" : "none";
});

addGenreBtn.addEventListener("click", () => {
  const value = newGenreInput.value.trim();
  if (!value) return;
  const tag = document.createElement("div");
  tag.className = "genre-tag";
  tag.innerHTML = `<span>${value}</span><button type="button" class="remove-genre" style="background:none; border:none; color:#e50914; margin-left:6px;">✖</button><input type="hidden" name="genres" value="${value}">`;
  addedGenres.appendChild(tag);
  newGenreInput.value = "";
  tag
    .querySelector(".remove-genre")
    .addEventListener("click", () => tag.remove());
});

// --- Type Handling ---
function updateFormByType() {
  const type = typeSelect.value;
  // Reset display
  videoFields.style.display =
    type === "movie" || type === "episode" ? "block" : "none";
  episodeFields.style.display = type === "episode" ? "flex" : "none";
  episodeTitleField.style.display = type === "episode" ? "block" : "none";
  episodeDescriptionField.style.display = type === "episode" ? "block" : "none";
  descriptionField.style.display = type === "episode" ? "none" : "block";
  genresContainer.parentNode.style.display =
    type === "episode" ? "none" : "block";
  directorField.style.display = type === "episode" ? "none" : "block";
  actorsField.style.display = type === "episode" ? "none" : "block";
  titleField.placeholder = type === "episode" ? "Show Title" : "Title";
  yearField.style.display = type === "episode" ? "none" : "block";
  releaseDateField.style.display = type === "episode" ? "block" : "none";
  if (type === "episode" && !releaseDateField.value)
    releaseDateField.value = new Date().toISOString().split("T")[0];
}
typeSelect.addEventListener("change", updateFormByType);
updateFormByType(); // initial load

// --- IMDb Autofill ---
imdbCheckbox.addEventListener("change", async () => {
  // Hide previous info message
  imdbInfoMessage.style.display = "none";

  if (!imdbCheckbox.checked) {
    imdbLabel.innerText = originalImdbLabelText;
    imdbRatingContainer.style.display = "none";
    imdbRatingSpan.textContent = "N/A";
    setReadonlyFields(
      [
        titleField,
        descriptionField,
        directorField,
        actorsField,
        posterUrlField,
        yearField,
        episodeTitleField,
        episodeDescriptionField,
        releaseDateField,
      ],
      false
    );
    setGenresReadonly(false);
    return;
  }

  if (!titleField.value.trim()) {
    imdbInfoText.innerText = "Enter a title first.";
    imdbInfoMessage.style.display = "block";
    imdbInfoMessage.style.backgroundColor = "#f8d7da"; // red
    imdbCheckbox.checked = false;
    return;
  }

  imdbLabel.innerText = "Fetching from IMDb...";
  imdbCheckbox.disabled = true;
  const type = typeSelect.value;
  // Ensure type is valid before continuing
  const allowedTypes = ["movie", "show", "episode"];
  if (!type || !allowedTypes.includes(type)) {
    const dateRow = document.getElementById("dateRow") || typeSelect;
    showError(typeSelect, "Type is required", dateRow);
    imdbCheckbox.checked = false;
    imdbLabel.innerText = originalImdbLabelText;
    imdbCheckbox.disabled = false;
    return;
  }
  const seasonField = form.querySelector('input[name="seasonNumber"]');
  const episodeField = form.querySelector('input[name="episodeNumber"]');
  // If episode type, require season and episode before fetching
  if (type === "episode") {
    if (
      !seasonField ||
      !episodeField ||
      !seasonField.value ||
      !episodeField.value
    ) {
      const anchor =
        document.getElementById("episodeFields") || seasonField || episodeField;
      const emptySeasonField = !seasonField?.value;
      const emptyEpisodeField = !episodeField?.value;

      showError(
        seasonField || episodeField || typeSelect,
        emptySeasonField && emptyEpisodeField
          ? "Season and episode number are required"
          : emptySeasonField
          ? "Season number is required"
          : "Episode number is required",
        anchor,
        "seasonEpisode"
      );

      // Only mark empty fields as invalid
      if (seasonField)
        seasonField.classList.toggle("is-invalid", emptySeasonField);
      if (episodeField)
        episodeField.classList.toggle("is-invalid", emptyEpisodeField);
      imdbCheckbox.checked = false;
      imdbLabel.innerText = originalImdbLabelText;
      imdbCheckbox.disabled = false;
      return;
    }
  }

  let query = `?title=${encodeURIComponent(titleField.value.trim())}`;
  if (type === "episode")
    query += `&season=${encodeURIComponent(
      seasonField.value
    )}&episode=${encodeURIComponent(episodeField.value)}`;

  // Add userId to query
  const userId = localStorage.getItem("userId");
  query += `&userId=${userId}`;

  try {
    const res = await fetch(`/admin/fetch-imdb${query}`);
    const data = await res.json();
    if (data.error) {
      imdbInfoText.innerText = `IMDb fetch failed: ${data.error}`;
      imdbInfoMessage.style.display = "block";
      imdbInfoMessage.style.backgroundColor = "#f8d7da"; // red
      imdbCheckbox.checked = false;
      imdbLabel.innerText = originalImdbLabelText;
      return;
    }

    // Populate fields
    if (type === "episode") {
      if (data.showTitle) titleField.value = data.showTitle;
      if (data.episodeTitle) {
        episodeTitleField.value = data.episodeTitle;
        clearError(episodeTitleField);
      }
      if (data.description) episodeDescriptionField.value = data.description;
      if (data.poster) posterUrlField.value = data.poster;
      if (data.releaseDate) releaseDateField.value = data.releaseDate;
      setReadonlyFields(
        [
          episodeTitleField,
          episodeDescriptionField,
          releaseDateField,
          posterUrlField,
        ],
        true
      );
      setGenresReadonly(true);
    } else {
      if (data.title) titleField.value = data.title;
      if (data.description) descriptionField.value = data.description;
      if (data.director) directorField.value = data.director;
      if (data.actors)
        actorsField.value = Array.isArray(data.actors)
          ? data.actors.join(", ")
          : data.actors;
      if (data.poster) posterUrlField.value = data.poster;
      if (data.year) yearField.value = data.year;
      if (data.genre && data.genre.length) {
        genresContainer
          .querySelectorAll('input[name="genres"]')
          .forEach((cb) => (cb.checked = data.genre.includes(cb.value)));
      }
      setReadonlyFields(
        [
          descriptionField,
          directorField,
          actorsField,
          yearField,
          posterUrlField,
        ],
        true
      );
      setGenresReadonly(true);
    }

    // Show success directly in label
    imdbLabel.innerHTML = `<span style="color:green;">Data pulled from IMDb ✓</span>`;
  } catch (err) {
    console.error(err);
    imdbInfoText.innerText =
      "IMDb fetch failed: server error. Please try again.";
    imdbInfoMessage.style.display = "block";
    imdbInfoMessage.style.backgroundColor = "#f8d7da"; // red
    imdbCheckbox.checked = false;
    imdbLabel.innerText = originalImdbLabelText;
  } finally {
    imdbCheckbox.disabled = false;
  }
});
// Save form data to sessionStorage
function saveFormData() {
  const formData = {
    type: typeSelect.value,
    title: titleField.value,
    description: descriptionField.value,
    episodeTitle: episodeTitleField.value,
    episodeDescription: episodeDescriptionField.value,
    year: yearField.value,
    releaseDate: releaseDateField.value,
    director: directorField.value,
    actors: actorsField.value,
    posterUrl: posterUrlField.value,
    season: document.querySelector('input[name="seasonNumber"]')?.value,
    episode: document.querySelector('input[name="episodeNumber"]')?.value,
    genres: [
      ...genresContainer.querySelectorAll(
        'input[type="checkbox"][name="genres"]:checked'
      ),
    ].map((cb) => cb.value),
    otherGenres: [...addedGenres.querySelectorAll(".genre-tag span")].map(
      (span) => span.textContent
    ),
  };
  sessionStorage.setItem("addContentFormData", JSON.stringify(formData));
}

// Restore form data from sessionStorage
function restoreFormData() {
  const savedData = sessionStorage.getItem("addContentFormData");
  if (!savedData) return;

  const formData = JSON.parse(savedData);

  // Restore basic fields
  typeSelect.value = formData.type;
  titleField.value = formData.title;
  descriptionField.value = formData.description;
  episodeTitleField.value = formData.episodeTitle;
  episodeDescriptionField.value = formData.episodeDescription;
  yearField.value = formData.year;
  releaseDateField.value = formData.releaseDate;
  directorField.value = formData.director;
  actorsField.value = formData.actors;
  posterUrlField.value = formData.posterUrl;

  // Restore season/episode
  const seasonField = document.querySelector('input[name="seasonNumber"]');
  const episodeField = document.querySelector('input[name="episodeNumber"]');
  if (seasonField) seasonField.value = formData.season;
  if (episodeField) episodeField.value = formData.episode;

  // Restore genres
  genresContainer
    .querySelectorAll('input[type="checkbox"][name="genres"]')
    .forEach((cb) => (cb.checked = formData.genres.includes(cb.value)));

  // Restore other genres
  formData.otherGenres.forEach((genre) => {
    const tag = document.createElement("div");
    tag.className = "genre-tag";
    tag.innerHTML = `<span>${genre}</span><button type="button" class="remove-genre" style="background:none; border:none; color:#e50914; margin-left:6px;">✖</button><input type="hidden" name="genres" value="${genre}">`;
    addedGenres.appendChild(tag);
    tag
      .querySelector(".remove-genre")
      .addEventListener("click", () => tag.remove());
  });

  // Update form visibility based on type
  updateFormByType();

  // Clear storage after restore
  sessionStorage.removeItem("addContentFormData");
}

// --- Form Submission ---
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // immediately stop default submission

  let valid = true;

  // Clear previous errors (include selects)
  [...form.querySelectorAll("input, textarea, select")].forEach(clearError);

  const type = typeSelect.value;
  const isEditForm = form.action.includes("/edit/");

  // Validate type selection and show anchored error below the entire form-row
  const allowedTypes = ["movie", "show", "episode"];
  if (!type || !allowedTypes.includes(type)) {
    const typeRow = typeSelect.closest(".form-row");
    showError(typeSelect, "Type is required", typeRow);
    valid = false;
  }

  // Basic validation
  if (!titleField.value.trim()) {
    showError(titleField, "Title is required");
    valid = false;
  }

  if (
    !isEditForm &&
    (type === "movie" || type === "show") &&
    !descriptionField.value.trim()
  ) {
    showError(descriptionField, "Description is required");
    valid = false;
  }

  if (type === "episode") {
    // First check if the show exists before any other episode validations (only for add form)
    if (!isEditForm && titleField.value.trim()) {
      const exists = await checkShowExists(titleField.value);
      if (!exists) {
        showError(
          titleField,
          `Show "${titleField.value}" does not exist. Create the show first before adding an episode.`
        );
        valid = false;
        return; // Stop further validations if show doesn't exist
      }
    }

    // Episode title is only required for new episodes (add form)
    if (!isEditForm && !episodeTitleField.value.trim()) {
      showError(episodeTitleField, "Episode title is required");
      valid = false;
    }

    const seasonField = form.querySelector('input[name="seasonNumber"]');
    const episodeField = form.querySelector('input[name="episodeNumber"]');
    // Combined validation: if either missing, show a single anchored error
    if (
      !seasonField ||
      !episodeField ||
      !seasonField.value ||
      !episodeField.value
    ) {
      const anchor =
        document.getElementById("episodeFields") || seasonField || episodeField;
      const emptySeasonField = !seasonField?.value;
      const emptyEpisodeField = !episodeField?.value;

      showError(
        seasonField || episodeField || typeSelect,
        emptySeasonField && emptyEpisodeField
          ? "Season and episode number are required"
          : emptySeasonField
          ? "Season number is required"
          : "Episode number is required",
        anchor,
        "seasonEpisode"
      );

      // Only mark the empty field as invalid
      if (seasonField)
        seasonField.classList.toggle("is-invalid", emptySeasonField);
      if (episodeField)
        episodeField.classList.toggle("is-invalid", emptyEpisodeField);
      valid = false;
    }
  }

  // Poster URL validation
  const posterUrlField = form.querySelector('input[name="posterUrl"]');
  if (posterUrlField.value && !isValidUrl(posterUrlField.value)) {
    showError(posterUrlField, "Invalid poster URL");
    valid = false;
  }

  // Video validation (required for movie and episode, but not for updates if no new file)
  const videoFileField = form.querySelector('input[name="videoFile"]');
  if (type === "movie" || type === "episode") {
    if (!isEditForm && (!videoFileField || !videoFileField.value)) {
      showError(videoFileField, "MP4 video file is required for this type");
      valid = false;
    }
  }

  // Stop submission if invalid
  if (!valid) return;

  // For edit forms, check if the content exists in the database
  if (isEditForm && type && titleField.value.trim()) {
    const seasonField = form.querySelector('input[name="seasonNumber"]');
    const episodeField = form.querySelector('input[name="episodeNumber"]');

    const contentInfo = await checkContentExists(
      type,
      titleField.value,
      seasonField?.value,
      episodeField?.value
    );

    if (!contentInfo.exists) {
      let errorMessage = `No ${type} found with title "${titleField.value}"`;

      if (type === "episode" && seasonField?.value && episodeField?.value) {
        errorMessage = `No episode found with title "${titleField.value}", season ${seasonField.value}, episode ${episodeField.value}`;
      }

      // Show error on title field
      showError(titleField, errorMessage);
      return; // Stop submission
    }

    ensureFormContentId(contentInfo.contentId);
  }

  // Copy genres to hidden fields
  copyGenresToHidden();

  // Add userId to form for admin validation - ensure this happens right before submission
  const userId = localStorage.getItem("userId");
  if (userId) {
    // Remove any existing userId input first
    const existingUserIdInputs = form.querySelectorAll('input[name="userId"]');
    existingUserIdInputs.forEach((input) => input.remove());

    // Create new hidden input for userId
    const userIdInput = document.createElement("input");
    userIdInput.type = "hidden";
    userIdInput.name = "userId";
    userIdInput.value = userId;

    // Insert at the very beginning of the form
    form.insertBefore(userIdInput, form.firstChild);

    console.log("Added userId to form just before submission:", userId);

    // Verify it was added by checking form data
    const formData = new FormData(form);
    if (formData.has("userId")) {
      console.log("Verified: userId is in form data:", formData.get("userId"));
    } else {
      console.error("ERROR: userId was not properly added to form data");
    }
  } else {
    console.error("No userId found in localStorage for admin validation");
    alert("Admin session expired. Please refresh the page and log in again.");
    return;
  }

  // Save form data before submission
  saveFormData();

  // Submit the form manually since default was prevented
  form.submit();
});

// --- Delete Functionality ---
const deleteBtn = document.getElementById("deleteBtn");
if (deleteBtn) {
  deleteBtn.addEventListener("click", async () => {
    // Validate required fields before opening delete modal
    let valid = true;

    // Clear previous errors
    clearError(typeSelect);
    clearError(titleField);

    const type = typeSelect.value;
    const allowedTypes = ["movie", "show", "episode"];

    // Validate type
    if (!type || !allowedTypes.includes(type)) {
      const typeRow = typeSelect.closest(".form-row");
      showError(typeSelect, "Type is required", typeRow);
      valid = false;
    }

    // Validate title
    if (!titleField.value.trim()) {
      showError(titleField, "Title is required");
      valid = false;
    }

    // If validation fails, stop here
    if (!valid) {
      return;
    }

    // Check if the content exists in the database
    const seasonField = form.querySelector('input[name="seasonNumber"]');
    const episodeField = form.querySelector('input[name="episodeNumber"]');

    const contentInfo = await checkContentExists(
      type,
      titleField.value,
      seasonField?.value,
      episodeField?.value
    );

    if (!contentInfo.exists) {
      let errorMessage = `No ${type} found with title "${titleField.value}"`;

      if (type === "episode" && seasonField?.value && episodeField?.value) {
        errorMessage = `No episode found with title "${titleField.value}", season ${seasonField.value}, episode ${episodeField.value}`;
      }

      // Show error on title field
      showError(titleField, errorMessage);
      return; // Stop deletion
    }

    ensureFormContentId(contentInfo.contentId);

    const contentTitle = titleField.value || "this content";
    const contentType = typeSelect.value || "content";

    // Create custom modal
    const modalHtml = `
      <div id="deleteModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 9999; display: flex; align-items: center; justify-content: center;">
        <div style="background: #1a1a1a; border: 2px solid #e50914; border-radius: 8px; padding: 2rem; max-width: 500px; width: 90%; color: white;">
          <h3 style="color: #e50914; margin-top: 0; margin-bottom: 1rem;"><span style="color: #e50914;">⚠️</span> Confirm Deletion</h3>
          <p style="margin-bottom: 1rem;">You are about to permanently delete:</p>
          <p style="background: #333; padding: 0.75rem; border-radius: 4px; margin-bottom: 1rem;"><strong>${contentType}</strong>: "${contentTitle}"</p>
          <p style="margin-bottom: 0.5rem;">To confirm, please type the title exactly as shown above:</p>
          <input type="text" id="deleteConfirmInput" style="width: 100%; padding: 0.75rem; margin-bottom: 0.5rem; border: 2px solid #555; border-radius: 4px; background: #2a2a2a; color: white; font-size: 1rem;" placeholder="Type title here..." />
          <p id="deleteError" style="color: #e50914; font-size: 0.875rem; margin: 0.5rem 0; min-height: 1.2rem;"></p>
          <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
            <button id="confirmDeleteBtn" style="flex: 1; padding: 0.75rem; background: #e50914; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 1rem;">Delete</button>
            <button id="cancelDeleteBtn" style="flex: 1; padding: 0.75rem; background: #555; color: white; border: none; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 1rem;">Cancel</button>
          </div>
        </div>
      </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    const modal = document.getElementById("deleteModal");
    const confirmInput = document.getElementById("deleteConfirmInput");
    const confirmBtn = document.getElementById("confirmDeleteBtn");
    const cancelBtn = document.getElementById("cancelDeleteBtn");
    const errorMsg = document.getElementById("deleteError");

    // Focus input
    confirmInput.focus();

    // Clear error on input
    confirmInput.addEventListener("input", () => {
      errorMsg.textContent = "";
      confirmInput.style.borderColor = "#555";
    });

    // Cancel button
    cancelBtn.addEventListener("click", () => {
      modal.remove();
    });

    // Click outside modal to close
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // Confirm delete
    confirmBtn.addEventListener("click", async () => {
      const inputValue = confirmInput.value.trim();

      if (inputValue !== contentTitle) {
        errorMsg.textContent = "Title does not match. Please type it exactly.";
        confirmInput.style.borderColor = "#e50914";
        confirmInput.focus();
        return;
      }

      // Get content ID from the form action URL
      let contentId = getCurrentContentId();

      if (!contentId && contentInfo.contentId) {
        ensureFormContentId(contentInfo.contentId);
        contentId = contentInfo.contentId;
      }

      if (!contentId) {
        errorMsg.textContent = "Unable to determine content id for deletion.";
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
        confirmBtn.textContent = "Delete";
        return;
      }

      try {
        confirmBtn.disabled = true;
        cancelBtn.disabled = true;
        confirmBtn.textContent = "Deleting...";

        const userId = localStorage.getItem("userId");
        const response = await fetch(`/admin/delete/${contentId}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ userId: userId }),
        });

        const result = await response.json();

        if (result.success) {
          modal.remove();
          const redirectUrl =
            result.redirect || result.data?.redirect || "/admin/delete-success";
          window.location.href = redirectUrl;
        } else {
          errorMsg.textContent = result.error || "Failed to delete content";
          confirmBtn.disabled = false;
          cancelBtn.disabled = false;
          confirmBtn.textContent = "Delete";
        }
      } catch (error) {
        console.error("Delete error:", error);
        errorMsg.textContent = "Error deleting content. Please try again.";
        confirmBtn.disabled = false;
        cancelBtn.disabled = false;
        confirmBtn.textContent = "Delete";
      }
    });

    // Allow Enter key to confirm
    confirmInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        confirmBtn.click();
      }
    });
  });
}
