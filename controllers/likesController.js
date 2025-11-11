import Profile from "../models/profile.js";
import Content from "../models/content.js";
import Habit from "../models/habit.js";
import { ok, notFound, serverError } from "../utils/apiResponse.js";
import { error as logError } from "../utils/logger.js";

// Add a content to profile.likedContents and mark habit.liked = true
export async function addLikeByProfileName(req, res) {
  try {
    const { profileName, contentId } = req.params;
    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return notFound(res, "Profile not found");

    // Ensure content exists and get initial content
    let content = await Content.findById(contentId);
    if (!content) return notFound(res, "Content not found");

    // Add if not already present
    const already = profile.likedContents?.some(
      (c) => String(c) === String(contentId)
    );
    if (!already) {
      profile.likedContents = profile.likedContents || [];
      profile.likedContents.push(contentId);
      await profile.save();

      // Increment popularity counter and get updated content
      content = await Content.findByIdAndUpdate(
        contentId,
        { $inc: { popularity: 1 } },
        { new: true } // Return updated document
      );
    }

    // Ensure watchingHabit liked flag is set for this profile-content pair
    await Habit.findOneAndUpdate(
      { profileId: profile._id, contentId: contentId },
      { $set: { liked: true } },
      { upsert: true }
    );

    return ok(res, {
      success: true,
      liked: true,
      contentId,
      content: content.toObject(), // Include updated content
    });
  } catch (err) {
    logError(
      `Failed to add like for profile ${req.params.profileName} and content ${req.params.contentId}: ${err.message}`,
      { stack: err.stack }
    );
    return serverError(res, "Failed to add like");
  }
}

// Remove a content from profile.likedContents and mark habit.liked = false
export async function removeLikeByProfileName(req, res) {
  try {
    const { profileName, contentId } = req.params;
    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return notFound(res, "Profile not found");

    // Ensure content exists and get initial content
    let content = await Content.findById(contentId);
    if (!content) return notFound(res, "Content not found");

    // Check if content was actually liked before
    const wasLiked = profile.likedContents?.some(
      (c) => String(c) === String(contentId)
    );

    if (wasLiked) {
      // Remove occurrence(s)
      profile.likedContents = (profile.likedContents || []).filter(
        (c) => String(c) !== String(contentId)
      );
      await profile.save();

      // Decrement popularity counter, but don't go below 0, and get updated content
      content = await Content.findByIdAndUpdate(
        contentId,
        [
          {
            $set: {
              popularity: {
                $max: [{ $subtract: ["$popularity", 1] }, 0],
              },
            },
          },
        ],
        { new: true } // Return updated document
      );
    }

    // Update habit
    await Habit.findOneAndUpdate(
      { profileId: profile._id, contentId: contentId },
      { $set: { liked: false } },
      { upsert: false }
    );

    return ok(res, {
      success: true,
      liked: false,
      contentId,
      content: content.toObject(), // Include updated content
    });
  } catch (err) {
    logError(
      `Failed to remove like for profile ${req.params.profileName} and content ${req.params.contentId}: ${err.message}`,
      { stack: err.stack }
    );
    return serverError(res, "Failed to remove like");
  }
}
