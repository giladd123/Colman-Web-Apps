// Universal admin UI initialization - lightweight version for all pages
(function () {
  // Run after DOM is loaded
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAdminUI);
  } else {
    initAdminUI();
  }

  async function initAdminUI() {
    try {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      // Check if we already have admin status cached
      let isAdmin = localStorage.getItem("isAdmin") === "true";
      let shouldCheckServer = false;

      // Show admin dropdown immediately if cached as admin
      if (isAdmin) {
        showAdminDropdown();
      }

      // Check if we need to verify admin status from server
      const lastAdminCheck = localStorage.getItem("lastAdminCheck");
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds

      if (!lastAdminCheck || now - parseInt(lastAdminCheck) > fiveMinutes) {
        shouldCheckServer = true;
      }

      // If we need to check server or don't have cached status, make API call
      if (shouldCheckServer || localStorage.getItem("isAdmin") === null) {
        try {
          const response = await fetch(`/api/user/${userId}`);
          if (response.ok) {
            const user = await response.json();
            const serverIsAdmin = user.username === "admin" || user.isAdmin;

            // Update cache
            localStorage.setItem("isAdmin", serverIsAdmin.toString());
            localStorage.setItem("lastAdminCheck", now.toString());

            // Update UI if status changed
            if (serverIsAdmin !== isAdmin) {
              isAdmin = serverIsAdmin;
              if (isAdmin) {
                showAdminDropdown();
              } else {
                hideAdminDropdown();
              }
            }
          }
        } catch (error) {
          console.error("Error checking admin status from server:", error);
          // Fall back to cached value if available
        }
      }
    } catch (error) {
      console.error("Error initializing admin UI:", error);
    }
  }

  function showAdminDropdown() {
    const adminNavItem = document.getElementById("adminNavItem");
    if (adminNavItem) {
      adminNavItem.style.display = "block";
    }
  }

  function hideAdminDropdown() {
    const adminNavItem = document.getElementById("adminNavItem");
    if (adminNavItem) {
      adminNavItem.style.display = "none";
    }
  }

  // Clear admin cache when user logs out
  window.addEventListener("beforeunload", function () {
    if (!localStorage.getItem("userId")) {
      localStorage.removeItem("isAdmin");
      localStorage.removeItem("lastAdminCheck");
    }
  });

  // Expose function to refresh admin status if needed
  window.refreshAdminStatus = async function () {
    localStorage.removeItem("isAdmin");
    localStorage.removeItem("lastAdminCheck");
    await initAdminUI();
  };
})();
