import Profile from "../models/profile.js";
import Content from "../models/content.js";
import Habit from "../models/habit.js";

// Add a content to profile.likedContents and mark habit.liked = true
export async function addLikeByProfileName(req, res, next) {
  try {
    const { profileName, contentId } = req.params;
    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Ensure content exists
    const content = await Content.findById(contentId);
    if (!content) return res.status(404).json({ error: "Content not found" });

    // Add if not already present
    const already = profile.likedContents?.some(
      (c) => String(c) === String(contentId)
    );
    if (!already) {
      profile.likedContents = profile.likedContents || [];
      profile.likedContents.push(contentId);
      await profile.save();
    }

    // Ensure watchingHabit liked flag is set for this profile-content pair
    await Habit.findOneAndUpdate(
      { profileId: profile._id, contentId: contentId },
      { $set: { liked: true } },
      { upsert: true }
    );

    return res.json({ success: true, liked: true, contentId });
  } catch (err) {
    next(err);
  }
}

// Remove a content from profile.likedContents and mark habit.liked = false
export async function removeLikeByProfileName(req, res, next) {
  try {
    const { profileName, contentId } = req.params;
    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Remove occurrence(s)
    profile.likedContents = (profile.likedContents || []).filter(
      (c) => String(c) !== String(contentId)
    );
    await profile.save();

    // Update habit
    await Habit.findOneAndUpdate(
      { profileId: profile._id, contentId: contentId },
      { $set: { liked: false } },
      { upsert: false }
    );

    return res.json({ success: true, liked: false, contentId });
  } catch (err) {
    next(err);
  }
}
