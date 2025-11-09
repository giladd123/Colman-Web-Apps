async function initializeApp() {
  // Initialize profile display
  const [selectedProfileName, selectedProfileImage] = getProfileIfLoggedIn();
  document.getElementById(
    "helloMessage"
  ).innerText = `Hello, ${selectedProfileName}`;
  document.getElementById("currentProfileImg").src = selectedProfileImage;

  // Fetch movies globally
  window.movies = await fetch("/feed/allContent").then((res) => res.json());

  // Fetch feed for profile
  const feedData = await fetchFeedForProfile(selectedProfileName);

  // Expose the last rendered feed and profile on window so other modules (search) can restore it.
  window.currentFeedData = feedData;
  window.currentProfileName = selectedProfileName;

  // Render the feed rows
  renderFeed(window.currentFeedData, window.currentProfileName);

  // Initialize search & sorting
  initializeSearch();
  initializeAlphabeticalSorting();
}
