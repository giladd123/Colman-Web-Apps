import Content from "../models/contentModel.js";
import Profile from "../models/profileModel.js";
import WatchingHabit from "../models/watchingHabitModel.js";

/**
 * Feed page controller
 * - Profile switching
 * - Continue watching
 * - Personalized recommendations
 * - Popular content
 * - Newest by genre (dynamic)
 */
export const getFeed = async (req, res) => {
  try {
    const profileId = req.params.profileId; // e.g., /feed/:profileId
    const profile = await Profile.findById(profileId)
      .populate("likedContent")
      .populate("viewingHistory.contentId")
      .lean();

    if (!profile) {
      return res.status(404).send("Profile not found");
    }

    // --- 1️⃣ Continue watching (incomplete viewing history)
    const continueWatching = profile.viewingHistory
      .filter(v => v.watchedTimeInSeconds > 0 && v.watchedTimeInSeconds < 3600 * 0.9)
      .sort((a, b) => b.lastWatchedAt - a.lastWatchedAt);

    // --- 2️⃣ Personalized recommendations
    // Find genres of liked content
    const likedGenres = profile.likedContent.map(c => c.genre);
    const viewedIds = profile.viewingHistory.map(v => v.contentId?._id);
    const likedIds = profile.likedContent.map(c => c._id);

    let recommendations = [];
    if (likedGenres.length) {
      recommendations = await Content.find({
        genre: { $in: likedGenres },
        _id: { $nin: [...viewedIds, ...likedIds] },
      })
        .sort({ rating: -1, popularity: -1 })
        .limit(10)
        .lean();
    }

    // --- 3️⃣ Popular content (top by popularity)
    const popularContent = await Content.find()
      .sort({ popularity: -1 })
      .limit(10)
      .lean();

    // --- 4️⃣ Newest content by genre (auto-detect)
    const genres = await Content.distinct("genre");
    const newestByGenre = {};
    for (const genre of genres) {
      const newest = await Content.find({ genre })
        .sort({ uploadedAt: -1 })
        .limit(10)
        .lean();
      newestByGenre[genre] = newest;
    }

    // Fetch the full user (to list all profiles)
    const user = await Profile.findById(profileId)
      .populate({
        path: "userId",
        populate: { path: "profiles" },
      })
      .then(p => p.userId)
      .lean();

    res.render("main_menu", {
      profile,
      user,
      continueWatching,
      recommendations,
      popularContent,
      newestByGenre,
    });
  } catch (err) {
    console.error("❌ Error in getFeed:", err);
    res.status(500).send("Server error loading feed");
  }
};