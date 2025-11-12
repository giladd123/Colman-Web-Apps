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
import { info as logInfo, error as logError } from "../utils/logger.js";

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

    // Update content based on type
    const updateData = {
      title: data.title,
      description:
        data.type === "episode"
          ? data.episodeDescription || existingContent.description
          : data.description,
      posterUrl: data.posterUrl || existingContent.posterUrl,
      releaseYear: data.parsedYear || existingContent.releaseYear,
      director: data.director || existingContent.director,
      actors:
        data.normalizedActors.length > 0
          ? data.normalizedActors
          : existingContent.actors,
      genres:
        data.normalizedGenres.length > 0
          ? data.normalizedGenres
          : existingContent.genres,
      imdbRating: imdbRating,
    };

    if (data.type === "episode") {
      updateData.episodeTitle =
        data.episodeTitle || existingContent.episodeTitle;
      updateData.seasonNumber =
        Number(data.seasonNumber) || existingContent.seasonNumber;
      updateData.episodeNumber =
        Number(data.episodeNumber) || existingContent.episodeNumber;
      updateData.releaseDate = data.releaseDate
        ? new Date(data.releaseDate)
        : existingContent.releaseDate;
      if (data.videoPath) updateData.videoUrl = data.videoPath;
      updateData.lengthMinutes = runtimeMinutes;
    } else if (data.type === "movie") {
      if (data.videoPath) updateData.videoUrl = data.videoPath;
      updateData.lengthMinutes = runtimeMinutes;
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
      return res.status(404).render("upload_fail", {
        message: "Content not found",
        isDuplicate: false,
      });
    }

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

    return res.json(
      apiResponse.success({
        message: `${existingContent.type || "Content"} deleted successfully!`,
      })
    );
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

    return res
      .status(500)
      .json(apiResponse.error("Server error while deleting content"));
  }
}
