function initializeSearch() {
  const searchPairs = getNavbarSearchPairs();
  if (!searchPairs.length) return;

  searchPairs.forEach(({ icon, input }) => {
    icon.addEventListener("click", () => {
      toggleSearchInputVisibility(searchPairs, input);
    });

    input.addEventListener("input", (e) => {
      handleSearchInputChange(e.target.value);
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
        handleEmptySearch();
      }
    });
  });
}

// Alphabetical sorting functionality
function initializeAlphabeticalSorting() {
  const abcIcon = document.querySelector(".bi-alphabet");
  if (!abcIcon) return; // Icon was removed from navbar

  let abcActive = false;
  let originalMoviesOrder = [...movies]; // Preserve original order

  // Show sorted A-Z list on icon click or reset to original
  abcIcon.addEventListener("click", () => {
    // If abc button is clicked
    abcActive = !abcActive;
    if (abcActive) {
      abcIcon.setAttribute("data-active", "true");
      abcIcon.style.backgroundColor = "#FFFFFF80"; // highlight
      abcIcon.style.borderRadius = "4px"; // optional rounded effect
      movies.sort((a, b) => a.Title.localeCompare(b.Title));
      renderContent(movies);
    } else {
      abcIcon.removeAttribute("data-active");
      abcIcon.style.backgroundColor = "transparent"; // reset
      // Restore original order
      movies.length = 0;
      movies.push(...originalMoviesOrder);
      // Reset content styles to fit original layout
      const movieCards = document.getElementById("content");
      movieCards.style.display = "";
      movieCards.style.flexWrap = "";
      movieCards.style.gap = "";
      movieCards.style.padding = "";
      if (window.currentFeedData && window.currentProfile) {
        renderFeed(window.currentFeedData, window.currentProfile);
      } else {
        loadAndRender();
      }
    }
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

function handleSearchInputChange(rawValue) {
  const query = (rawValue || "").toLowerCase().trim();

  if (query === "") {
    handleEmptySearch();
    return;
  }

  const filtered = movies.filter((movie) =>
    movie.title.toLowerCase().includes(query)
  );
  renderContent(filtered);
}

function handleEmptySearch() {
  const abcIcon = document.querySelector(".bi-alphabet");
  if (abcIcon && abcIcon.getAttribute("data-active") === "true") {
    renderContent(movies);
    return;
  }

  const movieCards = document.getElementById("content");
  movieCards.style.display = "";
  movieCards.style.flexWrap = "";
  movieCards.style.gap = "";
  movieCards.style.padding = "";

  if (window.currentFeedData && window.currentProfile) {
    renderFeed(window.currentFeedData, window.currentProfile);
  } else {
    loadAndRender();
  }
}
