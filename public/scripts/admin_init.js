// Admin page initialization script
document.addEventListener("DOMContentLoaded", async function () {
  // Change navbar brand to NETFLIX ADMIN
  const navbarBrand = document.querySelector(".navbar-brand");
  if (navbarBrand && navbarBrand.textContent.trim() === "NETFLIX") {
    navbarBrand.innerHTML = "NETFLIX ADMIN";
    navbarBrand.style.color = "#e50914";
  }

  // Check if user is admin (admin dropdown is handled by admin_menu.js)
  try {
    const userId = localStorage.getItem("userId");
    if (userId) {
      const response = await fetch(`/api/user/${userId}`);
      if (response.ok) {
        const user = await response.json();
        const isAdmin = user.username === "bashari" || user.isAdmin;

        // If user is not admin, redirect to feed
        if (!isAdmin) {
          console.warn("Admin access required");
          // Optionally redirect non-admin users
          // window.location.href = '/feed';
        }
      }
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
  }

  // Set up user greeting and profile image
  try {
    const profileData = getProfileIfLoggedIn();
    if (profileData) {
      const [selectedProfileId, selectedProfileName, selectedProfileImage] =
        profileData;

      // Update hello messages using the utility function
      if (typeof updateHelloMessages === "function") {
        updateHelloMessages(selectedProfileName);
      } else {
        // Fallback if utils.js is not loaded
        const helloMessage = document.getElementById("helloMessage");
        const helloMessageMobile =
          document.getElementById("helloMessageMobile");
        const greeting = selectedProfileName
          ? `Hello, ${selectedProfileName}`
          : "Hello";

        if (helloMessage) {
          helloMessage.textContent = greeting;
        }
        if (helloMessageMobile) {
          helloMessageMobile.textContent = greeting;
        }
      }

      // Update profile images
      const profileImg = document.getElementById("currentProfileImg");
      if (profileImg && selectedProfileImage) {
        profileImg.src = selectedProfileImage;
      }

      const profileImgMobile = document.getElementById(
        "currentProfileImgMobile"
      );
      if (profileImgMobile && selectedProfileImage) {
        profileImgMobile.src = selectedProfileImage;
      }
    }
  } catch (error) {
    console.error("Error setting up profile information:", error);
  }

  // Initialize admin UI and show admin dropdown
  if (typeof initializeAdminUI === "function") {
    await initializeAdminUI();
  }

  // Initialize genres dropdown if the function exists
  if (typeof initializeGenresDropdown === "function") {
    await initializeGenresDropdown();
  }
});
