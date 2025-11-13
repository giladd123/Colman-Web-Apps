import Content from "../models/content.js";
import Profile from "../models/profile.js";
import watchingHabit from "../models/habit.js";
import Episode from "../models/episode.js";
import Show from "../models/show.js";
import { ok, notFound, serverError } from "../utils/apiResponse.js";
import { error as logError } from "../utils/logger.js";

// Fetch all content (movies, shows, etc.) VV
export const getAllContent = async (req, res) => {
  try {
    const contents = await Content.find({ type: { $ne: "Episode" } })
      .sort({ popularity: -1 })
      .lean();
    return ok(res, contents);
  } catch (err) {
    logError(`Failed to retrieve all content: ${err.message}`, {
      stack: err.stack,
    });
    return serverError(res, "Failed to retrieve content");
  }
};

//Fetch content by genre
export async function getContentByGenre(req, res) {
  try {
    const { genre } = req.params;
    const content = await Content.find({
      genres: genre,
      type: { $ne: "Episode" },
    })
      .sort({ releaseYear: -1 })
      .lean();
    return ok(res, content);
  } catch (err) {
    logError(
      `Failed to retrieve content by genre ${req.params.genre}: ${err.message}`,
      { stack: err.stack }
    );
    return serverError(
      res,
      "Failed to retrieve content for the requested genre"
    );
  }
}

async function continueWatchingForProfile(profileId) {
  try {
    // Find all habits for this profile where watching is in progress
    const habits = await watchingHabit
      .find({
        profileId,
        completed: false,
        watchedTimeInSeconds: { $ne: 0 },
      })
      .sort({ lastWatchedAt: -1 }) // Most recent first
      .populate("contentId")
      .lean();

    const result = [];
    const addedShowIds = new Set(); // Track shows we've already added

    for (const habit of habits) {
      if (!habit.contentId) continue;

      const content = habit.contentId;

      if (content.type === "Episode") {
        // For episodes, find the parent show
        const episode = await Episode.findById(content._id).lean();
        if (!episode) continue;

        // Find the show that contains this episode
        const parentShow = await Show.findOne({
          seasons: { $exists: true },
        }).lean();

        // Search through all shows to find which one contains this episode
        const shows = await Show.find({}).lean();
        let foundShow = null;

        for (const show of shows) {
          if (!show.seasons) continue;
          // Check if any season contains this episode
          for (const [seasonNum, episodeIds] of Object.entries(show.seasons)) {
            if (
              episodeIds.some((id) => id.toString() === content._id.toString())
            ) {
              foundShow = show;
              break;
            }
          }
          if (foundShow) break;
        }

        // Only add the show if we haven't added it yet
        if (foundShow && !addedShowIds.has(foundShow._id.toString())) {
          result.push(foundShow);
          addedShowIds.add(foundShow._id.toString());
        }
      } else if (content.type === "Movie") {
        // For movies, add directly
        result.push(content);
      }
    }

    return result;
  } catch (err) {
    console.error("Error in continueWatchingForProfile:", err);
    return [];
  }
}

async function completedWatchingByProfile(profileId) {
  try {
    // Find all habits for this profile that are completed
    const habits = await watchingHabit
      .find({ profileId, completed: true })
      .sort({ lastWatchedAt: -1 }) // Most recently completed first
      .populate("contentId")
      .lean();

    const result = [];
    const addedShowIds = new Set(); // Track shows we've already added

    for (const habit of habits) {
      if (!habit.contentId) continue;

      const content = habit.contentId;

      if (content.type === "Episode") {
        // For episodes, find the parent show
        const episode = await Episode.findById(content._id).lean();
        if (!episode) continue;

        // Search through all shows to find which one contains this episode
        const shows = await Show.find({}).lean();
        let foundShow = null;

        for (const show of shows) {
          if (!show.seasons) continue;
          // Check if any season contains this episode
          for (const [seasonNum, episodeIds] of Object.entries(show.seasons)) {
            if (
              episodeIds.some((id) => id.toString() === content._id.toString())
            ) {
              foundShow = show;
              break;
            }
          }
          if (foundShow) break;
        }

        // Only add the show if we haven't added it yet
        if (foundShow && !addedShowIds.has(foundShow._id.toString())) {
          result.push(foundShow);
          addedShowIds.add(foundShow._id.toString());
        }
      } else if (content.type === "Movie") {
        // For movies, add directly
        result.push(content);
      }
    }

    return result;
  } catch (err) {
    console.error("Error in completedWatchingByProfile:", err);
    return [];
  }
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
    // Fallback: top rated content
    return await Content.find({ type: { $ne: "Episode" } })
      .sort({ imdbRating: -1 })
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
    .sort({ imdbRating: -1 })
    .limit(10)
    .lean();
}

export async function getFeedForProfile(req, res) {
  try {
    const profileId = req.session.selectedProfileId;
    // populate likedContents and watchlist
    const profile = await Profile.findById(profileId)
      .populate("likedContents")
      .populate("watchlist");

    if (!profile) {
      return notFound(res, "Profile not found");
    }

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

    // Watch Again (completed content)
    const watchAgain = await completedWatchingByProfile(profileId);

    // Recommendations
    const recommendations = await recommendationsForProfile(profileId);

    // Most Popular
    const mostPopular = await Content.find({ type: { $ne: "Episode" } })
      .sort({ popularity: -1 })
      .limit(10)
      .lean();

    // Newest by Genre
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

    return ok(res, {
      profile: {
        id: profile._id,
        name: profile.name,
        avatar: profile.avatar,
      },
      likedBy,
      myList,
      watchAgain,
      continueWatching,
      recommendations,
      mostPopular,
      newestByGenre,
    });
  } catch (err) {
    logError(
      `Failed to build feed for profile ${req.params.profileId}: ${err.message}`,
      {
        stack: err.stack,
      }
    );
    return serverError(res, "Failed to build feed");
  }
}
