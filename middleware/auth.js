/**
 * This middleware handles authentication for page loads (EJS renders).
 * Unlike 'authMiddleware.js' which returns 401/403 JSON errors for APIs,
 * this middleware performs 302 redirects for users.
 */

/**
 * Prevents logged-in users from accessing public pages like /login.
 * If a user is logged in, they are redirected to their feed or profile page.
 */
export function redirectIfAuth(req, res, next) {
  if (req.session.userId) {
    if (req.session.selectedProfileId) {
      return res.redirect("/feed");
    }
    return res.redirect("/profiles");
  }
  next();
}

export function requireAuthRedirect(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

export function requireProfileRedirect(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  if (!req.session.selectedProfileId) {
    return res.redirect("/profiles");
  }
  // Authenticated and profile selected, proceed
  next();
}