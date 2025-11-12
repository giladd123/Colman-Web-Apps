import Content from "../models/content.js";
import Profile from "../models/profile.js";
import watchingHabit from "../models/habit.js";
import { ok, serverError } from "../utils/apiResponse.js";
import { info, error as logError } from "../utils/logger.js";
import mongoose from "mongoose";

// Get all available genres
export const getAllGenres = async (req, res) => {
  try {
    const genres = await Content.distinct("genres", {
      type: { $ne: "Episode" },
    });
    return ok(res, genres.sort());
  } catch (err) {
    logError(`Failed to fetch genres: ${err.message}`, { stack: err.stack });
    return serverError(res, "Failed to fetch genres");
  }
};

// Get paginated content by genre with sorting and filtering
export const getContentByGenre = async (req, res) => {
  try {
    const { genre } = req.params;
    const {
      page = 1,
      sortBy = "popularity",
      sortOrder = "desc",
      filterWatched = "all", // 'all', 'watched', 'unwatched'
      profileId = null, // Profile ID for filtering
    } = req.query;

    const limit = parseInt(process.env.GENRE_CONTENT_LIMIT || 10);
    const skip = (parseInt(page) - 1) * limit;

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Base query
    let query = {
      genres: { $regex: new RegExp(genre, "i") },
      type: { $ne: "Episode" },
    };

    // Get profile ID for watch filtering
    // Profile ID should be provided as a query parameter when filtering is needed
    let validProfileId = null;
    if (profileId && filterWatched !== "all") {
      // Validate that profileId is a valid ObjectId
      if (!mongoose.Types.ObjectId.isValid(profileId)) {
        logError(`Invalid profileId provided for genre filter: ${profileId}`);
        return serverError(res, "Invalid profile ID");
      }

      // Verify that the profile exists
      try {
        const profile = await Profile.findById(profileId);
        if (profile) {
          validProfileId = profile._id;
        } else {
          logError(`Profile not found for genre filter: ${profileId}`);
        }
      } catch (err) {
        logError(`Error finding profile for genre filter: ${err.message}`);
      }
    }

    let content;
    let totalCount;

    if (filterWatched !== "all" && validProfileId) {
      // Get watched/completed content IDs for this profile
      const watchedHabits = await watchingHabit
        .find({
          profileId: validProfileId,
          completed: true,
        })
        .select("contentId");

      const watchedIds = watchedHabits.map((h) => h.contentId);

      // Log for debugging
      info(
        `Genre filter applied: ${filterWatched} for profile ${validProfileId}, found ${watchedIds.length} watched items`,
        {
          genre: req.params.genre,
          filterWatched,
          profileId: validProfileId,
          watchedItemsCount: watchedIds.length,
        }
      );

      if (filterWatched === "watched") {
        query._id = { $in: watchedIds };
      } else if (filterWatched === "unwatched") {
        query._id = { $nin: watchedIds };
      }

      content = await Content.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      totalCount = await Content.countDocuments(query);
    } else {
      content = await Content.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

      totalCount = await Content.countDocuments(query);
    }

    const totalPages = Math.ceil(totalCount / limit);
    const hasMore = page < totalPages;

    return ok(res, {
      content,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalCount,
        hasMore,
        limit,
      },
    });
  } catch (err) {
    logError(
      `Failed to fetch genre content for ${req.params.genre}: ${err.message}`,
      { stack: err.stack }
    );
    return serverError(res, "Failed to fetch genre content");
  }
};

// Render genre page
export const renderGenrePage = async (req, res) => {
  try {
    const { genre } = req.params;

    // Decode the genre name in case it's URL encoded
    const decodedGenre = decodeURIComponent(genre);

    res.render("genre", {
      genre: decodedGenre,
      title: `${decodedGenre} - Netflix`,
    });
  } catch (err) {
    logError(
      `Failed to render genre page for ${req.params.genre}: ${err.message}`,
      {
        stack: err.stack,
      }
    );
    return res
      .status(500)
      .render("error", { error: "Failed to load genre page" });
  }
};
