let baseMyListItems = [];
let isAlphabeticalActive = false;
let currentSearchQuery = "";

document.addEventListener("DOMContentLoaded", initializeMyListPage);

async function initializeMyListPage() {
  const loadingIndicator = document.getElementById("loading");
  if (loadingIndicator) loadingIndicator.style.display = "block";

  try {
    const profileData = getProfileIfLoggedIn();
    if (!profileData || profileData.length < 2) {
      throw new Error("Profile information missing from local storage");
    }
    const [selectedProfileName, selectedProfileImage] = profileData;
    const profileName = selectedProfileName || "";

    const helloMessage = document.getElementById("helloMessage");
    if (helloMessage) helloMessage.innerText = `Hello, ${profileName}`;

    const profileImg = document.getElementById("currentProfileImg");
    if (profileImg && selectedProfileImage)
      profileImg.src = selectedProfileImage;

    const profileKey = profileName ? encodeURIComponent(profileName) : "";
    if (!profileKey)
      throw new Error("Missing profile name for watchlist fetch");

    const response = await fetch(`/feed/${profileKey}`);
    if (!response.ok) throw new Error("Failed to fetch watchlist");
    const feedData = await response.json();

    window.currentFeedData = feedData || {};
    window.currentProfileName = profileName;

    baseMyListItems = Array.isArray(feedData?.myList)
      ? feedData.myList.filter((item) => item && item.type !== "Episode")
      : [];
    window.movies = [...baseMyListItems];

    renderCurrentMyListView();

    initializeMyListSearch();
    initializeMyListAlphabeticalSort();

    if (loadingIndicator) loadingIndicator.style.display = "none";

    if (typeof initializeGenresDropdown === "function") {
      await initializeGenresDropdown();
    }
  } catch (error) {
    console.error("Error initializing My List page:", error);
    showMyListError("Failed to load your list. Please refresh.");
  } finally {
    if (loadingIndicator) loadingIndicator.style.display = "none";
  }
}

function renderMyList(items, emptyMessageText) {
  const container = document.getElementById("content");
  if (!container) return;

  container.innerHTML = "";

  if (!items.length) {
    const emptyMessage = createNoResultsMessage();
    emptyMessage.textContent = emptyMessageText || "Your list is empty.";
    container.appendChild(emptyMessage);
    return;
  }

  setGridLayout(container);
  items.forEach((item) => {
    const card = createCard(item);
    container.appendChild(card);
  });
}

function renderCurrentMyListView() {
  const filtered = filterMyListByQuery(baseMyListItems, currentSearchQuery);
  const toRender = isAlphabeticalActive
    ? [...filtered].sort(compareContentTitles)
    : filtered;
  const emptyMessageText = baseMyListItems.length
    ? currentSearchQuery
      ? "No titles match your search."
      : "Your list is empty."
    : "Your list is empty.";
  renderMyList(toRender, emptyMessageText);
}

function filterMyListByQuery(items, query) {
  if (!query) return [...items];
  const normalizedQuery = query.toLowerCase();
  return items.filter((item) => {
    const title = typeof item?.title === "string" ? item.title : "";
    return title.toLowerCase().includes(normalizedQuery);
  });
}

function compareContentTitles(a, b) {
  const titleA = typeof a?.title === "string" ? a.title : "";
  const titleB = typeof b?.title === "string" ? b.title : "";
  return titleA.localeCompare(titleB, undefined, { sensitivity: "base" });
}

function initializeMyListSearch() {
  const searchIcon = document.querySelector(".bi-search");
  const searchInput = document.getElementById("searchInput");

  if (!searchIcon || !searchInput) return;

  searchIcon.addEventListener("click", () => {
    searchInput.style.display = "block";
    searchInput.focus();
  });

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

  searchInput.addEventListener("input", (event) => {
    currentSearchQuery = event.target.value.toLowerCase().trim();
    renderCurrentMyListView();
  });
}

function initializeMyListAlphabeticalSort() {
  const abcIcon = document.querySelector(".bi-alphabet");
  if (!abcIcon) return;

  abcIcon.addEventListener("click", () => {
    isAlphabeticalActive = !isAlphabeticalActive;
    if (isAlphabeticalActive) {
      abcIcon.setAttribute("data-active", "true");
      abcIcon.style.backgroundColor = "#FFFFFF80";
      abcIcon.style.borderRadius = "4px";
    } else {
      abcIcon.removeAttribute("data-active");
      abcIcon.style.backgroundColor = "transparent";
      abcIcon.style.borderRadius = "";
    }
    renderCurrentMyListView();
  });
}

function showMyListError(message) {
  const container = document.getElementById("content");
  if (!container) return;
  container.innerHTML = "";
  const errorMessage = document.createElement("p");
  errorMessage.className = "text-white text-center";
  errorMessage.textContent = message;
  container.appendChild(errorMessage);
}

document.addEventListener("watchlist:updated", (event) => {
  if (!event?.detail) return;
  const updatedList = Array.isArray(event.detail.myList)
    ? event.detail.myList.filter((item) => item && item.type !== "Episode")
    : [];
  baseMyListItems = updatedList;
  window.movies = [...baseMyListItems];
  renderCurrentMyListView();
});
