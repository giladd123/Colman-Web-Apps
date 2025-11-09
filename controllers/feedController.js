import Content from "../models/content.js";
import Profile from "../models/profile.js";
import watchingHabit from "../models/habit.js";

// Fetch all content (movies, shows, etc.) VV
export const getAllContent = async (req, res, next) => {
  try {
    const contents = await Content.find({ type: { $ne: "Episode" } })
      .sort({ popularity: -1 })
      .lean();
    res.status(200).json(contents);
  } catch (err) {
    next(err); // pass to centralized error handler
  }
};

//Fetch content by genre
export async function getContentByGenre(req, res, next) {
  try {
    const { genre } = req.params;
    const content = await Content.find({
      genres: genre,
      type: { $ne: "Episode" },
    })
      .sort({ releaseYear: -1 })
      .lean();
    res.status(200).json(content);
  } catch (err) {
    next(err);
  }
}

async function continueWatchingForProfile(profileId) {
  const habits = await watchingHabit
    .find({
      profileId,
      completed: false,
      watchedTimeInSeconds: { $gt: 0 },
    })
    .sort({ updatedAt: -1 })
    .limit(10)
    .populate("contentId")
    .lean();
  // Filter out any populated Episode items
  return habits
    .map((h) => h.contentId)
    .filter((c) => c && c.type !== "Episode");
}

async function completedWatchingByProfile(profileId) {
  const habits = await watchingHabit
    .find({ profileId, completed: true })
    .sort({ updatedAt: -1 })
    .populate("contentId")
    .lean();
  return habits
    .map((h) => h.contentId)
    .filter((c) => c && c.type !== "Episode");
}

async function likedByProfile(profileId) {
  const habits = await watchingHabit
    .find({ profileId, liked: true })
    .populate("contentId")
    .lean();
  return habits
    .map((h) => h.contentId)
    .filter((c) => c && c.type !== "Episode");
}

async function recommendationsForProfile(profileId) {
  const liked = await likedByProfile(profileId);
  if (!liked.length) {
    // Fallback: top popular content
    return await Content.find({ type: { $ne: "Episode" } })
      .sort({ popularity: -1 })
      .limit(10)
      .lean();
  }

  // Collect genres from liked content
  const likedGenres = liked.flatMap((item) => item.genres || []);
  const topGenres = [...new Set(likedGenres)];

  // Find more content in similar genres (excluding already liked)
  return await Content.find({
    genres: { $in: topGenres },
    _id: { $nin: liked.map((c) => c._id) },
    type: { $ne: "Episode" },
  })
    .sort({ popularity: -1 })
    .limit(10)
    .lean();
}

export async function getFeedForProfile(req, res) {
  try {
    const profileName = req.params.profileName;
    // populate likedContents and watchlist
    const profile = await Profile.findOne({ name: profileName })
      .populate("likedContents")
      .populate("watchlist");

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileId = profile._id;

    // Liked by profile - prefer explicit likedContents on the profile document,
    // otherwise fall back to habits where 'liked' was recorded.
    let likedBy = [];
    if (profile.likedContents && profile.likedContents.length) {
      // profile.likedContents are populated documents (or ObjectIds) - ensure they're plain objects
      likedBy = profile.likedContents.map((c) =>
        c.toObject ? c.toObject() : c
      );
    } else {
      likedBy = await likedByProfile(profileId);
    }
    // Continue Watching
    const continueWatching = await continueWatchingForProfile(profileId);

    // Recommendations
    const recommendations = await recommendationsForProfile(profileId);

    // Most Popular
    // Exclude episodes from most popular
    const mostPopular = await Content.find({ type: { $ne: "Episode" } })
      .sort({ popularity: -1 })
      .limit(10)
      .lean();

    // Newest by Genre
    // Use only movies and shows for the per-genre newest lists
    const contents = await Content.find({ type: { $ne: "Episode" } })
      .sort({ releaseYear: -1 })
      .lean();
    const newestByGenre = {};
    for (const movie of contents) {
      for (const genre of movie.genres || []) {
        if (!newestByGenre[genre]) newestByGenre[genre] = [];
        if (newestByGenre[genre].length < 10) {
          newestByGenre[genre].push(movie);
        }
      }
    }

    // My List (watchlist)
    const myList = (
      profile.watchlist?.map((c) => (c.toObject ? c.toObject() : c)) || []
    ).filter((c) => c && c.type !== "Episode");

    // Ensure likedBy from profile.likedContents also excludes episodes
    likedBy = (likedBy || []).filter((c) => c && c.type !== "Episode");

    res.json({
      likedBy,
      myList,
      continueWatching,
      recommendations,
      mostPopular,
      newestByGenre,
    });
  } catch (err) {
    console.error("Error building feed:", err);
    res.status(500).json({ error: "Failed to build feed" });
  }
}
