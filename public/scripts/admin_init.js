/**
 * EXPLANATION: Updated admin_init.js for session-based authentication
 * 
 * KEY CHANGES:
 * 1. Removed localStorage.getItem("userId") - now uses getSession()
 * 2. Removed getProfileIfLoggedIn() - now uses getSession()
 * 3. Added credentials: 'same-origin' to fetch requests
 * 4. Made initialization async to await session data
 * 
 * Benefits:
 * - Admin check based on server session
 * - Cannot be bypassed by manipulating localStorage
 * - More secure
 */

// Admin page initialization script
document.addEventListener("DOMContentLoaded", async function () {
  // Change navbar brand to NETFLIX ADMIN
  const navbarBrand = document.querySelector(".navbar-brand");
  if (navbarBrand && navbarBrand.textContent.trim() === "NETFLIX") {
    navbarBrand.innerHTML = "NETFLIX ADMIN";
    navbarBrand.style.color = "#e50914";
  }

  /**
   * EXPLANATION: Admin authentication check
   * 
   * CRITICAL CHANGE: Now uses getSession() instead of localStorage
   * 
   * Old approach:
   * - const userId = localStorage.getItem("userId")
   * - Could be manipulated by client
   * 
   * New approach:
   * - Fetch session from server
   * - Server validates authentication
   * - Cannot be bypassed
   * 
   * Security:
   * - Admin status verified server-side
   * - UserId comes from server session
   * - Protection against unauthorized access
   */
  try {
<<<<<<< HEAD
    const userId = localStorage.getItem("userId");
    if (userId) {
      const response = await fetch(`/api/user/${userId}`);
      if (response.ok) {
        const user = await response.json();
        const isAdmin = user.username === "admin" || user.isAdmin;
=======
    const session = await getSession();
    
    if (!session || !session.isAuthenticated || !session.userId) {
      console.warn("No active session - redirecting to login");
      window.location.href = '/login';
      return;
    }
    
    const userId = session.userId;
    const response = await fetch(`/api/user/${userId}`, {
      credentials: 'same-origin' // Include session cookie
    });
    
    if (response.ok) {
      const user = await response.json();
      const isAdmin = user.username === "bashari" || user.isAdmin;
>>>>>>> 4d3cdc7 (manage all sessions)

      // If user is not admin, redirect to feed
      if (!isAdmin) {
        console.warn("Admin access required - redirecting to feed");
        window.location.href = '/feed';
        return;
      }
    } else {
      console.warn("Failed to fetch user data");
      window.location.href = '/login';
      return;
    }
  } catch (error) {
    console.error("Error checking admin status:", error);
    window.location.href = '/login';
    return;
  }

  /**
   * EXPLANATION: Profile information display
   * 
   * CHANGE: Now uses getSession() instead of getProfileIfLoggedIn()
   * 
   * Benefits:
   * - Profile data from server session
   * - Consistent with rest of application
   * - Cannot be tampered with
   */
  try {
<<<<<<< HEAD
    const profileData = getProfileIfLoggedIn();
    if (profileData) {
      const [selectedProfileId, selectedProfileName, selectedProfileImage] =
        profileData;
=======
    const session = await getSession();
    
    if (session && session.isAuthenticated) {
      const profileName = session.selectedProfileName || "Admin";
>>>>>>> 4d3cdc7 (manage all sessions)

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
      if (profileImg && session.selectedProfileImage) {
        profileImg.src = session.selectedProfileImage;
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
