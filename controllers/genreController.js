import Content from "../models/content.js";
import Profile from "../models/profile.js";
import watchingHabit from "../models/habit.js";
import Episode from "../models/episode.js";
import Show from "../models/show.js";
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
      filterWatched = "all",
      profileId = null,
    } = req.query;

    const limit = parseInt(process.env.GENRE_CONTENT_LIMIT || 10);
    const skip = (parseInt(page) - 1) * limit;

    // Build sort object
    const shouldSort = sortBy && sortBy !== "default";
    const sortObj = shouldSort
      ? { [sortBy]: sortOrder === "asc" ? 1 : -1 }
      : null;

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
        .select("contentId")
        .lean();

      const habitContentIds = watchedHabits
        .map((h) => h.contentId)
        .filter(Boolean);

      const normalizedWatchedIdSet = new Set();

      if (habitContentIds.length > 0) {
        const habitContents = await Content.find({
          _id: { $in: habitContentIds },
        })
          .select("type showId")
          .lean();

        const completedEpisodeIds = [];

        habitContents.forEach((doc) => {
          if (!doc) return;
          if (doc.type === "Movie" || doc.type === "Show") {
            normalizedWatchedIdSet.add(doc._id.toString());
          } else if (doc.type === "Episode") {
            completedEpisodeIds.push(doc._id);
          }
        });

        if (completedEpisodeIds.length > 0) {
          const episodeDocs = await Episode.find({
            _id: { $in: completedEpisodeIds },
          })
            .select("_id showId")
            .lean();

          const completedEpisodeIdSet = new Set(
            episodeDocs.map((ep) => ep._id.toString())
          );

          const showIdsToCheck = new Set();
          const episodesMissingShow = [];

          episodeDocs.forEach((ep) => {
            if (!ep) return;
            if (ep.showId && mongoose.Types.ObjectId.isValid(ep.showId)) {
              showIdsToCheck.add(ep.showId.toString());
            } else {
              episodesMissingShow.push(ep._id.toString());
            }
          });

          if (showIdsToCheck.size > 0) {
            const showObjectIds = Array.from(showIdsToCheck).map(
              (id) => new mongoose.Types.ObjectId(id)
            );

            // Identify the final episode for each show by ordering seasons and episodes
            const lastEpisodes = await Episode.aggregate([
              { $match: { showId: { $in: showObjectIds } } },
              { $sort: { seasonNumber: -1, episodeNumber: -1, _id: -1 } },
              {
                $group: {
                  _id: "$showId",
                  lastEpisodeId: { $first: "$_id" },
                },
              },
            ]);

            lastEpisodes.forEach((doc) => {
              if (!doc || !doc.lastEpisodeId) return;
              const lastEpisodeIdStr = doc.lastEpisodeId.toString();
              if (completedEpisodeIdSet.has(lastEpisodeIdStr)) {
                normalizedWatchedIdSet.add(doc._id.toString());
              }
            });
          }

          if (episodesMissingShow.length > 0) {
            const episodesMissingShowSet = new Set(episodesMissingShow);
            const fallbackShows = await Show.find({})
              .select("_id seasons")
              .lean();

            // Fallback for legacy data where episodes were stored without a showId reference
            const getSeasonKeys = (seasons) => {
              if (!seasons) return [];
              if (typeof seasons.keys === "function") {
                return Array.from(seasons.keys());
              }
              return Object.keys(seasons);
            };

            const getSeasonEpisodes = (seasons, key) => {
              if (!seasons) return [];
              if (typeof seasons.get === "function") {
                return seasons.get(key) || [];
              }
              return seasons[key] || [];
            };

            fallbackShows.forEach((show) => {
              if (!show) return;
              const seasonKeys = getSeasonKeys(show.seasons);
              if (!seasonKeys.length) return;

              let containsMissingEpisode = false;
              seasonKeys.forEach((key) => {
                const episodes = getSeasonEpisodes(show.seasons, key);
                episodes.forEach((epEntry) => {
                  const episodeId = (epEntry && epEntry._id) || epEntry || null;
                  if (!episodeId) return;
                  if (episodesMissingShowSet.has(episodeId.toString())) {
                    containsMissingEpisode = true;
                  }
                });
              });

              if (!containsMissingEpisode) return;

              seasonKeys.sort((a, b) => Number(a) - Number(b));
              const lastSeasonKey = seasonKeys[seasonKeys.length - 1];
              const lastSeasonEpisodes = getSeasonEpisodes(
                show.seasons,
                lastSeasonKey
              );
              if (!lastSeasonEpisodes || !lastSeasonEpisodes.length) return;

              const rawLastEpisode =
                lastSeasonEpisodes[lastSeasonEpisodes.length - 1];
              const lastEpisodeId =
                (rawLastEpisode && rawLastEpisode._id) || rawLastEpisode;
              if (!lastEpisodeId) return;

              if (completedEpisodeIdSet.has(lastEpisodeId.toString())) {
                normalizedWatchedIdSet.add(show._id.toString());
              }
            });
          }
        }
      }

      const watchedIds = Array.from(normalizedWatchedIdSet)
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

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

      let queryBuilder = Content.find(query);
      if (sortObj) {
        queryBuilder = queryBuilder.sort(sortObj);
      }
      content = await queryBuilder.skip(skip).limit(limit).lean();

      totalCount = await Content.countDocuments(query);
    } else {
      let queryBuilder = Content.find(query);
      if (sortObj) {
        queryBuilder = queryBuilder.sort(sortObj);
      }
      content = await queryBuilder.skip(skip).limit(limit).lean();

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
