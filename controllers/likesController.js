import Profile from "../models/profile.js";
import Content from "../models/content.js";
import Habit from "../models/habit.js";
import { error as logError } from "../utils/logger.js";

// Add a content to profile.likedContents and mark habit.liked = true
export async function addLikeByProfileName(req, res, next) {
  try {
    console.log("Adding like:", req.params);
    const { profileName, contentId } = req.params;
    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Ensure content exists and get initial content
    let content = await Content.findById(contentId);
    if (!content) return res.status(404).json({ error: "Content not found" });

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

    return res.json({
      success: true,
      liked: true,
      contentId: contentId,
      content: content.toObject(), // Include updated content
    });
  } catch (err) {
    logError(
      `Error in addLikeByProfileName: ${err.message}`,
      { stack: err.stack, params: req.params },
      true
    );
    res.status(500).json({
      success: false,
      error: err.message || "Failed to add like",
    });
  }
}

// Remove a content from profile.likedContents and mark habit.liked = false
export async function removeLikeByProfileName(req, res, next) {
  try {
    const { profileName, contentId } = req.params;
    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Ensure content exists and get initial content
    let content = await Content.findById(contentId);
    if (!content) return res.status(404).json({ error: "Content not found" });

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

    return res.json({
      success: true,
      liked: false,
      contentId: contentId,
      content: content.toObject(), // Include updated content
    });
  } catch (err) {
    logError(
      `Error in removeLikeByProfileName: ${err.message}`,
      { stack: err.stack, params: req.params },
      true
    );
    res.status(500).json({
      success: false,
      error: err.message || "Failed to remove like",
    });
  }
}
