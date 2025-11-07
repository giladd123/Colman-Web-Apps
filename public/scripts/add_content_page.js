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

// Video tabs
let lastVideoTab = "file";
const videoTabs = videoFields.querySelectorAll(".video-tab");
const uploadOption = document.getElementById("uploadOption");
const urlOption = document.getElementById("urlOption");

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
  input.classList.add("is-invalid");
  let errorEl = input.nextElementSibling;
  if (!errorEl || !errorEl.classList.contains("error-message")) {
    errorEl = document.createElement("div");
    errorEl.className = "error-message active";
    input.parentNode.insertBefore(errorEl, input.nextSibling);
  }
  errorEl.textContent = message;
  errorEl.classList.add("active");
}

function clearError(input) {
  input.classList.remove("is-invalid");
  const errorEl = input.nextElementSibling;
  if (errorEl && errorEl.classList.contains("error-message")) {
    errorEl.classList.remove("active");
    errorEl.textContent = "";
  }
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

async function checkSeriesExists(seriesTitle) {
  if (!seriesTitle.trim()) return false;
  try {
    const res = await fetch(
      `/admin/fetch-imdb?title=${encodeURIComponent(seriesTitle)}&type=series`
    );
    const data = await res.json();
    return !data.error;
  } catch (err) {
    console.error(err);
    return false;
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

// --- Video Tabs ---
videoTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    videoTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    if (tab.dataset.type === "file") {
      uploadOption.style.display = "block";
      urlOption.style.display = "none";
      lastVideoTab = "file";
    } else {
      uploadOption.style.display = "none";
      urlOption.style.display = "block";
      lastVideoTab = "url";
    }
  });
});

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
  titleField.placeholder = type === "episode" ? "Series Title" : "Title";
  yearField.style.display = type === "episode" ? "none" : "block";
  releaseDateField.style.display = type === "episode" ? "block" : "none";
  if (type === "episode" && !releaseDateField.value)
    releaseDateField.value = new Date().toISOString().split("T")[0];
  // Reset video tab
  videoTabs.forEach((t) => t.classList.remove("active"));
  const activeTab = Array.from(videoTabs).find(
    (t) => t.dataset.type === lastVideoTab
  );
  if (activeTab) activeTab.classList.add("active");
  uploadOption.style.display = lastVideoTab === "file" ? "block" : "none";
  urlOption.style.display = lastVideoTab === "url" ? "block" : "none";
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
  const seasonField = form.querySelector('input[name="seasonNumber"]');
  const episodeField = form.querySelector('input[name="episodeNumber"]');
  let query = `?title=${encodeURIComponent(titleField.value.trim())}`;
  if (type === "episode")
    query += `&season=${encodeURIComponent(
      seasonField.value
    )}&episode=${encodeURIComponent(episodeField.value)}`;

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
      if (data.seriesTitle) titleField.value = data.seriesTitle;
      if (data.episodeTitle) episodeTitleField.value = data.episodeTitle;
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
// --- Form Submission ---
form.addEventListener("submit", async (e) => {
  e.preventDefault(); // immediately stop default submission

  let valid = true;

  // Clear previous errors
  [...form.querySelectorAll("input, textarea")].forEach(clearError);

  const type = typeSelect.value;

  // Basic validation
  if (!titleField.value.trim()) {
    showError(titleField, "Title is required");
    valid = false;
  }

  if ((type === "movie" || type === "show") && !descriptionField.value.trim()) {
    showError(descriptionField, "Description is required");
    valid = false;
  }

  if (type === "episode") {
    if (!episodeTitleField.value.trim()) {
      showError(episodeTitleField, "Episode title is required");
      valid = false;
    }

    const seasonField = form.querySelector('input[name="seasonNumber"]');
    const episodeField = form.querySelector('input[name="episodeNumber"]');
    if (!seasonField.value) {
      showError(seasonField, "Season number is required");
      valid = false;
    }
    if (!episodeField.value) {
      showError(episodeField, "Episode number is required");
      valid = false;
    }

    // Check if the series exists
    if (titleField.value.trim()) {
      const exists = await checkSeriesExists(titleField.value);
      if (!exists) {
        showError(
          titleField,
          `Series "${titleField.value}" does not exist. Create the show first before adding an episode.`
        );
        valid = false;
      }
    }
  }

  // Poster URL validation
  const posterUrlField = form.querySelector('input[name="posterUrl"]');
  if (posterUrlField.value && !isValidUrl(posterUrlField.value)) {
    showError(posterUrlField, "Invalid poster URL");
    valid = false;
  }

  // Video validation (required for movie and episode)
  const videoFileField = form.querySelector('input[name="videoFile"]');
  const videoUrlField = form.querySelector('input[name="videoUrl"]');
  if (type === "movie" || type === "episode") {
    if (
      videoFileField &&
      !videoFileField.value &&
      videoUrlField &&
      !videoUrlField.value
    ) {
      showError(
        videoFileField || videoUrlField,
        "Video is required for this type"
      );
      valid = false;
    }
  }

  // Video URL format check
  if (
    videoUrlField &&
    videoUrlField.value &&
    !isValidUrl(videoUrlField.value)
  ) {
    showError(videoUrlField, "Invalid video URL");
    valid = false;
  }

  // Stop submission if invalid
  if (!valid) return;

  // Copy genres to hidden fields
  copyGenresToHidden();

  // Submit the form manually since default was prevented
  form.submit();
});
