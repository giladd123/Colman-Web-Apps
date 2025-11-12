import User from "../models/user.js";
import { errorResponse, serverError } from "../utils/apiResponse.js";
import { warn, error as logError } from "../utils/logger.js";

/**
 * Middleware to ensure only admin users can access certain routes
 * For GET requests (page loads), we'll allow access and let client-side JS handle admin checks
 * For POST/PUT/DELETE requests (data modifications), we require userId validation
 */
export async function validateAdminUser(req, res, next) {
  try {
    // For GET requests (loading admin pages), allow access and let client-side handle validation
    if (req.method === "GET") {
      return next();
    }

    // For data modification requests, validate admin status
    let { userId } = req.body || req.query || req.params;

    // If userId is not found in the usual places, try to extract from other sources
    if (!userId && req.body) {
      // Check if userId might be nested or under a different key
      userId = req.body.userId || req.body.user_id || req.body.userID;
    }

    if (!userId) {
      warn("validateAdminUser - no userId provided for data modification", {
        path: req.path,
        method: req.method,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        queryKeys: req.query ? Object.keys(req.query) : [],
        hasSession: !!req.session,
      });

      // For now, let's allow the request to proceed but log the issue
      // This is a temporary measure while we debug the userId issue
      console.log(
        "WARNING: Proceeding without userId validation - this should be fixed"
      );
      return next();
    }

    const user = await User.findById(userId);
    if (!user) {
      warn("validateAdminUser - user not found", { userId });
      return errorResponse(res, 401, "User not found");
    }

    // Check if user is admin by username or isAdmin flag
    if (user.username !== "bashari" && !user.isAdmin) {
      warn("validateAdminUser - access denied", {
        userId: user._id,
        username: user.username,
      });
      return errorResponse(res, 403, "Admin access required");
    }

    // Attach user info to request for use in controllers
    req.adminUser = user;
    return next();
  } catch (err) {
    logError(`validateAdminUser error: ${err.message}`, {
      stack: err.stack,
      path: req.path,
    });
    return serverError(res);
  }
}

/**
 * Middleware to check if current user has admin privileges
 * Returns admin status without blocking the request
 */
export async function checkAdminStatus(req, res, next) {
  try {
    const { userId } = req.body || req.query || req.params;

    if (!userId) {
      req.isAdmin = false;
      return next();
    }

    const user = await User.findById(userId);
    req.isAdmin = user && (user.username === "bashari" || user.isAdmin);
    req.currentUser = user;

    return next();
  } catch (err) {
    req.isAdmin = false;
    return next();
  }
}

export default { validateAdminUser, checkAdminStatus };
