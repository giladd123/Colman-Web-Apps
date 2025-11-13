import Content from "../models/content.js";
import Show from "../models/show.js";
import Episode from "../models/episode.js";
import { uploadFromMultipart } from "../config/media.js";
import {
  normalizeFormData,
  fetchRuntimeAndRating,
  extractVideoLength,
  getExistingGenres,
} from "./contentHelpers.js";
import { checkForDuplicates } from "./contentValidation.js";
import { createMovie, createShow, createEpisode } from "./contentCreators.js";
import apiResponse from "../utils/apiResponse.js";
import {
  info as logInfo,
  error as logError,
  warn as logWarn,
} from "../utils/logger.js";

// Render the "Add Content" page
export const showAddForm = async (req, res) => {
  try {
    // Get distinct genre list for dropdown with null safety
    const existingGenres = await getExistingGenres();
    res.render("add_content", { genres: existingGenres });
  } catch (err) {
    logError(`Error loading add content form: ${err.message}`, {
      stack: err.stack,
    });
    res.status(500).send("Error loading form");
  }
};

// Render edit landing page (no specific content selected yet)
export const showEditLanding = async (req, res) => {
  try {
    const existingGenres = await getExistingGenres();
    const placeholderContent = {
      _id: "",
      type: "",
      title: "",
      description: "",
      genres: [],
      actors: [],
    };

    res.render("edit_content", {
      content: placeholderContent,
      genres: existingGenres,
      isEdit: true,
    });
  } catch (err) {
    logError(`Error loading edit form: ${err.message}`, { stack: err.stack });
    res.status(500).render("upload_fail", {
      message: "Error loading edit form",
      isDuplicate: false,
    });
  }
};

// Render the "Edit Content" page
export const showEditForm = async (req, res) => {
  try {
    const { id } = req.params;
    const content = await Content.findById(id);

    if (!content) {
      return res.status(404).render("upload_fail", {
        message: "Content not found",
        isDuplicate: false,
      });
    }

    // Get distinct genre list for dropdown with null safety
    const existingGenres = await getExistingGenres();

    res.render("edit_content", {
      content,
      genres: existingGenres,
      isEdit: true,
    });
  } catch (err) {
    logError(`Error loading edit form: ${err.message}`, { stack: err.stack });
    res.status(500).render("upload_fail", {
      message: "Error loading edit form",
      isDuplicate: false,
    });
  }
};

// Render delete success screen
export const showDeleteSuccess = (req, res) => {
  const { title = "", type = "Content" } = req.query;
  const displayType = type || "Content";

  res.render("delete_success", {
    message: `${displayType} deleted successfully!`,
    title,
    type: displayType,
  });
};

// Check if content exists based on type, title, and for episodes - season and episode number
export const checkContentExists = async (req, res) => {
  try {
    const { type, title, seasonNumber, episodeNumber } = req.query;

    if (!type || !title) {
      return apiResponse.badRequest(res, "Type and title are required");
    }

    let query = {
      title: { $regex: new RegExp(`^${title}$`, "i") }, // Case-insensitive exact match
    };

    // For episodes, also check season and episode number
    if (type === "episode") {
      if (!seasonNumber || !episodeNumber) {
        return apiResponse.badRequest(
          res,
          "Season and episode number are required for episodes"
        );
      }
      query.seasonNumber = Number(seasonNumber);
      query.episodeNumber = Number(episodeNumber);
    } else {
      // For movies and shows, filter by type
      query.type = type.charAt(0).toUpperCase() + type.slice(1);
    }

    const content = await Content.findOne(query);

    if (content) {
      return apiResponse.ok(res, {
        success: true,
        data: { exists: true, contentId: content._id },
      });
    } else {
      return apiResponse.ok(res, {
        success: true,
        data: { exists: false },
      });
    }
  } catch (err) {
    logError(`Error checking content existence: ${err.message}`, {
      stack: err.stack,
    });
    return apiResponse.serverError(res, "Error checking content existence");
  }
};

// Add new content
export async function addContent(req, res) {
  try {
    // Normalize form data
    const data = normalizeFormData(req);

    // Server-side guard: require a valid content type
    const allowedTypes = ["movie", "show", "episode"];
    if (!data.type || !allowedTypes.includes(data.type)) {
      return res.render("upload_fail", { message: "Content type is required" });
    }

    // Check for duplicates before processing
    const existingContent = await checkForDuplicates(
      data.type,
      data.title,
      data.parsedYear,
      data.seasonNumber,
      data.episodeNumber
    );

    if (existingContent) {
      const contentTypeDisplay =
        data.type.charAt(0).toUpperCase() + data.type.slice(1);
      let duplicateMessage;

      if (data.type === "episode") {
        duplicateMessage = `Episode "${
          data.episodeTitle || `S${data.seasonNumber}E${data.episodeNumber}`
        }" of "${data.title}" already exists.`;
      } else {
        const yearText = data.parsedYear ? ` (${data.parsedYear})` : "";
        duplicateMessage = `${contentTypeDisplay} "${data.title}${yearText}" already exists.`;
      }

      return res.render("upload_fail", {
        message: duplicateMessage,
        isDuplicate: true,
        existingContentId: existingContent._id,
        contentType: data.type,
      });
    }

    // Upload video to S3 if provided:
    if (req.file) {
      const uploadResult = await uploadFromMultipart(req.file);
      data.videoPath = uploadResult.url;
    }

    // Fetch IMDb info
    const { imdbRating, runtimeMinutes } = await fetchRuntimeAndRating(
      data.title,
      data.type,
      data.seasonNumber,
      data.episodeNumber,
      data.runtimeMinutes
    );
    data.imdbRating = imdbRating;
    data.runtimeMinutes = runtimeMinutes;

    // Try extracting video duration if IMDb runtime not found
    data.runtimeMinutes = await extractVideoLength(req, data.runtimeMinutes);

    // Create content type
    let newContent;
    if (data.type === "movie") newContent = await createMovie(data);
    else if (data.type === "show") newContent = await createShow(data);
    else if (data.type === "episode") newContent = await createEpisode(data);
    else {
      return res.render("upload_fail", { message: "Invalid content type" });
    }

    // Log successful content upload to DB
    logInfo(
      `${data.type} "${data.title}" uploaded successfully`,
      { contentId: newContent._id, type: data.type, title: data.title },
      true
    );

    // Return success message
    return res.render("upload_success", {
      message: `${data.type} added successfully!`,
    });
  } catch (err) {
    // Log failed content upload to DB
    logError(
      `Failed to upload ${req.body.type}: ${err.message}`,
      { stack: err.stack, type: req.body.type, title: req.body.title },
      true
    );

    const message = err.message?.includes("not found")
      ? err.message
      : "Server error while saving content.";
    res.render("upload_fail", { message });
  }
}

// Update existing content
export async function updateContent(req, res) {
  try {
    const { id } = req.params;
    const existingContent = await Content.findById(id);

    if (!existingContent) {
      return res.render("upload_fail", {
        message: "Content not found",
        isDuplicate: false,
      });
    }

    // Normalize form data
    const data = normalizeFormData(req);
    const { userId } = req.body || {};

    logInfo(`Update requested for "${existingContent.title}"`, {
      contentId: id,
      existingType: existingContent.type,
      requestedType: data.type,
      title: data.title,
      userId: userId || req.adminUser?._id?.toString(),
    });

    // Check if title/identifying info changed and would create a duplicate
    if (
      data.title.toLowerCase() !== existingContent.title.toLowerCase() ||
      data.parsedYear !== existingContent.releaseYear ||
      (data.type === "episode" &&
        (Number(data.seasonNumber) !== existingContent.seasonNumber ||
          Number(data.episodeNumber) !== existingContent.episodeNumber))
    ) {
      const duplicateContent = await checkForDuplicates(
        data.type,
        data.title,
        data.parsedYear,
        data.seasonNumber,
        data.episodeNumber
      );

      if (duplicateContent && duplicateContent._id.toString() !== id) {
        logWarn("Update blocked due to duplicate content", {
          attemptedTitle: data.title,
          attemptedSeason: data.seasonNumber,
          attemptedEpisode: data.episodeNumber,
          duplicateId: duplicateContent._id,
          requestId: id,
        });
        const contentTypeDisplay =
          data.type.charAt(0).toUpperCase() + data.type.slice(1);
        let duplicateMessage;

        if (data.type === "episode") {
          duplicateMessage = `Episode "${
            data.episodeTitle || `S${data.seasonNumber}E${data.episodeNumber}`
          }" of "${data.title}" already exists.`;
        } else {
          const yearText = data.parsedYear ? ` (${data.parsedYear})` : "";
          duplicateMessage = `${contentTypeDisplay} "${data.title}${yearText}" already exists.`;
        }

        return res.render("upload_fail", {
          message: duplicateMessage + " Cannot update to duplicate content.",
          isDuplicate: true,
          existingContentId: duplicateContent._id,
          contentType: data.type,
        });
      }
    }

    // Upload new video to S3 if provided
    if (req.file) {
      const uploadResult = await uploadFromMultipart(req.file);
      data.videoPath = uploadResult.url;
    } else {
      // Keep existing video if no new file uploaded
      data.videoPath = existingContent.videoUrl || "";
    }

    // Fetch IMDb info if title changed
    let imdbRating = existingContent.imdbRating;
    let runtimeMinutes = data.runtimeMinutes || existingContent.lengthMinutes;

    if (data.title.toLowerCase() !== existingContent.title.toLowerCase()) {
      const imdbData = await fetchRuntimeAndRating(
        data.title,
        data.type,
        data.seasonNumber,
        data.episodeNumber,
        runtimeMinutes
      );
      imdbRating = imdbData.imdbRating || existingContent.imdbRating;
      runtimeMinutes = imdbData.runtimeMinutes || runtimeMinutes;
    }

    // Update content based on type - only update fields that have values
    const updateData = {};

    // Update title if provided
    if (data.title && data.title.trim()) {
      updateData.title = data.title;
    }

    // Update description if provided
    if (data.type === "episode") {
      if (data.episodeDescription && data.episodeDescription.trim()) {
        updateData.description = data.episodeDescription;
      }
    } else {
      if (data.description && data.description.trim()) {
        updateData.description = data.description;
      }
    }

    // Update other fields only if provided
    if (data.posterUrl && data.posterUrl.trim()) {
      updateData.posterUrl = data.posterUrl;
    }

    if (data.parsedYear) {
      updateData.releaseYear = data.parsedYear;
    }

    if (data.director && data.director.trim()) {
      updateData.director = data.director;
    }

    if (data.normalizedActors && data.normalizedActors.length > 0) {
      updateData.actors = data.normalizedActors;
    }

    if (data.normalizedGenres && data.normalizedGenres.length > 0) {
      updateData.genres = data.normalizedGenres;
    }

    if (imdbRating !== undefined && imdbRating !== null) {
      updateData.imdbRating = imdbRating;
    }

    // Type-specific updates
    if (data.type === "episode") {
      if (data.episodeTitle && data.episodeTitle.trim()) {
        updateData.episodeTitle = data.episodeTitle;
      }
      if (data.seasonNumber) {
        updateData.seasonNumber = Number(data.seasonNumber);
      }
      if (data.episodeNumber) {
        updateData.episodeNumber = Number(data.episodeNumber);
      }
      if (data.releaseDate) {
        updateData.releaseDate = new Date(data.releaseDate);
      }
      if (data.videoPath) {
        updateData.videoUrl = data.videoPath;
      }
      if (runtimeMinutes) {
        updateData.lengthMinutes = runtimeMinutes;
      }
    } else if (data.type === "movie") {
      if (data.videoPath) {
        updateData.videoUrl = data.videoPath;
      }
      if (runtimeMinutes) {
        updateData.lengthMinutes = runtimeMinutes;
      }
    }

    // Update the content
    await Content.findByIdAndUpdate(id, updateData, { new: true });

    // If it's an episode, update the show's seasons map if season/episode number changed
    if (
      data.type === "episode" &&
      (Number(data.seasonNumber) !== existingContent.seasonNumber ||
        Number(data.episodeNumber) !== existingContent.episodeNumber)
    ) {
      // Find the parent show and update its seasons map
      const show = await Show.findOne({
        title: new RegExp(`^${data.title}$`, "i"),
      });

      if (show) {
        const seasonsMap =
          show.seasons instanceof Map
            ? show.seasons
            : new Map(Object.entries(show.seasons || {}));

        // Remove from old season
        const oldSeasonKey = String(existingContent.seasonNumber);
        if (seasonsMap.has(oldSeasonKey)) {
          const episodes = seasonsMap.get(oldSeasonKey);
          const filteredEpisodes = episodes.filter(
            (epId) => epId.toString() !== id
          );
          if (filteredEpisodes.length > 0) {
            seasonsMap.set(oldSeasonKey, filteredEpisodes);
          } else {
            seasonsMap.delete(oldSeasonKey);
          }
        }

        // Add to new season
        const newSeasonKey = String(data.seasonNumber);
        if (!seasonsMap.has(newSeasonKey)) seasonsMap.set(newSeasonKey, []);
        seasonsMap.get(newSeasonKey).push(id);

        show.seasons = seasonsMap;
        await show.save();
      }
    }

    // Log successful content update to DB
    logInfo(
      `${data.type} "${data.title}" updated successfully`,
      { contentId: id, type: data.type, title: data.title },
      true
    );

    return res.render("upload_success", {
      message: `${data.type} updated successfully!`,
    });
  } catch (err) {
    // Log failed content update to DB
    logError(
      `Failed to update ${req.body.type}: ${err.message}`,
      {
        stack: err.stack,
        contentId: req.params.id,
        type: req.body.type,
        title: req.body.title,
      },
      true
    );

    const message = err.message?.includes("not found")
      ? err.message
      : "Server error while updating content.";
    res.render("upload_fail", { message, isDuplicate: false });
  }
}

// Delete content
export async function deleteContent(req, res) {
  try {
    const { id } = req.params;
    const existingContent = await Content.findById(id);

    if (!existingContent) {
      return apiResponse.notFound(res, "Content not found");
    }

    const { userId } = req.body || {};
    logInfo(`Delete requested for "${existingContent.title}"`, {
      contentId: id,
      type: existingContent.type,
      userId: userId || req.adminUser?._id?.toString(),
    });

    // Check if this is an episode and handle show seasons cleanup
    if (existingContent.type === "Episode") {
      // Find the parent show and remove this episode from its seasons
      const show = await Show.findOne({
        title: new RegExp(`^${existingContent.title}$`, "i"),
      });

      if (show) {
        const seasonsMap =
          show.seasons instanceof Map
            ? show.seasons
            : new Map(Object.entries(show.seasons || {}));

        const seasonKey = String(existingContent.seasonNumber);
        if (seasonsMap.has(seasonKey)) {
          const episodes = seasonsMap.get(seasonKey);
          const filteredEpisodes = episodes.filter(
            (epId) => epId.toString() !== id
          );

          if (filteredEpisodes.length > 0) {
            seasonsMap.set(seasonKey, filteredEpisodes);
          } else {
            seasonsMap.delete(seasonKey);
          }

          show.seasons = seasonsMap;
          await show.save();
        }
      }
    }

    // Check if this is a show and delete all associated episodes
    if (existingContent.type === "Show") {
      await Episode.deleteMany({
        title: new RegExp(`^${existingContent.title}$`, "i"),
      });
    }

    // Delete the content
    await Content.findByIdAndDelete(id);

    // Log successful content deletion
    logInfo(
      `${existingContent.type || "Content"} "${
        existingContent.title
      }" deleted successfully`,
      {
        contentId: id,
        type: existingContent.type,
        title: existingContent.title,
      },
      true
    );

    const displayType = existingContent.type || "Content";
    const redirectUrl = `/admin/delete-success?title=${encodeURIComponent(
      existingContent.title
    )}&type=${encodeURIComponent(displayType)}`;

    return apiResponse.ok(res, {
      success: true,
      data: {
        message: `${displayType} deleted successfully!`,
      },
      redirect: redirectUrl,
    });
  } catch (err) {
    // Log failed content deletion
    logError(
      `Failed to delete content: ${err.message}`,
      {
        stack: err.stack,
        contentId: req.params.id,
      },
      true
    );

    return apiResponse.serverError(res, "Server error while deleting content");
  }
}
