let baseMyListItems = [];
let isAlphabeticalActive = false;
let currentSearchQuery = "";

document.addEventListener("DOMContentLoaded", initializeMyListPage);

async function initializeMyListPage() {
  const loadingIndicator = document.getElementById("loading");
  if (loadingIndicator) loadingIndicator.style.display = "block";

  try {
    // Get session from server instead of localStorage
    const session = await getSession();
    
    if (!session || !session.isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    
    if (!session.selectedProfileId || !session.selectedProfileName) {
      window.location.href = "/profiles";
      return;
    }

    // Extract profile data from session
    const selectedProfileId = session.selectedProfileId;
    const selectedProfileName = session.selectedProfileName;
    const selectedProfileImage = session.selectedProfileImage;

    updateMyListHelloMessages(selectedProfileName);

    const profileImg = document.getElementById("currentProfileImg");
    if (profileImg && selectedProfileImage)
      profileImg.src = selectedProfileImage;

    const profileImgMobile = document.getElementById("currentProfileImgMobile");
    if (profileImgMobile && selectedProfileImage)
      profileImgMobile.src = selectedProfileImage;

    if (!selectedProfileId)
      throw new Error("Missing profile ID for watchlist fetch");

    const response = await fetch(
      `/feed/profile/${encodeURIComponent(selectedProfileId)}`
    );
    if (!response.ok) throw new Error("Failed to fetch watchlist");
    const feedResponse = await response.json();

    window.currentFeedData = feedResponse || {};
    window.currentProfile = feedResponse.profile;

    baseMyListItems = Array.isArray(feedResponse?.myList)
      ? feedResponse.myList.filter((item) => item && item.type !== "Episode")
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
  const searchPairs = getNavbarSearchPairs();
  if (!searchPairs.length) return;

  searchPairs.forEach(({ icon, input }) => {
    icon.addEventListener("click", () => {
      toggleSearchInputVisibility(searchPairs, input);
    });

    input.addEventListener("input", (event) => {
      currentSearchQuery = event.target.value.toLowerCase().trim();
      renderCurrentMyListView();
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

function updateMyListHelloMessages(profileName) {
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
