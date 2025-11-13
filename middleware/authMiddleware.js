import { errorResponse } from "../utils/apiResponse.js";
import { warn } from "../utils/logger.js";

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
