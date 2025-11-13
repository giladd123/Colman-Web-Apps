// Admin page initialization script
document.addEventListener("DOMContentLoaded", async function () {
  // Change navbar brand to NETFLIX ADMIN
  const navbarBrand = document.querySelector(".navbar-brand");
  if (navbarBrand && navbarBrand.textContent.trim() === "NETFLIX") {
    navbarBrand.innerHTML = "NETFLIX ADMIN";
    navbarBrand.style.color = "#e50914";
  }

  try {
    const session = await getSession();

    if (!session || !session.isAuthenticated || !session.userId) {
      console.warn("No active session - redirecting to login");
      window.location.href = "/login";
      return;
    }

    const userId = session.userId;
    const response = await fetch(`/api/user/${userId}`, {
      credentials: "same-origin", // Include session cookie
    });

    if (response.ok) {
      const user = await response.json();
      const isAdmin = user.username === "admin" || user.isAdmin;

      // If user is not admin, redirect to feed
      if (!isAdmin) {
        console.warn("Admin access required - redirecting to feed");
        window.location.href = "/feed";
        return;
      }
    } else {
      console.warn("Failed to fetch user data");
      window.location.href = "/login";
      return;
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
    window.location.href = "/login";
    return;
  }

  try {
    const session = await getSession();

    if (session && session.isAuthenticated) {
      const profileName = session.selectedProfileName || "Admin";

      // Update hello messages using the utility function
      if (typeof updateHelloMessages === "function") {
        updateHelloMessages(profileName);
      } else {
        // Fallback if utils.js is not loaded
        const helloMessage = document.getElementById("helloMessage");
        const helloMessageMobile =
          document.getElementById("helloMessageMobile");
        const greeting = profileName ? `Hello, ${profileName}` : "Hello";

        if (helloMessage) {
          helloMessage.textContent = greeting;
        }
        if (helloMessageMobile) {
          helloMessageMobile.textContent = greeting;
        }
      }

      // Update profile images
      const profileImg = document.getElementById("currentProfileImg");
      if (profileImg && session.selectedProfileImage) {
        profileImg.src = session.selectedProfileImage;
      }

      const profileImgMobile = document.getElementById(
        "currentProfileImgMobile"
      );
      if (profileImgMobile && session.selectedProfileImage) {
        profileImgMobile.src = session.selectedProfileImage;
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
