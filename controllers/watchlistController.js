import Profile from "../models/profile.js";
import Content from "../models/content.js";
import { error as logError } from "../utils/logger.js";
import { notFound } from "../utils/apiResponse.js";

export async function addToWatchlist(req, res, next) {
  try {
    const { profileName, contentId } = req.params;
    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return notFound(res, "Profile not found");

    // Ensure content exists
    const content = await Content.findById(contentId);
    if (!content) return notFound(res, "Content not found");

    // Add if not already present
    const already = profile.watchlist?.some(
      (c) => String(c) === String(contentId)
    );
    if (!already) {
      profile.watchlist = profile.watchlist || [];
      profile.watchlist.push(contentId);
      await profile.save();
    }

    return res.json({ success: true, inWatchlist: true, contentId: contentId });
  } catch (err) {
    logError(
      `Error adding to watchlist: ${err.message}`,
      { stack: err.stack, params: req.params },
      true
    );
    next(err);
  }
}

export async function removeFromWatchlist(req, res, next) {
  try {
    const { profileName, contentId } = req.params;
    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return notFound(res, "Profile not found");

    // Remove occurrence(s)
    profile.watchlist = (profile.watchlist || []).filter(
      (c) => String(c) !== String(contentId)
    );
    await profile.save();

    return res.json({ success: true, inWatchlist: false, contentId: contentId });
  } catch (err) {
    logError(
      `Error removing from watchlist: ${err.message}`,
      { stack: err.stack, params: req.params },
      true
    );
    next(err);
  }
}
