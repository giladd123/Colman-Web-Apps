function initializeSearch() {
  const searchIcon = document.querySelector(".bi-search");
  const searchInput = document.getElementById("searchInput");

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
      // Check if sorting is active and maintain that state
      const abcIcon = document.querySelector(".bi-alphabet");
      if (abcIcon.getAttribute("data-active") === "true") {
        // Sorting is active, render with grid layout
        renderContent(movies);
      } else {
        // Reset content styles to fit original layout
        const movieCards = document.getElementById("content");
        movieCards.style.display = "";
        movieCards.style.flexWrap = "";
        movieCards.style.gap = "";
        movieCards.style.padding = "";
        loadAndRender();
      }
    }
  });

  // Filter content on input
  searchInput.addEventListener("input", (e) => {
    const query = e.target.value.toLowerCase().trim();
    
    if (query === "") {
      // If search input is empty, check if sorting is active
      const abcIcon = document.querySelector(".bi-alphabet");
      if (abcIcon.getAttribute("data-active") === "true") {
        // Sorting is active, render with grid layout
        renderContent(movies);
      } else {
        // Show default view
        const movieCards = document.getElementById("content");
        movieCards.style.display = "";
        movieCards.style.flexWrap = "";
        movieCards.style.gap = "";
        movieCards.style.padding = "";
        loadAndRender();
      }
    } else {
      // If there's an active search input, show search results
      const filtered = movies.filter((movie) =>
        movie.title.toLowerCase().includes(query)
      );
      renderContent(filtered);
    }
  });
}

// Alphabetical sorting functionality
function initializeAlphabeticalSorting() {
  const abcIcon = document.querySelector(".bi-alphabet");
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
      loadAndRender();
    }
  });
}
