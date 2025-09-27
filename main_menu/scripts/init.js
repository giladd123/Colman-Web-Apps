// Gilad-Tidhar-325767929-Rotem-Batstein-325514917-Shani-Bashari-325953743

function initializeApp() {
  // Initialize profile display
  const [selectedProfileName, selectedProfileImage] = getProfileIfLoggedIn();
  document.getElementById("helloMessage").innerText = `Hello, ${selectedProfileName}`;
  document.getElementById("currentProfileImg").src = selectedProfileImage;

  // Initialize search functionality
  initializeSearch();
  
  // Initialize alphabetical sorting
  initializeAlphabeticalSorting();
  
  // Load and render initial content
  loadAndRender();
}

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", initializeApp);
