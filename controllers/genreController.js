import Content from "../models/content.js";
import Profile from "../models/profile.js";
import watchingHabit from "../models/habit.js";
import { ok, serverError } from "../utils/apiResponse.js";
import { error as logError } from "../utils/logger.js";

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

    // Get profile from session/auth if available for watch filtering
    let profileId = null;
    if (req.session && req.session.currentProfile) {
      const profile = await Profile.findOne({
        name: req.session.currentProfile,
      });
      if (profile) {
        profileId = profile._id;
      }
    }

    let content;
    let totalCount;

    if (filterWatched !== "all" && profileId) {
      // Get watched/completed content IDs for this profile
      const watchedHabits = await watchingHabit
        .find({
          profileId: profileId,
          completed: true,
        })
        .select("contentId");

      const watchedIds = watchedHabits.map((h) => h.contentId);

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
