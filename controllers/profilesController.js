import Profile from "../models/profile.js";
import media from "../config/media.js";
import { info, error as logError } from "../utils/logger.js";
import { ok, created, notFound, serverError } from "../utils/apiResponse.js";
import crypto from "crypto";
import path from "path";

const DEFAULT_AVATAR_PREFIX = "default-profile-pictures/";
const USER_AVATAR_PREFIX = "user-profile-pictures/";
const SUPPORTED_AVATAR_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif"];
// Create a profile from multipart upload or base64 body
async function createProfileRequest(req, res) {
  // Support multipart form or JSON: validated values are provided by middleware
  const validated = req.validatedProfile || {};
  const userId = validated.userId;
  const name = validated.name;
  // Prefer a direct avatarUrl if provided (no upload). Otherwise, if a file
  // was uploaded, save it to S3.
  const avatarFile = req.file;
  let url = null;
  if (req.body && req.body.avatarUrl) {
    // Use provided public URL directly
    url = req.body.avatarUrl;
  } else if (avatarFile) {
    const fileExtension = path.extname(avatarFile.originalname || ".png");
    const generatedKey = `${USER_AVATAR_PREFIX}${userId}/${crypto.randomUUID()}${fileExtension}`;
    try {
      const { key, url: uploadedUrl } = await media.uploadFromMultipart(
        avatarFile,
        generatedKey
      );
      url = media.getObjectUrl(key) || uploadedUrl;
    } catch (err) {
      logError(
        `Error uploading avatar for user ${userId}: ${err.message}`,
        {
          stack: err.stack,
          userId: userId,
          scope: "createProfileRequest.upload",
        },
        true
      );
      return serverError(res);
    }
  }
  const profile = Profile({ name: name, user: userId, avatar: url });
  try {
    await profile.save();
  } catch (error) {
    logError(
      `Error saving profile for user ${userId}: ${error.message}`,
      {
        stack: error.stack,
        userId,
        scope: "createProfileRequest.save",
      },
      true
    );
    return serverError(res);
  }
  info(
    `profile created: ${profile._id}`,
    { userId: userId, name: name, profileId: profile._id },
    true
  );
  return created(res, profile);
}

async function getProfilesByUserId(req, res) {
  const userId = req.params.userId;
  try {
    const profiles = await Profile.find({ user: userId });
    return ok(res, profiles);
  } catch (error) {
    logError(
      `Error retrieving profiles for user id ${userId}: ${error.message}`,
      { stack: error.stack, userId: userId, scope: "getProfilesByUserId" },
      true
    );
    return serverError(res);
  }
}

async function deleteProfile(req, res) {
  // Route uses :profileId
  // req.profile is attached by loadProfile middleware
  try {
    const profile = req.profile;
    await profile.deleteOne();
    return ok(res, {
      message: `Profile with id ${profile._id} deleted successfully`,
    });
  } catch (error) {
    logError(
      `Error deleting profile with id ${req.params.profileId}: ${error.message}`,
      {
        stack: error.stack,
        profileId: req.params.profileId,
        scope: "deleteProfile",
      },
      true
    );
    return serverError(res);
  }
}

async function updateProfile(req, res) {
  const profileId = req.params.profileId;
  const validated = req.validatedProfile || {};
  const name = validated.name;
  const avatar = req.file;
  const avatarUrlFromBody = req.body?.avatarUrl;
  try {
    const profile = req.profile;
    if (name !== undefined) profile.name = name;
    if (avatarUrlFromBody) {
      // Use provided public URL directly
      profile.avatar = avatarUrlFromBody;
      profile.avatarKey = undefined;
    } else if (avatar) {
      const fileExtension = path.extname(avatar.originalname || ".png");
      const generatedKey = `${USER_AVATAR_PREFIX}${
        profile.user
      }/${crypto.randomUUID()}${fileExtension}`;
      const { key, url: uploadedUrl } = await media.uploadFromMultipart(
        avatar,
        generatedKey
      );
      profile.avatar = media.getObjectUrl(key) || uploadedUrl;
      profile.avatarKey = key;
    }
    await profile.save();
    return ok(res, profile);
  } catch (error) {
    logError(
      `Error updating profile id ${profileId}: ${error.message}`,
      {
        stack: error.stack,
        profileId: profileId,
        scope: "updateProfile",
      },
      true
    );
    return serverError(res);
  }
}

async function getDefaultAvatars(req, res) {
  try {
    const results = await media.listObjects(DEFAULT_AVATAR_PREFIX);
    const avatars = (results || [])
      .map((item) => item.Key || "")
      .filter((key) => key.startsWith(DEFAULT_AVATAR_PREFIX))
      .filter((key) =>
        SUPPORTED_AVATAR_EXTENSIONS.some((ext) =>
          key.toLowerCase().endsWith(ext)
        )
      )
      .map((key) => media.getObjectUrl(key))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));

    return ok(res, { avatars });
  } catch (error) {
    logError(`Error listing default avatars: ${error.message}`, {
      stack: error.stack,
    });
    return serverError(res, "Unable to load default avatars");
  }
}

export default {
  createProfileRequest,
  getProfilesByUserId,
  deleteProfile,
  updateProfile,
  getDefaultAvatars,
};
