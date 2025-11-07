function renderFeed(feedData, profileName) {
  const content = document.getElementById("content");
  content.innerHTML = "";
  let rowIndex = 0;

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

  // Place 'My List' and 'Liked by' just above the per-genre rows
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

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", initializeApp);
