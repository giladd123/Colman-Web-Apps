import Profile from "../models/profile.js";
import { notFound, serverError } from "../utils/apiResponse.js";
import { error as logError } from "../utils/logger.js";

// Middleware: load profile by :profileId and attach to req.profile
export default async function loadProfile(req, res, next) {
  const profileId = req.session.selectedProfileId;
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
