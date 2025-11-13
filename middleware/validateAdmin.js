import User from "../models/user.js";
import { errorResponse, serverError } from "../utils/apiResponse.js";
import { warn, error as logError } from "../utils/logger.js";

export async function validateAdminUser(req, res, next) {
  try {
    // For GET requests (loading admin pages), allow access and let client-side handle validation
    if (req.method === "GET") {
      return next();
    }

    // For data modification requests, validate admin status
    const { userId } = req.session;
    // If userId is not found in the usual places, try to extract from other sources
    if (!userId) {
      warn(
        "validateAdminUser - no session userId found for data modification",
        {
          path: req.path,
          method: req.method,
          hasSession: !!req.session,
        }
      );
      return errorResponse(res, 401, "Authentication required");
    }

    const user = await User.findById(userId);
    if (!user) {
      warn("validateAdminUser - user not found in DB", { userId });
      return errorResponse(res, 401, "User not found");
    }

    if (user.username !== "admin" && !user.isAdmin) {
      warn("validateAdminUser - access denied", {
        userId: user._id,
        username: user.username,
      });
      return errorResponse(res, 403, "Admin access required");
    }

    // attach user info for downstream use
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

export async function checkAdminStatus(req, res, next) {
  try {
    const { userId } = req.body || req.query || req.params;

    if (!userId) {
      req.isAdmin = false;
      return next();
    }

    const user = await User.findById(userId);
    req.isAdmin = user && (user.username === "admin" || user.isAdmin);
    req.currentUser = user;

    return next();
  } catch (err) {
    req.isAdmin = false;
    return next();
  }
}

export default { validateAdminUser, checkAdminStatus };
