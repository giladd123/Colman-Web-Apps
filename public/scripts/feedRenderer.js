function renderFeed(feedData, profileName) {
  const content = document.getElementById("content");
  content.innerHTML = "";

  // Global counters/state for infinite batches
  window.__feedRowIndex = 0; // used to make unique IDs across batches
  window.__feedBatches = [];

  // Render the first batch and then enable infinite append
  appendFeedRows(feedData, profileName);
  enableVerticalInfinite(feedData, profileName);
}

// Append one full batch of rows to the bottom, using the same ordering as initial feed
function appendFeedRows(feedData, profileName) {
  const content = document.getElementById("content");
  const batch = document.createElement("div");
  batch.className = "feed-batch";

  let rowIndex = window.__feedRowIndex || 0;

  // Continue Watching
  if (feedData.continueWatching?.length)
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

  if (feedData.myList?.length)
    rowIndex = createRow("My List", feedData.myList, rowIndex);

  if (feedData.likedBy?.length)
    rowIndex = createRow(`Liked by ${profileName}`, feedData.likedBy, rowIndex);

  // Dynamic rows for each genre
  for (const [genre, genreMovies] of Object.entries(
    feedData.newestByGenre || {}
  )) {
    if (genreMovies?.length)
      rowIndex = createRow(`Newest in ${genre}`, genreMovies, rowIndex);
  }

  // Move the newly created sections into this batch wrapper
  const newlyCreated = Array.from(
    document.querySelectorAll("section.row-section")
  ).slice(-(rowIndex - (window.__feedRowIndex || 0)));
  newlyCreated.forEach((sec) => batch.appendChild(sec));

  // Append batch and sentinel
  content.appendChild(batch);

  window.__feedRowIndex = rowIndex;
  window.__feedBatches = window.__feedBatches || [];
  window.__feedBatches.push(batch);

  // Keep memory in check: keep last 5 batches in DOM
  const maxBatches = 5;
  if (window.__feedBatches.length > maxBatches) {
    const old = window.__feedBatches.shift();
    if (old && old.parentNode) old.parentNode.removeChild(old);
  }
}

function enableVerticalInfinite(feedData, profileName) {
  const content = document.getElementById("content");
  let sentinel = document.getElementById("feed-sentinel");
  if (!sentinel) {
    sentinel = document.createElement("div");
    sentinel.id = "feed-sentinel";
    sentinel.style.height = "1px";
    sentinel.style.width = "100%";
    sentinel.style.marginTop = "8px";
    content.appendChild(sentinel);
  }

  let loading = false;
  const observer = new IntersectionObserver(
    async (entries) => {
      const entry = entries[0];
      if (entry.isIntersecting && !loading) {
        loading = true;
        // Append the same rows as a new batch
        appendFeedRows(feedData, profileName);
        // Move sentinel to bottom again
        content.appendChild(sentinel);
        loading = false;
      }
    },
    { root: null, threshold: 0.1 }
  );

  observer.observe(sentinel);
}

async function fetchMoviesFromDB() {
  try {
    const response = await fetch("/feed/allContent");
    if (!response.ok) throw new Error("Failed to fetch content");
    const data = await response.json();
    return data;
  } catch (err) {
    console.error("Error fetching movies:", err);
    alert("Failed to load content.");
    return [];
  }
}

// Fetch feed data for a specific profile
async function fetchFeedForProfile(profileName) {
  try {
    const response = await fetch(`/feed/${encodeURIComponent(profileName)}`);
    if (!response.ok) throw new Error("Failed to fetch feed");
    const data = await response.json();
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

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", initializeApp);
