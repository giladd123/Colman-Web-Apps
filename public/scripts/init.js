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
  //console.log("Feed data for profile:", selectedProfileName, feedData);

  // Render the feed rows
  renderFeed(feedData, selectedProfileName);

  // Initialize search & sorting
  initializeSearch();
  initializeAlphabeticalSorting();
}
