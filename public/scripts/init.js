async function initializeApp() {
  const loadingIndicator = document.getElementById("loading");
  if (loadingIndicator) loadingIndicator.style.display = "block";

  try {
    const [selectedProfileId, selectedProfileName, selectedProfileImage] =
      getProfileIfLoggedIn();

    const helloMessage = document.getElementById("helloMessage");
    if (helloMessage) helloMessage.innerText = `Hello, ${selectedProfileName}`;

    const profileImg = document.getElementById("currentProfileImg");
    if (profileImg && selectedProfileImage)
      profileImg.src = selectedProfileImage;

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
    const dropdownMenu = document.getElementById("genresDropdownMenu");

    if (dropdownMenu && genres.length > 0) {
      dropdownMenu.innerHTML = "";

      // If there are many genres, organize them in columns
      if (genres.length > 12) {
        // Create a multi-column layout
        const columnsContainer = document.createElement("div");
        columnsContainer.className = "row g-0";
        columnsContainer.style.minWidth = "400px";
        columnsContainer.style.maxWidth = "600px";

        const itemsPerColumn = Math.ceil(genres.length / 3);
        const columns = [[], [], []];

        // Distribute genres across columns
        genres.forEach((genre, index) => {
          columns[Math.floor(index / itemsPerColumn)].push(genre);
        });

        columns.forEach((columnGenres, columnIndex) => {
          if (columnGenres.length > 0) {
            const col = document.createElement("div");
            col.className = "col-4";

            columnGenres.forEach((genre) => {
              const a = document.createElement("a");
              a.className = "dropdown-item text-white";
              a.href = `/genres/${encodeURIComponent(genre)}`;
              a.textContent = genre;
              a.style.padding = "0.25rem 0.75rem";
              a.style.fontSize = "0.9rem";
              col.appendChild(a);
            });

            columnsContainer.appendChild(col);
          }
        });

        const li = document.createElement("li");
        li.appendChild(columnsContainer);
        dropdownMenu.appendChild(li);
      } else {
        // Regular single column layout for fewer genres
        genres.forEach((genre) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.className = "dropdown-item text-white";
          a.href = `/genres/${encodeURIComponent(genre)}`;
          a.textContent = genre;
          li.appendChild(a);
          dropdownMenu.appendChild(li);
        });
      }
    } else if (dropdownMenu) {
      dropdownMenu.innerHTML =
        '<li><a class="dropdown-item text-white" href="#">No genres available</a></li>';
    }
  } catch (error) {
    console.error("Error fetching genres:", error);
    const dropdownMenu = document.getElementById("genresDropdownMenu");
    if (dropdownMenu) {
      dropdownMenu.innerHTML =
        '<li><a class="dropdown-item text-white" href="#">Error loading genres</a></li>';
    }
  }
}
