import { errorResponse } from "../utils/apiResponse.js";
import { warn } from "../utils/logger.js";

/**
 * EXPLANATION: requireAuth middleware
 * 
 * This middleware replaces client-side localStorage checks with server-side session validation.
 * It protects API routes by ensuring the user is authenticated before allowing access.
 * 
 * Purpose:
 * - Verifies req.session.userId exists (user is logged in)
 * - Returns 401 Unauthorized if not authenticated
 * - Prevents unauthorized API access
 * 
 * Usage: Add to routes that require authentication
 * Example: router.get('/protected', requireAuth, controller)
 */
export function requireAuth(req, res, next) {
  if (!req.session.userId) {
    warn("Unauthorized API access attempt", {
      path: req.path,
      method: req.method,
      ip: req.ip
    });
    return errorResponse(res, 401, "Authentication required");
  }
  next();
}

/**
 * EXPLANATION: requireProfile middleware
 * 
 * This middleware ensures both user authentication AND profile selection.
 * Many features require a specific profile context (watchlist, habits, etc.)
 * 
 * Purpose:
 * - Verifies both userId and selectedProfileId exist in session
 * - Returns 401 if not authenticated or 403 if profile not selected
 * - Attaches userId and profileId to req for easy controller access
 * 
 * Usage: Add to routes that need profile context
 * Example: router.get('/watchlist', requireProfile, controller)
 */
export function requireProfile(req, res, next) {
  if (!req.session.userId) {
    warn("Unauthorized API access attempt - no user session", {
      path: req.path,
      method: req.method
    });
    return errorResponse(res, 401, "Authentication required");
  }
  
  if (!req.session.selectedProfileId) {
    warn("API access without profile selection", {
      path: req.path,
      method: req.method,
      userId: req.session.userId
    });
    return errorResponse(res, 403, "Profile selection required");
  }
  
  // Attach to req for easy access in controllers
  req.userId = req.session.userId;
  req.profileId = req.session.selectedProfileId;
  
  next();
}

/**
 * EXPLANATION: getSessionInfo helper
 * 
 * This function safely extracts session information for API responses.
 * It's used by endpoints that need to return current session state to the client.
 * 
 * Purpose:
 * - Returns current session data in a consistent format
 * - Used by /api/user/session endpoint
 * - Helps frontend sync with server-side session state
 */
export function getSessionInfo(req) {
  return {
    isAuthenticated: !!req.session.userId,
    userId: req.session.userId || null,
    selectedProfileId: req.session.selectedProfileId || null,
    selectedProfileName: req.session.selectedProfileName || null,
    selectedProfileImage: req.session.selectedProfileImage || null
  };
}

export default {
  requireAuth,
  requireProfile,
  getSessionInfo
};
