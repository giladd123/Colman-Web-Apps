import User from "../models/user.js";
import Profile from "../models/profile.js";
import { badRequest, notFound, serverError } from "../utils/apiResponse.js";
import { warn, info } from "../utils/logger.js";

const nameRegex = /^[A-Za-z0-9 _-]+$/;

export async function validateCreateProfile(req, res, next) {
  try {
    const body = req.body || {};
    const userId = body.userId;
    const name = body.name;

    if (!userId) {
      warn("validateCreateProfile - missing userId", { body });
      return badRequest(res, "userId is required");
    }

    const userExists = await User.findById(userId);
    if (!userExists) {
      warn("validateCreateProfile - user not found", { userId });
      return notFound(res, `User with id ${userId} not found`);
    }

    const allProfiles = await Profile.find({ user: userId });
    if (allProfiles.length >= 5) {
      warn("validateCreateProfile - profile limit reached", { userId });
      return badRequest(res, "Cannot create more than 5 profiles per user");
    }

    if (!name || typeof name !== "string") {
      warn("validateCreateProfile - missing name", { body });
      return badRequest(res, "Profile name is required");
    }
    if (!nameRegex.test(name)) {
      warn("validateCreateProfile - invalid name format", { name });
      return badRequest(res, "Invalid profile name format");
    }

    if (!req.body.avatarUrl && !req.file) {
      warn("validateCreateProfile - missing avatar", { userId });
      return badRequest(
        res,
        "No avatar provided. Provide multipart file or base64 body."
      );
    }

    req.validatedProfile = { userId, name };
    info("validateCreateProfile passed", { userId, name });
    return next();
  } catch (err) {
    warn(`validateCreateProfile error: ${err.message}`);
    return serverError(res);
  }
}

export function validateUpdateProfile(req, res, next) {
  try {
    let name;
    if (req.body && req.body.name !== undefined) {
      name = req.body.name;
    } else {
      name = undefined;
    }
    if (name !== undefined) {
      if (typeof name !== "string" || !nameRegex.test(name)) {
        warn("validateUpdateProfile - invalid name format", { name });
        return badRequest(res, "Invalid profile name format");
      }
      req.validatedProfile = req.validatedProfile || {};
      req.validatedProfile.name = name;
    }
    info("validateUpdateProfile passed", {
      profileId: req.params.profileId,
      name,
    });
    return next();
  } catch (err) {
    warn(`validateUpdateProfile error: ${err.message}`);
    return serverError(res);
  }
}

export default { validateCreateProfile, validateUpdateProfile };
