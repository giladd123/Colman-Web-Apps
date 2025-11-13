/**
 * EXPLANATION: Updated login_handler.js for session-based authentication
 * 
 * KEY CHANGES:
 * 1. Removed all localStorage.getItem() calls
 * 2. Added getSession() to fetch session from server
 * 3. Updated logout() to call server API
 * 4. All authentication state now managed server-side
 * 
 * Benefits:
 * - More secure (no client-side storage of sensitive data)
 * - Cannot be tampered with
 * - Consistent across tabs
 * - Server-controlled expiration
 */

/**
 * EXPLANATION: getSession function
 * 
 * Replaces: localStorage.getItem("isLoggedIn"), localStorage.getItem("userId"), etc.
 * 
 * Purpose:
 * - Fetches current session state from server
 * - Returns session info (userId, profileId, etc.)
 * - Used by all pages to check authentication
 * 
 * This is the SINGLE SOURCE OF TRUTH for authentication state
 */

/**
 * EXPLANATION: getProfileIfLoggedIn function
 * 
 * Replaces: localStorage checks for authentication and profile
 * 
 * Changes:
 * - Now calls getSession() instead of localStorage
 * - Redirects based on server session state
 * - Returns profile info from server, not client storage
 * 
 * Flow:
 * 1. Check if user is authenticated (session.isAuthenticated)
 * 2. Check if profile is selected (session.selectedProfileId)
 * 3. Redirect to appropriate page if not
 * 4. Return profile info for page initialization
 */
async function getProfileIfLoggedIn() {
  const session = await getSession();
  
  if (!session || !session.isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  if (!session.selectedProfileId || !session.selectedProfileName || !session.selectedProfileImage) {
    window.location.href = "/profiles";
    return null;
  }
  
  return [session.selectedProfileId, session.selectedProfileName, session.selectedProfileImage];
}

/**
 * EXPLANATION: logout function
 * 
 * Replaces: localStorage.clear()
 * 
 * Changes:
 * - Calls server API to destroy session
 * - Server clears session data and cookie
 * - More secure than client-side clear
 * 
 * Benefits:
 * - Server immediately invalidates session
 * - Session cookie properly cleared
 * - Prevents session reuse
 */
async function logout() {
  try {
    const response = await fetch('/api/user/logout', {
      method: 'POST',
      credentials: 'same-origin' // Include session cookie
    });
    
    if (response.ok) {
      window.location.href = "/login";
    } else {
      console.error('Logout failed');
      // Redirect anyway for UX
      window.location.href = "/login";
    }
  } catch (error) {
    console.error('Error during logout:', error);
    // Redirect anyway for UX
    window.location.href = "/login";
  }
}
