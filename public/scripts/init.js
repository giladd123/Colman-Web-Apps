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

    const moviesFromDb = await fetchMoviesFromDB();
    window.movies = Array.isArray(moviesFromDb) ? moviesFromDb : [];

    const feedResponse = await fetchFeedForProfile(selectedProfileId);

    window.currentFeedData = feedResponse;
    window.currentProfile = feedResponse.profile;

    renderFeed(window.currentFeedData, window.currentProfile);

    initializeSearch();
    initializeAlphabeticalSorting();

    // Check admin status and show admin menu if applicable
    await initializeAdminUI();

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
    renderDesktopGenres(genres);
    renderMobileGenres(genres);
  } catch (error) {
    console.error("Error fetching genres:", error);
    renderDesktopGenresMessage("Error loading genres");
    renderMobileGenresMessage("Error loading genres");
  }
}

function renderDesktopGenres(genres) {
  const dropdownMenu = document.getElementById("genresDropdownMenu");
  if (!dropdownMenu) return;

  if (!Array.isArray(genres) || genres.length === 0) {
    renderDesktopGenresMessage("No genres available");
    return;
  }

  dropdownMenu.innerHTML = "";

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

    columns.forEach((columnGenres) => {
      if (!columnGenres.length) return;
      const col = document.createElement("div");
      col.className = "col-4";

      columnGenres.forEach((genre) => {
        const link = document.createElement("a");
        link.className = "dropdown-item text-white";
        link.href = `/genres/${encodeURIComponent(genre)}`;
        link.textContent = genre;
        link.style.padding = "0.25rem 0.75rem";
        link.style.fontSize = "0.9rem";
        col.appendChild(link);
      });

      columnsContainer.appendChild(col);
    });

    const li = document.createElement("li");
    li.appendChild(columnsContainer);
    dropdownMenu.appendChild(li);
    return;
  }

  genres.forEach((genre) => {
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.className = "dropdown-item text-white";
    link.href = `/genres/${encodeURIComponent(genre)}`;
    link.textContent = genre;
    li.appendChild(link);
    dropdownMenu.appendChild(li);
  });
}

function renderDesktopGenresMessage(message) {
  const dropdownMenu = document.getElementById("genresDropdownMenu");
  if (!dropdownMenu) return;
  dropdownMenu.innerHTML = `<li><a class="dropdown-item text-white" href="#">${message}</a></li>`;
}

function renderMobileGenres(genres) {
  const mobileContainer = document.getElementById("genresDropdownMenuMobile");
  if (!mobileContainer) return;

  if (!Array.isArray(genres) || genres.length === 0) {
    renderMobileGenresMessage("No genres available");
    return;
  }

  mobileContainer.innerHTML = "";
  genres.forEach((genre) => {
    const link = document.createElement("a");
    link.className = "text-white text-decoration-none py-1";
    link.href = `/genres/${encodeURIComponent(genre)}`;
    link.textContent = genre;
    link.setAttribute("data-offcanvas-close", "");
    mobileContainer.appendChild(link);
  });
}

function renderMobileGenresMessage(message) {
  const mobileContainer = document.getElementById("genresDropdownMenuMobile");
  if (!mobileContainer) return;
  mobileContainer.innerHTML = `<span class="text-white-50 small">${message}</span>`;
}

// Check if current user is admin and show admin menu
async function checkAndShowAdminMenu() {
  try {
    const userId = localStorage.getItem("userId");
    if (!userId) return;

    const response = await fetch(`/api/user/${userId}`);
    if (!response.ok) return;

    const user = await response.json();

    // Show admin menu if user is admin by username or isAdmin flag
    if (user.username === "bashari" || user.isAdmin) {
      const adminNavItem = document.getElementById("adminNavItem");
      if (adminNavItem) {
        adminNavItem.style.display = "block";
      }
      const adminNavItemMobile = document.getElementById("adminNavItemMobile");
      if (adminNavItemMobile) {
        adminNavItemMobile.style.display = "block";
      }
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
  }
}

// Standalone function to check admin status and show admin dropdown - can be called from any page
async function initializeAdminUI() {
  try {
    const userId = localStorage.getItem("userId");
    if (!userId) return false;

    const response = await fetch(`/api/user/${userId}`);
    if (!response.ok) return false;

    const user = await response.json();

    // Check if user is admin
    const isAdmin = user.username === "bashari" || user.isAdmin;

    if (isAdmin) {
      const adminNavItem = document.getElementById("adminNavItem");
      if (adminNavItem) {
        adminNavItem.style.display = "block";
      }
      const adminNavItemMobile = document.getElementById("adminNavItemMobile");
      if (adminNavItemMobile) {
        adminNavItemMobile.style.display = "block";
      }
    }

    return isAdmin;
  } catch (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
}
