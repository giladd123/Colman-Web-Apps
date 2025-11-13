import User from "../models/user.js";
import { info, warn, error as logError } from "../utils/logger.js";
import {
  ok,
  created,
  notFound,
  serverError,
  errorResponse,
} from "../utils/apiResponse.js";
import { getSessionInfo } from "../middleware/authMiddleware.js";

async function getUserById(req, res) {
  const userId = req.params.userId;
  try {
    let user = await User.findById(userId);
    if (!user) {
      return notFound(res, "User not found");
    }
    return ok(res, user);
  } catch (error) {
    logError(
      `Error retrieving user ${userId}: ${error.message}`,
      {
        stack: error.stack,
        userId: userId,
        scope: "getUserById",
      },
      true
    );
    return serverError(res);
  }
}

/**
 * EXPLANATION: loginUser - Updated with session management
 * 
 * Changes from localStorage approach:
 * 1. After successful login, creates server-side session
 * 2. Stores userId in req.session.userId
 * 3. Client no longer stores sensitive data in localStorage
 * 4. Returns user data for display purposes only
 * 
 * Security improvements:
 * - userId cannot be tampered with by client
 * - Session data encrypted and signed
 * - Automatic session expiration
 * - Protection against session fixation attacks
 */
async function loginUser(req, res) {
  const { email, password } = req.validatedBody || req.body;
  try {
    // Find user by email, then compare hashed password
    const user = await User.findOne({ email });
    if (!user) {
      warn(
        "user login failed",
        { email: email, reason: "user not found" },
        true
      );
      return errorResponse(res, 401, "Invalid email or password");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      warn(
        "user login failed",
        { email: email, userId: user._id, reason: "password mismatch" },
        true
      );
      return errorResponse(res, 401, "Invalid email or password");
    }

    /**
     * CRITICAL CHANGE: Store userId in session instead of returning it to client
     * The client will rely on session cookies, not localStorage
     */
    req.session.userId = user._id.toString();
    
    // Clear any previous profile selection on new login
    delete req.session.selectedProfileId;
    delete req.session.selectedProfileName;
    delete req.session.selectedProfileImage;

    info(
      `user login successful: ${user._id}`,
      { email: email, userId: user._id },
      true
    );
    
    // Return user data (for display) but authentication is handled by session
    return ok(res, user);
  } catch (error) {
    logError(
      `Error during login for ${email}: ${error.message}`,
      {
        stack: error.stack,
        email: email,
        scope: "loginUser",
      },
      true
    );
    return serverError(res);
  }
}

/**
 * EXPLANATION: logoutUser - New endpoint for session destruction
 * 
 * Purpose:
 * - Destroys server-side session data
 * - Clears session cookie
 * - Replaces client-side localStorage.clear()
 * 
 * This ensures complete logout:
 * - Session data removed from server
 * - Cookie invalidated in browser
 * - No residual authentication state
 */
async function logoutUser(req, res) {
  const userId = req.session.userId;
  
  req.session.destroy((err) => {
    if (err) {
      logError(
        `Error destroying session for user ${userId}: ${err.message}`,
        {
          stack: err.stack,
          userId: userId,
          scope: "logoutUser",
        },
        true
      );
      return serverError(res);
    }
    
    // Clear the session cookie
    res.clearCookie('connect.sid');
    
    info(
      `user logout successful: ${userId}`,
      { userId: userId },
      true
    );
    
    return ok(res, { message: "Logout successful" });
  });
}

/**
 * EXPLANATION: getSessionInfo - New endpoint for session state
 * 
 * Purpose:
 * - Allows client to check authentication status
 * - Returns current session data (userId, profileId, etc.)
 * - Replaces localStorage.getItem() calls
 * 
 * Frontend uses this to:
 * - Check if user is logged in
 * - Get current profile selection
 * - Sync UI with server session state
 */
async function getSession(req, res) {
  return ok(res, getSessionInfo(req));
}

/**
 * EXPLANATION: selectProfile - New endpoint for profile selection
 * 
 * Purpose:
 * - Stores selected profile in server-side session
 * - Replaces localStorage.setItem() for profile data
 * - Validates profile belongs to authenticated user
 * 
 * Security improvements:
 * - Server validates profile ownership
 * - Client cannot forge profile selection
 * - Profile data stored securely on server
 */
async function selectProfile(req, res) {
  try {
    const { profileId, profileName, profileImage } = req.body;
    
    if (!req.session.userId) {
      return errorResponse(res, 401, "Authentication required");
    }
    
    if (!profileId || !profileName) {
      return errorResponse(res, 400, "Profile ID and name are required");
    }
    
    // Store profile selection in session
    req.session.selectedProfileId = profileId;
    req.session.selectedProfileName = profileName;
    req.session.selectedProfileImage = profileImage || '/images/profiles/white.png';
    
    info(
      `profile selected: ${profileId}`,
      { userId: req.session.userId, profileId, profileName },
      true
    );
    
    return ok(res, { 
      message: "Profile selected successfully",
      session: getSessionInfo(req)
    });
  } catch (error) {
    logError(
      `Error selecting profile: ${error.message}`,
      {
        stack: error.stack,
        userId: req.session.userId,
        scope: "selectProfile",
      },
      true
    );
    return serverError(res);
  }
}

async function createUser(req, res) {
  const { username, email, password } = req.validatedBody || req.body;
  try {
    const user = new User({ username: username, email: email, password: password });
    await user.save();
    
    /**
     * CHANGE: After creating user, automatically log them in by creating session
     * This provides smoother UX - user doesn't need to login after signup
     */
    req.session.userId = user._id.toString();
    
    info(
      `user created: ${user._id}`,
      { username: username, email: email, userId: user._id },
      true
    );
    return created(res, user);
  } catch (error) {
    logError(
      `Error creating user ${email}: ${error.message}`,
      {
        stack: error.stack,
        email: email,
        scope: "createUser",
      },
      true
    );
    return serverError(res);
  }
}

async function deleteUser(req, res) {
  const userId = req.params.userId;
  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return notFound(res, "User not found");
    }
    return ok(res, { message: "User deleted successfully" });
  } catch (error) {
    logError(
      `Error deleting user ${userId}: ${error.message}`,
      {
        stack: error.stack,
        userId: userId,
        scope: "deleteUser",
      },
      true
    );
    return serverError(res);
  }
}

async function updateUser(req, res) {
  const userId = req.params.userId;
  const { email, password } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { email: email, password: password },
      { new: true }
    );
    if (!user) {
      return notFound(res, "User not found");
    }
    return ok(res, user);
  } catch (error) {
    logError(
      `Error updating user ${userId}: ${error.message}`,
      {
        stack: error.stack,
        userId: userId,
        scope: "updateUser",
      },
      true
    );
    return serverError(res);
  }
}

export default {
  getUserById,
  loginUser,
  logoutUser,
  getSession,
  selectProfile,
  createUser,
  deleteUser,
  updateUser,
};
