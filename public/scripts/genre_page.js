let currentGenre = "";
let currentPage = 1;
let currentSort = "default";
let currentSortOrder = "desc";
let currentFilter = "all";
let isLoading = false;
let hasMore = true;
let storedLoopContent = [];
let allContent = [];

// Initialize genre page
function initializeGenrePage(genre) {
  currentGenre = genre;

  document.addEventListener("DOMContentLoaded", function () {
    const loadingIndicator = document.getElementById("loading");
    if (loadingIndicator) loadingIndicator.style.display = "block";

    initializeNavbarForGenrePage()
      .catch((err) => {
        console.error("Failed to initialize navbar for genre page:", err);
      })
      .finally(() => {
        refreshInteractiveStates();
      });

    loadGenreContent(true);
    setupInfiniteScroll();
  });
}

// Initialize basic navbar functionality for genre page
async function initializeNavbarForGenrePage() {
  // Initialize profile display
  const [selectedProfileId, selectedProfileName, selectedProfileImage] =
    getProfileIfLoggedIn();
  updateGenreHelloMessages(selectedProfileName);
  const profileImg = document.getElementById("currentProfileImg");
  if (profileImg && selectedProfileImage) profileImg.src = selectedProfileImage;

  const profileImgMobile = document.getElementById("currentProfileImgMobile");
  if (profileImgMobile && selectedProfileImage)
    profileImgMobile.src = selectedProfileImage;

  // Set up global variables for likes and watchlist functionality
  window.currentProfile = {
    id: selectedProfileId,
    name: selectedProfileName,
    avatar: selectedProfileImage,
  };
  window.currentFeedData = window.currentFeedData || {
    likedBy: [],
    myList: [],
  };

  // Fetch user's feed data to get likes and watchlist info
  const profileKey = selectedProfileName
    ? encodeURIComponent(selectedProfileName)
    : "";
  if (profileKey) {
    try {
      const feedResponse = await fetch(`/feed/${profileKey}`);
      if (feedResponse.ok) {
        window.currentFeedData = await feedResponse.json();
      } else {
        window.currentFeedData = { likedBy: [], myList: [] };
      }
    } catch (error) {
      console.error("Error fetching feed data:", error);
      window.currentFeedData = { likedBy: [], myList: [] };
    }
  }

  // Initialize genres dropdown
  initializeGenresDropdown();

  // Initialize search functionality for genre page
  initializeGenrePageSearch();

  refreshInteractiveStates();
}

// Initialize search functionality specifically for genre page
function initializeGenrePageSearch() {
  const searchPairs = getNavbarSearchPairs();
  if (!searchPairs.length) return;

  searchPairs.forEach(({ icon, input }) => {
    icon.addEventListener("click", () => {
      toggleSearchInputVisibility(searchPairs, input);
    });

    input.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      filterGenreContent(query);
    });
  });

  document.addEventListener("click", (event) => {
    searchPairs.forEach(({ icon, input }) => {
      if (
        !icon.contains(event.target) &&
        event.target !== input &&
        input.style.display === "block" &&
        input.value.trim() === ""
      ) {
        input.style.display = "none";
      }
    });
  });
}

// Filter genre content based on search query
function filterGenreContent(query) {
  const container = document.getElementById("content");
  if (!container) return;

  const cards = container.querySelectorAll(".movie-card");

  cards.forEach((card) => {
    const img = card.querySelector(".movie-poster");
    if (img && img.alt) {
      const titleText = img.alt.toLowerCase();
      if (query === "" || titleText.includes(query)) {
        card.style.display = "block";
      } else {
        card.style.display = "none";
      }
    }
  });
}

function updateGenreHelloMessages(profileName) {
  const safeName = profileName || "";
  const messages = document.querySelectorAll(
    "#helloMessage, #helloMessageMobile"
  );
  messages.forEach((el) => {
    el.innerText = `Hello, ${safeName}`;
  });
}

function getNavbarSearchPairs() {
  return Array.from(document.querySelectorAll("[data-search-target]"))
    .map((icon) => {
      const targetId = icon.getAttribute("data-search-target");
      if (!targetId) return null;
      const input = document.getElementById(targetId);
      if (!input) return null;
      return { icon, input };
    })
    .filter(Boolean);
}

function toggleSearchInputVisibility(pairs, activeInput) {
  pairs.forEach(({ input }) => {
    if (input === activeInput) {
      input.style.display = "block";
      input.focus();
    } else if (input.style.display === "block" && input.value.trim() === "") {
      input.style.display = "none";
    }
  });
}

// Load content for the current genre
async function loadGenreContent(reset = false) {
  const loopMode = shouldUseLoopMode();

  if (isLoading) return;
  if (!reset && !loopMode && !hasMore) return;

  isLoading = true;
  const loadingIndicator = document.getElementById("loading");
  if (loadingIndicator) loadingIndicator.style.display = "block";

  if (reset) {
    currentPage = 1;
    allContent = [];
    document.getElementById("content").innerHTML = "";
    hasMore = true;
  }

  try {
    if (loopMode && !reset) {
      if (storedLoopContent.length > 0) {
        renderGenreContent(storedLoopContent, true);
        refreshInteractiveStates();
        hasMore = true;
        isLoading = false;
        if (loadingIndicator) loadingIndicator.style.display = "none";
        return;
      }
    }

    const params = new URLSearchParams({
      page: currentPage,
      filterWatched: currentFilter,
    });

    if (currentSort && currentSort !== "default") {
      params.append("sortBy", currentSort);
      params.append("sortOrder", currentSortOrder);
    } else {
      params.append("sortBy", "default");
    }

    // Add profile ID if available and filtering is needed
    if (currentFilter !== "all") {
      const [selectedProfileId] = getProfileIfLoggedIn();
      if (selectedProfileId) {
        params.append("profileId", selectedProfileId);
      } else {
        // If no profile ID is available but user is trying to filter,
        // reset to "all" to avoid confusion
        console.warn(
          "No profile ID available for filtering, showing all content"
        );
        currentFilter = "all";
        params.set("filterWatched", "all");
        // Update UI to reflect the change
        document.getElementById("currentFilter").textContent = "All Content";
      }
    }

    const response = await fetch(
      `/genres/api/genres/${encodeURIComponent(currentGenre)}?${params}`
    );
    if (!response.ok) throw new Error("Failed to fetch content");

    const data = await response.json();

    if (data.content && data.content.length > 0) {
      if (reset) {
        allContent = [...data.content];
      } else {
        allContent.push(...data.content);
      }

      renderGenreContent(data.content, !reset);
      refreshInteractiveStates();
      hasMore = data.pagination.hasMore;
      currentPage++;

      if (loopMode) {
        storedLoopContent = [...allContent];
        hasMore = true;
      } else {
        storedLoopContent = [];
      }
    } else {
      hasMore = false;
      storedLoopContent = [];
      if (reset) {
        document
          .getElementById("content")
          .appendChild(createNoResultsMessage());
      }
    }

    const noMoreContent = document.getElementById("noMoreContent");
    if (noMoreContent) {
      noMoreContent.style.display = hasMore ? "none" : "block";
    }
  } catch (error) {
    console.error("Error loading genre content:", error);
    if (reset) {
      const container = document.getElementById("content");
      container.innerHTML = "";
      container.appendChild(createNoResultsMessage());
    }
  } finally {
    isLoading = false;
    if (loadingIndicator) loadingIndicator.style.display = "none";
  }
}

// Render content using the same card format as feed/search
function renderGenreContent(content, append = true) {
  const container = document.getElementById("content");

  if (!append) {
    container.innerHTML = "";
    // Set up grid layout like in the search functionality
    setGridLayout(container);
  }

  content.forEach((item) => {
    const card = createCard(item);
    container.appendChild(card);
  });
}

// Change sorting
function changeSorting(sortBy, sortOrder) {
  currentSort = sortBy;

  if (sortBy !== "default" && sortOrder) {
    currentSortOrder = sortOrder;
  }

  const sortLabelElement = document.getElementById("currentSort");
  if (sortLabelElement) {
    if (sortBy === "default") {
      sortLabelElement.textContent = "All Content";
    } else if (sortBy === "releaseYear") {
      sortLabelElement.textContent =
        currentSortOrder === "desc" ? "Newest First" : "Oldest First";
    } else {
      const sortLabels = {
        popularity: "Popularity",
        imdbRating: "Rating",
        releaseYear: "Release Year",
      };
      const orderText =
        currentSortOrder === "desc" ? " (High to Low)" : " (Low to High)";
      sortLabelElement.textContent = sortLabels[sortBy] + orderText;
    }
  }

  loadGenreContent(true);
}

// Change filter
function changeFilter(filter) {
  currentFilter = filter;

  // Update UI
  const filterLabels = {
    all: "All Content",
    watched: "Already Watched",
    unwatched: "Not Watched",
  };
  document.getElementById("currentFilter").textContent = filterLabels[filter];

  loadGenreContent(true);
}

function shouldUseLoopMode() {
  return currentSort === "default" && currentFilter === "all";
}

// Setup infinite scroll
function setupInfiniteScroll() {
  window.addEventListener("scroll", () => {
    if (
      window.innerHeight + window.scrollY >=
      document.body.offsetHeight - 1000
    ) {
      loadGenreContent();
    }
  });
}

function refreshInteractiveStates() {
  if (!window.currentFeedData) return;

  const contentLookup = new Map();
  allContent.forEach((item) => {
    const id = contentIdFor(item);
    if (id) {
      contentLookup.set(String(id), item);
    }
  });

  const likeButtons = document.querySelectorAll(".like-btn");
  likeButtons.forEach((btn) => {
    const movieId = btn.getAttribute("data-id");
    if (!movieId) return;
    const movie = contentLookup.get(String(movieId));
    if (!movie) return;

    const isLiked = isLikedInProfile(movie);
    const icon = btn.querySelector("i");
    if (icon) {
      icon.classList.remove("bi-heart", "bi-heart-fill");
      icon.classList.add(isLiked ? "bi-heart-fill" : "bi-heart");
    }

    btn.classList.toggle("liked", isLiked);
    btn.setAttribute("aria-pressed", isLiked ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      isLiked ? "Unlike this movie" : "Like this movie"
    );
    updateTooltip(btn, isLiked ? "Unlike 💔" : "Like ❤️");
  });

  const watchlistButtons = document.querySelectorAll(".watchlist-btn");
  watchlistButtons.forEach((btn) => {
    const movieId = btn.getAttribute("data-id");
    if (!movieId) return;
    const movie = contentLookup.get(String(movieId));
    if (!movie) return;

    const inList = isInWatchlist(movie);
    const icon = btn.querySelector("i");
    if (icon) {
      icon.classList.remove("bi-plus", "bi-check2");
      icon.classList.add(inList ? "bi-check2" : "bi-plus");
    }

    btn.classList.toggle("in-list", inList);
    updateWatchlistButton(btn, inList);
  });
}
