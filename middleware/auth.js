import { warn } from "../utils/logger.js";

// Redirect to feed if authenticated, else proceed
export function redirectIfAuth(req, res, next) {
  if (req.session.userId) {
    if (req.session.selectedProfileId) {
      return res.redirect("/feed");
    }
    warn("Profile reqired to access for user", {
          userId: req.session.userId
    });
    return res.redirect("/profiles");
  }
  next();
}

//  Redirect to login if not authenticated, else proceed
export function requireAuthRedirect(req, res, next) {
  if (!req.session.userId) {
    warn("Authentication reqires to access", {
          userId: req.session.userId
    });
    return res.redirect("/login");
  }
  next();
}

// Redirect to profiles if no profile selected, else proceed
export function requireProfileRedirect(req, res, next) {
  if (!req.session.userId) {
    warn("Access reqires user", {
          userId: req.session.userId
    });
    return res.redirect("/login");
  }
  if (!req.session.selectedProfileId) {
    warn("Access reqires profile", {
          userId: req.session.userId
    });
    return res.redirect("/profiles");
  }
  next();
}