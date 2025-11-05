async function initializeApp() {
  // Initialize profile display
  const [selectedProfileName, selectedProfileImage] = getProfileIfLoggedIn();
  document.getElementById("helloMessage").innerText = `Hello, ${selectedProfileName}`;
  document.getElementById("currentProfileImg").src = selectedProfileImage;

  // await fetchMoviesFromDB(); // <-- wait here before rendering
  const feedData = await fetchFeedForProfile(selectedProfileName);
  renderFeed(feedData, selectedProfileName);


  // Initialize search functionality
  initializeSearch();
  
  // Initialize alphabetical sorting
  initializeAlphabeticalSorting();
  
  // Load and render initial content
  loadAndRender();
}

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", initializeApp);
