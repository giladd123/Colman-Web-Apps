(function () {
  const FILTER_TYPE =
    typeof window.FEED_FILTER_TYPE === "string" &&
      window.FEED_FILTER_TYPE.trim()
      ? window.FEED_FILTER_TYPE.trim()
      : null;
  const NORMALIZED_FILTER = FILTER_TYPE ? FILTER_TYPE.toLowerCase() : null;

  function filterItemsByType(items, type) {
    if (!Array.isArray(items)) return [];
    if (!type) return items.filter((item) => item && item.type !== "Episode");
    return items.filter((item) => {
      if (!item || typeof item.type !== "string") return false;
      return item.type.toLowerCase() === NORMALIZED_FILTER;
    });
  }

  function filterNewestByGenreMap(genreMap, type) {
    if (!genreMap || typeof genreMap !== "object") return {};
    const filtered = {};
    Object.entries(genreMap).forEach(([genre, entries]) => {
      const filteredEntries = filterItemsByType(entries, type);
      if (filteredEntries.length) {
        filtered[genre] = filteredEntries;
      }
    });
    return filtered;
  }

  function applyTypeFilter(feedData, type) {
    if (!feedData || !type) {
      return {
        ...(feedData || {}),
        continueWatching: filterItemsByType(feedData?.continueWatching, null),
        recommendations: filterItemsByType(feedData?.recommendations, null),
        mostPopular: filterItemsByType(feedData?.mostPopular, null),
        myList: filterItemsByType(feedData?.myList, null),
        likedBy: filterItemsByType(feedData?.likedBy, null),
        newestByGenre: filterNewestByGenreMap(feedData?.newestByGenre, null),
      };
    }

    return {
      ...(feedData || {}),
      continueWatching: filterItemsByType(feedData?.continueWatching, type),
      recommendations: filterItemsByType(feedData?.recommendations, type),
      mostPopular: filterItemsByType(feedData?.mostPopular, type),
      myList: filterItemsByType(feedData?.myList, type),
      likedBy: filterItemsByType(feedData?.likedBy, type),
      newestByGenre: filterNewestByGenreMap(feedData?.newestByGenre, type),
    };
  }

  function filterMovieCatalogByType(catalog, type) {
    if (!Array.isArray(catalog)) return [];
    if (!type) return catalog.filter((item) => item && item.type !== "Episode");
    return catalog.filter((item) => {
      if (!item || typeof item.type !== "string") return false;
      return item.type.toLowerCase() === NORMALIZED_FILTER;
    });
  }

  async function initializeFilteredFeed() {
    const loadingIndicator = document.getElementById("loading");
    if (loadingIndicator) loadingIndicator.style.display = "block";

    try {
      const [selectedProfileId, selectedProfileName, selectedProfileImage] =
        getProfileIfLoggedIn();

      updateNavbarHelloMessages(selectedProfileName);

      const profileImg = document.getElementById("currentProfileImg");
      if (profileImg && selectedProfileImage)
        profileImg.src = selectedProfileImage;

      const profileImgMobile = document.getElementById("currentProfileImgMobile");
      if (profileImgMobile && selectedProfileImage)
        profileImgMobile.src = selectedProfileImage;

      const allContent = await fetchMoviesFromDB();
      window.movies = filterMovieCatalogByType(allContent, FILTER_TYPE);

      const feedResponse = await fetchFeedForProfile(selectedProfileId);
      const filteredFeed = applyTypeFilter(feedResponse, FILTER_TYPE);

      window.currentFeedData = filteredFeed;
      window.currentProfile = feedResponse.profile;

      renderFeed(window.currentFeedData, window.currentProfile);

      initializeSearch();
      initializeAlphabeticalSorting();

      if (loadingIndicator) loadingIndicator.style.display = "none";

      if (typeof initializeGenresDropdown === "function") {
        await initializeGenresDropdown();
      }
    } catch (error) {
      console.error("Error initializing filtered feed:", error);
      if (loadingIndicator) {
        loadingIndicator.innerHTML =
          '<p class="text-white mt-2 mb-0">Failed to load page. Please refresh.</p>';
        loadingIndicator.style.display = "block";
      }
    }
  }

  window.initializeApp = initializeFilteredFeed;
})();

function updateNavbarHelloMessages(profileName) {
  const safeName = profileName || "";
  const messages = document.querySelectorAll(
    "#helloMessage, #helloMessageMobile"
  );
  messages.forEach((el) => {
    el.innerText = `Hello, ${safeName}`;
  });
}
