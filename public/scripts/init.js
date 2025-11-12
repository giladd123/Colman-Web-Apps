async function initializeApp() {
  const loadingIndicator = document.getElementById("loading");
  if (loadingIndicator) loadingIndicator.style.display = "block";

  try {
    const [selectedProfileId, selectedProfileName, selectedProfileImage] =
      getProfileIfLoggedIn();

    updateHelloMessages(selectedProfileName);

    const profileImg = document.getElementById("currentProfileImg");
    if (profileImg && selectedProfileImage)
      profileImg.src = selectedProfileImage;

    const profileImgMobile = document.getElementById("currentProfileImgMobile");
    if (profileImgMobile && selectedProfileImage)
      profileImgMobile.src = selectedProfileImage;

    window.movies = await fetchMoviesFromDB();

    const feedResponse = await fetchFeedForProfile(selectedProfileId);

    window.currentFeedData = feedResponse;
    window.currentProfile = feedResponse.profile;

    renderFeed(window.currentFeedData, window.currentProfile);

    initializeSearch();
    initializeAlphabeticalSorting();

    if (loadingIndicator) loadingIndicator.style.display = "none";

    await initializeGenresDropdown();
  } catch (error) {
    console.error("Error initializing feed:", error);
    if (loadingIndicator) {
      loadingIndicator.innerHTML =
        '<p class="text-white mt-2 mb-0">Failed to load feed. Please refresh.</p>';
      loadingIndicator.style.display = "block";
    }
  }
}

// Initialize the genres dropdown
async function initializeGenresDropdown() {
  try {
    const response = await fetch("/genres/api/genres");
    if (!response.ok) throw new Error("Failed to fetch genres");

    const genres = await response.json();
    const dropdownMenus = [
      document.getElementById("genresDropdownMenu"),
      document.getElementById("genresDropdownMenuMobile"),
    ].filter(Boolean);

    dropdownMenus.forEach((menu) => {
      if (genres.length > 0) {
        populateGenresDropdown(menu, genres);
      } else {
        renderEmptyGenresMenu(menu, "No genres available");
      }
    });
  } catch (error) {
    console.error("Error fetching genres:", error);
    const dropdownMenus = [
      document.getElementById("genresDropdownMenu"),
      document.getElementById("genresDropdownMenuMobile"),
    ].filter(Boolean);
    dropdownMenus.forEach((menu) => {
      renderEmptyGenresMenu(menu, "Error loading genres");
    });
  }
}

function updateHelloMessages(profileName) {
  const safeName = profileName || "";
  const messages = document.querySelectorAll(
    "#helloMessage, #helloMessageMobile"
  );
  messages.forEach((el) => {
    el.innerText = `Hello, ${safeName}`;
  });
}

function populateGenresDropdown(menu, genres) {
  if (!menu) return;
  menu.innerHTML = "";

  if (genres.length > 12) {
    const columnsContainer = document.createElement("div");
    columnsContainer.className = "row g-0";
    columnsContainer.style.minWidth = "400px";
    columnsContainer.style.maxWidth = "600px";

    const itemsPerColumn = Math.ceil(genres.length / 3);
    const columns = [[], [], []];

    genres.forEach((genre, index) => {
      columns[Math.floor(index / itemsPerColumn)].push(genre);
    });

    const useCondensedLayout = true;

    columns.forEach((columnGenres) => {
      if (columnGenres.length === 0) return;
      const col = document.createElement("div");
      col.className = "col-4";

      columnGenres.forEach((genre) => {
        const link = createGenreLink(genre, menu.id === "genresDropdownMenuMobile", {
          condensed: useCondensedLayout,
        });
        col.appendChild(link);
      });

      columnsContainer.appendChild(col);
    });

    const li = document.createElement("li");
    li.appendChild(columnsContainer);
    menu.appendChild(li);
    return;
  }

  const useCondensedLayout = genres.length > 12;

  genres.forEach((genre) => {
    const li = document.createElement("li");
    const link = createGenreLink(genre, menu.id === "genresDropdownMenuMobile", {
      condensed: useCondensedLayout,
    });
    li.appendChild(link);
    menu.appendChild(li);
  });
}

function renderEmptyGenresMenu(menu, message) {
  if (!menu) return;
  menu.innerHTML = `<li><a class="dropdown-item text-white" href="#">${message}</a></li>`;
}

function createGenreLink(genre, shouldDismissOffcanvas, options = {}) {
  const a = document.createElement("a");
  a.className = "dropdown-item text-white";
  a.href = `/genres/${encodeURIComponent(genre)}`;
  a.textContent = genre;
  if (options.condensed) {
    a.style.padding = "0.25rem 0.75rem";
    a.style.fontSize = "0.9rem";
  }
  if (shouldDismissOffcanvas) {
    a.setAttribute("data-offcanvas-close", "");
  }
  return a;
}
