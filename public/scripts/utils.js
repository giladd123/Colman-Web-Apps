/**
 * EXPLANATION: utils.js - Client-side utility functions for session management
 * 
 * KEY CHANGES:
 * 1. Added getSession() function to fetch session from server
 * 2. Removed getProfileIfLoggedIn() localStorage-based function
 * 3. All authentication now goes through server session API
 * 
 * Benefits:
 * - Single source of truth (server)
 * - Cannot be tampered with by client
 * - Consistent across application
 * - Automatic session validation
 */
/**
 * EXPLANATION: getSession function
 * 
 * Purpose: Fetches current session state from server
 * 
 * Replaces: 
 * - localStorage.getItem("isLoggedIn")
 * - localStorage.getItem("userId")
 * - localStorage.getItem("selectedProfileId")
 * - getProfileIfLoggedIn()
 * 
 * Returns: {
 *   isAuthenticated: boolean,
 *   userId: string | null,
 *   selectedProfileId: string | null,
 *   selectedProfileName: string | null,
 *   selectedProfileImage: string | null
 * }
 * 
 * Usage:
 * const session = await getSession();
 * if (session && session.isAuthenticated) {
 *   // User is logged in
 *   console.log('User ID:', session.userId);
 * }
 * 
 * Security:
 * - Session data comes from server, not client
 * - Validated on every request
 * - Cannot be forged or tampered with
 */
async function getSession() {
  try {
    const response = await fetch('/api/user/session', {
      method: 'GET',
      credentials: 'same-origin' // Critical: includes session cookie
    });
    
    if (!response.ok) {
      console.error('Failed to fetch session');
      return {
        isAuthenticated: false,
        userId: null,
        selectedProfileId: null,
        selectedProfileName: null,
        selectedProfileImage: null
      };
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching session:', error);
    return {
      isAuthenticated: false,
      userId: null,
      selectedProfileId: null,
      selectedProfileName: null,
      selectedProfileImage: null
    };
  }
}

/**
 * EXPLANATION: logout function
 * 
 * Purpose: Properly logs out user by destroying server session
 * 
 * Replaces: localStorage.clear()
 * 
 * Benefits:
 * - Destroys server-side session
 * - Clears session cookie
 * - More secure than just clearing localStorage
 * - Prevents session reuse
 */
async function logout() {
  try {
    const response = await fetch('/api/user/logout', {
      method: 'POST',
      credentials: 'same-origin'
    });
    
    if (response.ok) {
      window.location.href = '/login';
    } else {
      console.error('Logout failed');
      // Force redirect anyway
      window.location.href = '/login';
    }
  } catch (error) {
    console.error('Error during logout:', error);
    // Force redirect anyway
    window.location.href = '/login';
  }
}

/**
 * EXPLANATION: Deprecated function warning
 * 
 * This function is kept for backward compatibility but should not be used.
 * All code should be updated to use getSession() instead.
 */
function getProfileIfLoggedIn() {
  console.warn('DEPRECATED: getProfileIfLoggedIn() is deprecated. Use getSession() instead.');
  // Return empty array to prevent breakage, but log warning
  return [null, null, null];
}

function updateTooltip(el, text) {
  try {
    const inst = bootstrap.Tooltip.getInstance(el);
    if (inst) inst.dispose();
  } catch (e) {}
  el.setAttribute("title", text);
  el.setAttribute("data-bs-original-title", text);
  new bootstrap.Tooltip(el);
}

function chunkArray(items, chunkSize) {
  const chunks = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

function updateHelloMessages(profileName) {
  const safeName = (profileName || "").trim();
  const greeting = safeName ? `Hello, ${safeName}` : "Hello";

  document
    .querySelectorAll("#helloMessage, #helloMessageMobile")
    .forEach((element) => {
      element.textContent = greeting;
    });
}
