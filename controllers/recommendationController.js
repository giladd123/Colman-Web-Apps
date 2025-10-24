import Profile from "../models/profileModel.js";
import Content from "../models/contentModel.js";
import WatchingHabit from "../models/watchingHabitModel.js";

/**
 * Get personalized recommendations for a profile
 * Logic:
 * 1. Collect liked content and recently watched content for that profile.
 * 2. Extract the genres from those contents.
 * 3. Recommend other content with similar genres, excluding already watched/liked.
 */
export const getRecommendations = async (req, res) => {
  try {
    const { profileId } = req.params;

    // Step 1: Load profile + liked content
    const profile = await Profile.findById(profileId)
      .populate("likedContent")
      .lean();

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Step 2: Load watching history for this profile
    const watchingHabits = await WatchingHabit.find({ profileId })
      .populate("contentId")
      .lean();

    // Step 3: Collect genres from liked and watched content
    const likedGenres = new Set();

    profile.likedContent.forEach((c) => {
      if (c.genre) likedGenres.add(c.genre);
    });

    watchingHabits.forEach((h) => {
      if (h.contentId?.genre) likedGenres.add(h.contentId.genre);
    });

    // Step 4: Build exclusion list (already seen or liked)
    const excludeIds = [
      ...profile.likedContent.map((c) => c._id.toString()),
      ...watchingHabits.map((h) => h.contentId?._id?.toString()).filter(Boolean),
    ];

    // Step 5: Find other content matching these genres
    const recommendations = await Content.find({
      genre: { $in: Array.from(likedGenres) },
      _id: { $nin: excludeIds },
    })
      .sort({ popularity: -1, rating: -1 })
      .limit(10);

    res.json({ recommendations });
  } catch (err) {
    console.error("Error generating recommendations:", err);
    res.status(500).json({ error: "Failed to generate recommendations" });
  }
};