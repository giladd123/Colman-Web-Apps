import Profile from "../models/profile.js";
import Content from "../models/content.js";
import { ok, notFound, serverError } from "../utils/apiResponse.js";
import { error as logError } from "../utils/logger.js";

export async function addToWatchlist(req, res) {
  try {
    const { profileName, contentId } = req.params;
    const profile = await Profile.findById(req.session.selectedProfileId);
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

    return ok(res, { success: true, inWatchlist: true, contentId });
  } catch (err) {
    logError(
      `Failed to add content ${req.params.contentId} to watchlist for profile ${req.params.profileName}: ${err.message}`,
      { stack: err.stack }
    );
    return serverError(res, "Failed to update watchlist");
  }
}

export async function removeFromWatchlist(req, res) {
  try {
    const { profileName, contentId } = req.params;
    const profile = await Profile.findById(req.session.selectedProfileId);
    if (!profile) return notFound(res, "Profile not found");

    // Remove occurrence(s)
    profile.watchlist = (profile.watchlist || []).filter(
      (c) => String(c) !== String(contentId)
    );
    await profile.save();

    return ok(res, { success: true, inWatchlist: false, contentId });
  } catch (err) {
    logError(
      `Failed to remove content ${req.params.contentId} from watchlist for profile ${req.params.profileName}: ${err.message}`,
      { stack: err.stack }
    );
    return serverError(res, "Failed to update watchlist");
  }
}
