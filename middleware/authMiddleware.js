import asyncHandler from 'express-async-handler';
import { ApiError } from '../utils/apiError.js';

/**
 * Checks if a user is logged in (has a user session).
 */
const isAuthenticated = asyncHandler(async (req, res, next) => {
  if (req.session.user) {
    next(); // User is logged in, continue
  } else {
    // User is not logged in
    if (req.originalUrl.startsWith('/api')) {
      throw new ApiError(401, "Not authenticated");
    } else {
      res.redirect('/login');
    }
  }
});

/**
 * Checks if a user has selected a profile.
 * This MUST run *after* isAuthenticated.
 */
const isProfileSelected = asyncHandler(async (req, res, next) => {
  if (req.session.profile) {
    next(); // Profile is selected, continue
  } else {
    // Logged in, but no profile picked
    if (req.originalUrl.startsWith('/api')) {
      throw new ApiError(401, "Please select a profile");
    } else {
      res.redirect('/profiles');
    }
  }
});

/**
 * Checks if the logged-in user is an Admin.
 * This MUST run *after* isAuthenticated.
 */
const isAdmin = asyncHandler(async (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next(); // User is an admin, continue
  } else {
    // Not an admin
    if (req.originalUrl.startsWith('/api')) {
      throw new ApiError(403, "Forbidden: Admin access required");
    } else {
      res.redirect('/main'); // Redirect non-admins away
    }
  }
});

export { isAuthenticated, isProfileSelected, isAdmin };