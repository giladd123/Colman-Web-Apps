import mongoose from "mongoose";
import Profile from "../models/profile.js";
import Content from "../models/content.js";
import { badRequest, notFound, serverError } from "../utils/apiResponse.js";
import { warn } from "../utils/logger.js";

const truthyStrings = new Set(["true", "1", "yes", "on"]);

function toBoolean(value) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return truthyStrings.has(value.toLowerCase());
  }
  return Boolean(value);
}

function parseNumber(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) return NaN;
  return parsed;
}

function parseDate(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

async function ensureProfileExists(profileId) {
  const profile = await Profile.findById(profileId);
  return profile || null;
}

async function ensureContentExists(contentId) {
  const content = await Content.findById(contentId);
  return content || null;
}

export async function validateCreateHabit(req, res, next) {
  try {
    const body = req.body || {};
    const profileId = body.profileId;
    const contentId = body.contentId;

    if (!profileId || !mongoose.isValidObjectId(profileId)) {
      warn("validateCreateHabit - invalid or missing profileId", { profileId });
      return badRequest(res, "profileId is required and must be a valid id");
    }
    if (!contentId || !mongoose.isValidObjectId(contentId)) {
      warn("validateCreateHabit - invalid or missing contentId", { contentId });
      return badRequest(res, "contentId is required and must be a valid id");
    }

    const profile = await ensureProfileExists(profileId);
    if (!profile) {
      warn("validateCreateHabit - profile not found", { profileId });
      return notFound(res, `Profile with id ${profileId} not found`);
    }

    const content = await ensureContentExists(contentId);
    if (!content) {
      warn("validateCreateHabit - content not found", { contentId });
      return notFound(res, `Content with id ${contentId} not found`);
    }

    const liked = toBoolean(body.liked);
    const completed = toBoolean(body.completed);
    const watchedTimeInSeconds = parseNumber(body.watchedTimeInSeconds);
    if (watchedTimeInSeconds !== undefined) {
      if (Number.isNaN(watchedTimeInSeconds) || watchedTimeInSeconds < 0) {
        warn("validateCreateHabit - invalid watchedTimeInSeconds", {
          watchedTimeInSeconds,
        });
        return badRequest(
          res,
          "watchedTimeInSeconds must be a positive number"
        );
      }
    }

    const lastWatchedAt = parseDate(body.lastWatchedAt) || new Date();

    req.validatedHabit = {
      profileId,
      contentId,
      liked: liked ?? false,
      completed: completed ?? false,
      watchedTimeInSeconds: watchedTimeInSeconds ?? 0,
      lastWatchedAt,
    };

    return next();
  } catch (error) {
    warn(`validateCreateHabit error: ${error.message}`);
    return serverError(res);
  }
}

export async function validateUpdateHabit(req, res, next) {
  try {
    const body = req.body || {};
    const updates = {};

    if (body.profileId !== undefined) {
      if (!mongoose.isValidObjectId(body.profileId)) {
        warn("validateUpdateHabit - invalid profileId", {
          profileId: body.profileId,
        });
        return badRequest(res, "profileId must be a valid id");
      }
      const profile = await ensureProfileExists(body.profileId);
      if (!profile) {
        return notFound(res, `Profile with id ${body.profileId} not found`);
      }
      updates.profileId = body.profileId;
    }

    if (body.contentId !== undefined) {
      if (!mongoose.isValidObjectId(body.contentId)) {
        warn("validateUpdateHabit - invalid contentId", {
          contentId: body.contentId,
        });
        return badRequest(res, "contentId must be a valid id");
      }
      const content = await ensureContentExists(body.contentId);
      if (!content) {
        return notFound(res, `Content with id ${body.contentId} not found`);
      }
      updates.contentId = body.contentId;
    }

    if (body.liked !== undefined) {
      const liked = toBoolean(body.liked);
      if (liked === undefined) {
        return badRequest(res, "liked must be true or false");
      }
      updates.liked = liked;
    }

    if (body.completed !== undefined) {
      const completed = toBoolean(body.completed);
      if (completed === undefined) {
        return badRequest(res, "completed must be true or false");
      }
      updates.completed = completed;
    }

    if (body.lastWatchedAt !== undefined) {
      const parsedDate = parseDate(body.lastWatchedAt);
      if (!parsedDate) {
        return badRequest(res, "lastWatchedAt must be a valid date");
      }
      updates.lastWatchedAt = parsedDate;
    }

    if (body.watchedTimeInSeconds !== undefined) {
      const parsed = parseNumber(body.watchedTimeInSeconds);
      if (Number.isNaN(parsed) || parsed < 0) {
        return badRequest(
          res,
          "watchedTimeInSeconds must be a positive number"
        );
      }
      updates.watchedTimeInSeconds = parsed;
    }

    if (!Object.keys(updates).length) {
      return badRequest(res, "No valid fields provided for update");
    }

    req.validatedHabit = updates;
    return next();
  } catch (error) {
    warn(`validateUpdateHabit error: ${error.message}`);
    return serverError(res);
  }
}

export default { validateCreateHabit, validateUpdateHabit };
