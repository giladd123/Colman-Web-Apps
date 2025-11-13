import Content from "../models/content.js";
import { error as logError } from "../utils/logger.js";

// Check for duplicate content based on type-specific criteria
export async function checkForDuplicates(
  type,
  title,
  releaseYear,
  seasonNumber,
  episodeNumber
) {
  try {
    // Case-insensitive title match
    const baseQuery = { title: new RegExp(`^${title.trim()}$`, "i") };

    if (type === "episode") {
      // For episodes: match title (show name) + season + episode number
      baseQuery.seasonNumber = Number(seasonNumber);
      baseQuery.episodeNumber = Number(episodeNumber);
      baseQuery.type = "Episode";
    } else if (type === "movie" || type === "show") {
      // For movies/shows: match title + release year (if provided)
      if (releaseYear) {
        baseQuery.releaseYear = Number(releaseYear);
      }
      baseQuery.type = type === "movie" ? "Movie" : "Show";
    }

    const existingContent = await Content.findOne(baseQuery);
    return existingContent;
  } catch (error) {
    logError(`Error checking for duplicates: ${error.message}`, {
      stack: error.stack,
    });
    return null;
  }
}
