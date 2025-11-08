let currentGenre = "";
let currentPage = 1;
let currentSort = "popularity";
let currentSortOrder = "desc";
let currentFilter = "all";
let isLoading = false;
let hasMore = true;
let allContent = [];

// Initialize genre page
function initializeGenrePage(genre) {
  currentGenre = genre;

  document.addEventListener("DOMContentLoaded", async function () {
    // Initialize basic navbar functionality first (this loads feed data)
    await initializeNavbarForGenrePage();

    // Then load genre content (buttons will now have correct states)
    loadGenreContent(true); // true = reset content
    setupInfiniteScroll();
  });
}

// Initialize basic navbar functionality for genre page
async function initializeNavbarForGenrePage() {
  // Initialize profile display
  const [selectedProfileName, selectedProfileImage] = getProfileIfLoggedIn();
  document.getElementById(
    "helloMessage"
  ).innerText = `Hello, ${selectedProfileName}`;
  document.getElementById("currentProfileImg").src = selectedProfileImage;

  // Set up global variables for likes and watchlist functionality
  window.currentProfileName = selectedProfileName;

  // Fetch user's feed data to get likes and watchlist info
  try {
    const feedResponse = await fetch(`/feed/${selectedProfileName}`);
    if (feedResponse.ok) {
      window.currentFeedData = await feedResponse.json();
    } else {
      window.currentFeedData = { likedBy: [], myList: [] };
    }
  } catch (error) {
    console.error("Error fetching feed data:", error);
    window.currentFeedData = { likedBy: [], myList: [] };
  }

  // Update navbar active states for genre page
  updateNavbarActiveState();

  // Initialize genres dropdown
  initializeGenresDropdown();

  // Initialize search functionality for genre page
  initializeGenrePageSearch();
}

// Update navbar active states
function updateNavbarActiveState() {
  // Remove active class from Home link
  const homeLink = document.querySelector('a[href="/feed"]');
  if (homeLink) {
    homeLink.classList.remove("active");
  }

  // Add active class to Browse by Genres dropdown
  const genresDropdownLink = document.getElementById("genresDropdown");
  if (genresDropdownLink) {
    genresDropdownLink.classList.add("active");
  }
}

// Initialize search functionality specifically for genre page
function initializeGenrePageSearch() {
  const searchIcon = document.querySelector(".bi-search");
  const searchInput = document.getElementById("searchInput");

  if (!searchIcon || !searchInput) return;

  // Open search input on icon click
  searchIcon.addEventListener("click", () => {
    searchInput.style.display = "block";
    searchInput.focus();
  });

  // Close search input if it's empty and page is clicked
  document.addEventListener("click", (event) => {
    if (
      event.target !== searchIcon &&
      event.target !== searchInput &&
      searchInput.style.display === "block" &&
      searchInput.value.trim() === ""
    ) {
      searchInput.style.display = "none";
    }
  });

  // Filter content on input
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    filterGenreContent(query);
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

// Load content for the current genre
async function loadGenreContent(reset = false) {
  if (isLoading || (!hasMore && !reset)) return;

  isLoading = true;
  document.getElementById("loading").style.display = "block";

  if (reset) {
    currentPage = 1;
    allContent = [];
    document.getElementById("content").innerHTML = "";
    hasMore = true;
  }

  try {
    const params = new URLSearchParams({
      page: currentPage,
      sortBy: currentSort,
      sortOrder: currentSortOrder,
      filterWatched: currentFilter,
    });

    const response = await fetch(
      `/genres/api/genres/${encodeURIComponent(currentGenre)}?${params}`
    );
    if (!response.ok) throw new Error("Failed to fetch content");

    const data = await response.json();

    if (data.content && data.content.length > 0) {
      allContent.push(...data.content);
      renderGenreContent(data.content, !reset);
      hasMore = data.pagination.hasMore;
      currentPage++;
    } else {
      hasMore = false;
      if (reset) {
        document
          .getElementById("content")
          .appendChild(createNoResultsMessage());
      }
    }

    // Show/hide no more content message
    document.getElementById("noMoreContent").style.display = hasMore
      ? "none"
      : "block";
  } catch (error) {
    console.error("Error loading genre content:", error);
    if (reset) {
      const container = document.getElementById("content");
      container.innerHTML = "";
      container.appendChild(createNoResultsMessage());
    }
  } finally {
    isLoading = false;
    document.getElementById("loading").style.display = "none";
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
  currentSortOrder = sortOrder;

  // Update UI
  const sortLabels = {
    popularity: "Popularity",
    imdbRating: "Rating",
    releaseYear: "Release Year",
  };
  const orderText = sortOrder === "desc" ? " (High to Low)" : " (Low to High)";
  if (sortBy === "releaseYear") {
    document.getElementById("currentSort").textContent =
      sortOrder === "desc" ? "Newest First" : "Oldest First";
  } else {
    document.getElementById("currentSort").textContent =
      sortLabels[sortBy] + orderText;
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
