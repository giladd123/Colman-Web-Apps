// login_handler vvvvvvvvvvvvvvvvvvvvv

function getProfileIfLoggedIn() {
  if (localStorage.getItem("isLoggedIn") != "true") {
    window.location.href = "login";
    return;
  }

  const selectedProfileName = localStorage.getItem("selectedProfileName");
  const selectedProfileImage = localStorage.getItem("selectedProfileImage");

  if (!(selectedProfileName && selectedProfileImage)) {
    window.location.href = "profiles";
  }
  return [selectedProfileName, selectedProfileImage];
}

function logout() {
  localStorage.clear();
  window.location.href = "login";
}

// ##########################################################################
// ??????????????????

// ########################################
// UTILS

// CONTENTS PER ROW
const ROW_SIZE = 30;

function updateTooltip(el, text) {
  try {
    const inst = bootstrap.Tooltip.getInstance(el);
    if (inst) inst.dispose();
  } catch (e) {}
  el.setAttribute("title", text);
  el.setAttribute("data-bs-original-title", text);
  new bootstrap.Tooltip(el);
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

// ####################### likes_manager
function getOrCreateLikesData(movieId) {
  const likesDataAll = JSON.parse(localStorage.getItem("likesData")) || {};

  let entry = likesDataAll[movieId];
  if (!entry) {
    entry = {
      base: Math.floor(Math.random() * (500 - 50 + 1)) + 50,
      extra: 0,
      liked: false,
    };
    likesDataAll[movieId] = entry;
    localStorage.setItem("likesData", JSON.stringify(likesDataAll));
  }

  entry.base = Number(entry.base);
  entry.extra = Number(entry.extra);

  return entry;
}

function animateLikeIcon(icon, isLiking) {
  if (!icon) return;

  if (isLiking) {
    icon.classList.replace("bi-heart", "bi-heart-fill");
    icon.classList.remove("like-animate");
    void icon.offsetWidth;
    icon.classList.add("like-animate");
    setTimeout(() => icon.classList.remove("like-animate"), 450);
  } else {
    icon.classList.replace("bi-heart-fill", "bi-heart");
    icon.classList.remove("unlike-animate");
    void icon.offsetWidth;
    icon.classList.add("unlike-animate");
    setTimeout(() => icon.classList.remove("unlike-animate"), 300);
  }
}

function updateLikeButton(likeBtn, cur) {
  const newTotal = cur.base + cur.extra;
  const countEl = likeBtn.querySelector(".like-count");
  if (countEl) countEl.textContent = newTotal;

  likeBtn.setAttribute("aria-pressed", cur.liked ? "true" : "false");
  likeBtn.setAttribute(
    "aria-label",
    cur.liked ? "Unlike this movie" : "Like this movie"
  );

  const newTooltip = cur.liked ? `Unlike 💔` : "Like ❤️";
  updateTooltip(likeBtn, newTooltip);
}

function handleLikeClick(likeBtn, movieId, entry) {
  const stored = JSON.parse(localStorage.getItem("likesData")) || {};
  const cur = stored[movieId] || {
    base: entry.base,
    extra: entry.extra,
    liked: entry.liked,
  };

  const icon = likeBtn.querySelector("i");

  if (!cur.liked) {
    cur.liked = true;
    cur.extra = (cur.extra || 0) + 1;
    likeBtn.classList.add("liked");
    animateLikeIcon(icon, true);
  } else {
    cur.liked = false;
    cur.extra = Math.max(0, (cur.extra || 0) - 1);
    likeBtn.classList.remove("liked");
    animateLikeIcon(icon, false);
  }

  stored[movieId] = cur;
  localStorage.setItem("likesData", JSON.stringify(stored));
  updateLikeButton(likeBtn, cur);
}

function createLikeButton(movie) {
  const likeBtn = document.createElement("button");
  likeBtn.className = "like-btn";
  likeBtn.setAttribute("data-bs-toggle", "tooltip");

  const movieId = movie.imdbID || movie.Title;
  const entry = getOrCreateLikesData(movieId);
  const totalLikes = entry.base + entry.extra;

  const icon = document.createElement("i");
  icon.className = `bi ${entry.liked ? "bi-heart-fill" : "bi-heart"} pe-1`;

  const countSpan = document.createElement("span");
  countSpan.className = "like-count";
  countSpan.textContent = totalLikes;

  likeBtn.appendChild(icon);
  likeBtn.appendChild(countSpan);
  likeBtn.setAttribute("aria-pressed", entry.liked ? "true" : "false");
  likeBtn.setAttribute(
    "aria-label",
    entry.liked ? "Unlike this movie" : "Like this movie"
  );

  const tooltipText = entry.liked ? `Unlike 💔` : "Like ❤️";
  updateTooltip(likeBtn, tooltipText);

  likeBtn.addEventListener("click", () =>
    handleLikeClick(likeBtn, movieId, entry)
  );

  return likeBtn;
}

// ###########################################
// -------------------card
function createMovieBadge(movie) {
  const badge = document.createElement("span");
  badge.className = "badge-pill";
  badge.textContent = movie.imdbRating
    ? `${movie.imdbRating}`
    : movie.releaseYear || "";
  return badge;
}

function createMovieImage(movie) {
  const img = document.createElement("img");
  img.className = "movie-poster";
  img.alt = movie.title || "Poster";
  img.src = movie.posterUrl;
  img.loading = "lazy";
  return img;
}

function createCard(movie) {
  const card = document.createElement("div");
  card.className = "movie-card";

  card.appendChild(createMovieImage(movie));
  card.appendChild(createMovieBadge(movie));
  card.appendChild(createLikeButton(movie));

  return card;
}

// ------------------------------------ row_renderer

function createRowTitle(title) {
  const h3 = document.createElement("h3");
  h3.className = "row-title";
  h3.textContent = title;
  return h3;
}

function createScrollButton(direction, iconClass) {
  const button = document.createElement("button");
  button.className = `scroll-btn ${direction}`;
  button.innerHTML = `<i class="bi ${iconClass} fs-3"></i>`;
  return button;
}

function createScrollContainer(movies, rowIndex) {
  const scroller = document.createElement("div");
  scroller.className = "scroll-container";
  scroller.id = `row-${rowIndex}`;

  movies.forEach((movie) => {
    const card = createCard(movie);
    scroller.appendChild(card);
  });

  return scroller;
}

//const style = getComputedStyle(cards[0]);
//const cardWidth = cards[0].offsetWidth + parseInt(style.marginRight || 0) + parseInt(style.gap || 0);

// Makes a scroller infinitely loop by cloning first and last few cards
function makeInfiniteScroller(scroller, cloneCount = 3) {
  let cards = Array.from(scroller.children);
  if (!cards.length) return;

  // Clone cards
  const clonesLeft = cards.slice(-cloneCount).map((c) => c.cloneNode(true));
  const clonesRight = cards.slice(0, cloneCount).map((c) => c.cloneNode(true));

  clonesLeft.forEach((c) => scroller.insertBefore(c, scroller.firstChild));
  clonesRight.forEach((c) => scroller.appendChild(c));

  // Recalculate all cards including clones
  cards = Array.from(scroller.children);

  const cardWidth =
    cards[0].offsetWidth +
    parseInt(getComputedStyle(cards[0]).marginRight || 0);
  const originalCount = cards.length - cloneCount * 2; // exclude clones

  // Start scroll at first original card
  scroller.scrollLeft = cardWidth * cloneCount;

  // Continuous scroll
  scroller.addEventListener("scroll", () => {
    requestAnimationFrame(() => {
      if (scroller.scrollLeft < cardWidth * cloneCount) {
        scroller.scrollLeft += cardWidth * originalCount;
      } else if (
        scroller.scrollLeft >=
        cardWidth * (cloneCount + originalCount)
      ) {
        scroller.scrollLeft -= cardWidth * originalCount;
      }
    });
  });
}

function addScrollListeners(leftBtn, rightBtn, scroller) {
  if (!scroller) return;

  const scrollAmount = Math.round(scroller.clientWidth * 0.6);

  if (leftBtn) {
    leftBtn.onclick = null;
    leftBtn.addEventListener("click", () => {
      scroller.scrollBy({ left: -scrollAmount, behavior: "smooth" });
    });
  }

  if (rightBtn) {
    rightBtn.onclick = null;
    rightBtn.addEventListener("click", () => {
      scroller.scrollBy({ left: scrollAmount, behavior: "smooth" });
    });
  }
}

function createRow(title, movies, rowIndex) {
  const section = document.createElement("section");
  section.className = "row-section";

  const wrapper = document.createElement("div");
  wrapper.className = "scroll-wrapper";

  const leftBtn = createScrollButton("left", "bi-chevron-left");
  const rightBtn = createScrollButton("right", "bi-chevron-right");

  const scroller = document.createElement("div");
  scroller.className = "scroll-container";
  scroller.id = `row-${rowIndex}`;

  movies.forEach((movie) => scroller.appendChild(createCard(movie)));

  wrapper.appendChild(leftBtn);
  wrapper.appendChild(scroller);
  wrapper.appendChild(rightBtn);

  section.appendChild(createRowTitle(title));
  section.appendChild(wrapper);

  document.getElementById("content").appendChild(section);

  addScrollListeners(leftBtn, rightBtn, scroller);

  // Enable infinite scrolling immediately
  if (scroller.scrollWidth > scroller.clientWidth) {
    requestAnimationFrame(() => makeInfiniteScroller(scroller, 3));
    // makeInfiniteScroller(scroller, 3); // seamless infinite scroll
  } else {
    leftBtn.style.display = "none";
    rightBtn.style.display = "none";
  }

  // Update arrows on resize
  window.addEventListener("resize", () => {
    if (scroller.scrollWidth <= scroller.clientWidth) {
      leftBtn.style.display = "none";
      rightBtn.style.display = "none";
    } else {
      leftBtn.style.display = "";
      rightBtn.style.display = "";
    }
  });

  return section;
}

// -------------------- content

function createNoResultsMessage() {
  const noResult = document.createElement("p");
  noResult.textContent = "No results found";
  noResult.style.color = "white";
  noResult.style.fontSize = "1.5rem";
  noResult.style.textAlign = "center";
  return noResult;
}

function setGridLayout(container) {
  container.style.display = "flex";
  container.style.flexWrap = "wrap";
  container.style.gap = "16px";
  container.style.padding = "20px";
}

// function renderFeed(feedData, profileName) {
//   const content = document.getElementById("content");
//   content.innerHTML = "";

//   createRow("Continue Watching for " + profileName, feedData.continueWatching || [], 0);
//   createRow("We Think You'll Love These", feedData.recommendations || [], 1);
//   createRow("Most Popular", feedData.mostPopular || [], 2);

//   // Dynamic rows for each genre
//   let i = 3;
//   for (const [genre, genreMovies] of Object.entries(feedData.newestByGenre || {})) {
//     createRow(`Newest in ${genre}`, genreMovies || [], i);
//     i++;
//   }
// }

function renderFeed(feedData, profileName) {
  const content = document.getElementById("content");
  content.innerHTML = "";

  // Helper to render chunked rows
  function renderChunkedRows(title, movies, startIndex) {
    const chunks = chunkArray(movies, ROW_SIZE);
    chunks.forEach((chunk, i) => {
      const label = chunks.length > 1 ? `${title} ${i + 1}` : title;
      createRow(label, chunk, startIndex + i);
    });
    return startIndex + chunks.length;
  }

  let rowIndex = 0;

  // Continue Watching
  if (feedData.continueWatching?.length)
    // rowIndex = renderChunkedRows("Continue Watching for " + profileName, feedData.continueWatching, rowIndex);
    rowIndex = createRow(
      "Continue Watching for " + profileName,
      feedData.continueWatching,
      rowIndex
    );

  // Recommendations
  if (feedData.recommendations?.length)
    rowIndex = createRow(
      "We Think You'll Love These",
      feedData.recommendations,
      rowIndex
    );

  // Most Popular
  if (feedData.mostPopular?.length)
    rowIndex = createRow("Most Popular", feedData.mostPopular, rowIndex);

  // Dynamic rows for each genre
  for (const [genre, genreMovies] of Object.entries(
    feedData.newestByGenre || {}
  )) {
    if (genreMovies?.length)
      rowIndex = createRow(`Newest in ${genre}`, genreMovies, rowIndex);
  }
}

function renderContent(filtered) {
  const movieCards = document.getElementById("content");
  movieCards.innerHTML = ""; // clear previous content

  if (filtered.length === 0) {
    movieCards.appendChild(createNoResultsMessage());
    return;
  }

  setGridLayout(movieCards);

  filtered.forEach((movie) => {
    const card = createCard(movie);
    movieCards.appendChild(card);
  });
}

/// ------ search

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
        //loadAndRender();
        renderFeed(feedData, selectedProfileName);
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
      //loadAndRender();
      renderFeed(feedData, selectedProfileName);
    }
  });
}

async function fetchMoviesFromDB() {
  try {
    const response = await fetch("/feed/allContent");
    if (!response.ok) throw new Error("Failed to fetch content");
    const data = await response.json();
    console.log("Fetched movies:", data);
    return data;
  } catch (err) {
    console.error("Error fetching movies:", err);
    alert("Failed to load content.");
    return [];
  }
}

// ----------- init

// Fetch feed data for a specific profile
async function fetchFeedForProfile(profileName) {
  try {
    const response = await fetch(`/feed/${encodeURIComponent(profileName)}`);
    if (!response.ok) throw new Error("Failed to fetch feed");
    const data = await response.json();
    console.log("Feed fetched for profile:", data);
    return data;
  } catch (err) {
    console.error("Error fetching feed:", err);
    return {
      continueWatching: [],
      recommendations: [],
      mostPopular: [],
      newestByGenre: {},
    };
  }
}

async function initializeApp() {
  // Initialize profile display
  const [selectedProfileName, selectedProfileImage] = getProfileIfLoggedIn();
  document.getElementById(
    "helloMessage"
  ).innerText = `Hello, ${selectedProfileName}`;
  document.getElementById("currentProfileImg").src = selectedProfileImage;

  // Fetch movies globally
  //const movies = await fetchMoviesFromDB();
  window.movies = await fetch("/feed/allContent").then((res) => res.json());
  console.log("Movies:", movies);

  // Fetch feed for profile
  const feedData = await fetchFeedForProfile(selectedProfileName);
  // --------------------
  // TEMP TEST FEED SETUP
  // --------------------
  const [tcw, r, mp, nbg1, nbg2] = await Promise.all([
    fetch("/feed/testContent").then((res) => res.json()),
    fetch("/feed/testContent2").then((res) => res.json()),
    fetch("/feed/testContent2").then((res) => res.json()),
    fetch("/feed/testContent2").then((res) => res.json()),
    fetch("/feed/testContent2").then((res) => res.json()),
  ]);

  // const feedData = {
  //   continueWatching: tcw,
  //   recommendations: r,
  //   mostPopular: mp,
  //   newestByGenre: { Action: nbg1, Drama: nbg2 },
  // };

  //const feedData = testFeedData;
  // --------------------

  //console.log("Feed data for profile:", selectedProfileName, feedData);

  // Render the feed rows
  renderFeed(feedData, selectedProfileName);

  // Initialize search & sorting
  initializeSearch();
  initializeAlphabeticalSorting();
}

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", initializeApp);
