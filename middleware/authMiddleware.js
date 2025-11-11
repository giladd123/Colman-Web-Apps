import asyncHandler from 'express-async-handler';
import { ApiError } from '../utils/apiError.js';

const isAuthenticated = asyncHandler(async (req, res, next) => {
  if (req.session.user) {
    next(); 
  } else {
    if (req.originalUrl.startsWith('/api')) {
      throw new ApiError(401, "Not authenticated");
    } else {
      res.redirect('/login');
    }
  }
});

const isProfileSelected = asyncHandler(async (req, res, next) => {
  if (req.session.profile) {
    next(); 
  } else {
    if (req.originalUrl.startsWith('/api')) {
      throw new ApiError(401, "Please select a profile");
    } else {
      res.redirect('/profiles');
    }
  }
});

const isAdmin = asyncHandler(async (req, res, next) => {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    if (req.originalUrl.startsWith('/api')) {
      throw new ApiError(403, "Forbidden: Admin access required");
    } else {
      res.redirect('/main');
    }
  }
});

export { isAuthenticated, isProfileSelected, isAdmin };