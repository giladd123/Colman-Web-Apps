import mongoose from "mongoose";
import Profile from "../models/profile.js";
import { notFound, serverError } from "../utils/apiResponse.js";
import { error as logError } from "../utils/logger.js";

// Middleware: load profile by :profileId and attach to req.profile
export default async function loadProfile(req, res, next) {
  const sessionProfileId = req.session.selectedProfileId;
  const paramProfileId = req.params.profileId;

  let profileId = null;
  if (paramProfileId) {
    profileId = paramProfileId;
  } else {
    profileId = sessionProfileId;
  }
  // Validate that profileId exists
  if (!profileId) {
    return notFound(res, "No profile selected");
  }

  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(profileId)) {
    logError(
      `Invalid profile ID format: ${profileId}`,
      {
        profileId: profileId,
        scope: "loadProfile",
      },
      true
    );
    return notFound(res, `Invalid profile ID format: ${profileId}`);
  }

  try {
    const profile = await Profile.findById(profileId);
    if (!profile) {
      return notFound(res, `Profile with id ${profileId} not found`);
    }
    req.profile = profile;
    return next();
  } catch (err) {
    logError(
      `loadProfile error for id ${profileId}: ${err.message}`,
      {
        stack: err.stack,
        profileId: profileId,
        scope: "loadProfile",
      },
      true
    );
    return serverError(res);
  }
}
