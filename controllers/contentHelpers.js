import { fetchIMDBData } from "./imdbController.js";
import { warn as logWarn } from "../utils/logger.js";

// Normalize form input
export function normalizeFormData(req) {
  const {
    type,
    title,
    episodeTitle,
    seasonNumber,
    episodeNumber,
    description,
    episodeDescription,
    year,
    releaseDate,
    director,
    actors,
    genres = [],
    customGenres = [],
    posterUrl,
    lengthMinutes,
  } = req.body;

  const parsedYear = year ? parseInt(year) : undefined;
  const runtimeMinutes = lengthMinutes ? parseInt(lengthMinutes) : 0;

  // Convert comma separated actors to an array
  const normalizedActors = actors ? actors.split(",").map((a) => a.trim()) : [];

  // Merge regular + custom genres and remove blanks
  const normalizedGenres = [
    ...(Array.isArray(genres) ? genres : [genres]),
    ...(Array.isArray(customGenres) ? customGenres : [customGenres]),
  ]
    .map((g) => g.trim())
    .filter((g) => g !== "");

  // Initialize videoPath as empty - will be set after file upload
  let videoPath = "";

  // Return normalized object
  return {
    type,
    title,
    description,
    episodeDescription,
    parsedYear,
    releaseDate,
    director,
    normalizedActors,
    normalizedGenres,
    posterUrl,
    videoPath,
    episodeTitle,
    seasonNumber,
    episodeNumber,
    runtimeMinutes,
  };
}

// Fetch runtime and rating from IMDb
export async function fetchRuntimeAndRating(
  title,
  type,
  season,
  episode,
  currentLength
) {
  let imdbRating = null;
  let runtimeMinutes = currentLength;

  try {
    const imdbData = await fetchIMDBData({ title, type, season, episode });

    if (imdbData) {
      // Try to extract runtime string from IMDb
      const runtimeSource =
        type === "episode" && imdbData.ep
          ? imdbData.ep.Runtime
          : imdbData.Runtime;
      // Parse runtime (remove "min")
      if (runtimeSource && runtimeSource !== "N/A") {
        const match = runtimeSource.match(/(\d+) min/);
        if (match) runtimeMinutes = parseInt(match[1]);
      }

      // Extract IMDb rating if available
      if (imdbData.imdbRating && imdbData.imdbRating !== "N/A") {
        imdbRating = imdbData.imdbRating;
      }
    }
  } catch (err) {
    logWarn(`IMDb fetch failed for "${title}": ${err.message}`);
  }

  return { imdbRating, runtimeMinutes };
}

// Extract video duration via ffmpeg if not provided by IMDb
export async function extractVideoLength(req, currentLength) {
  return currentLength; // Keep IMDb runtime or user-provided value
}

// Get distinct genre list with null safety
export async function getExistingGenres() {
  let existingGenres = [];
  try {
    // Import Content here to avoid circular dependency
    const { default: Content } = await import("../models/content.js");
    const genresResult = await Content.distinct("genres");
    existingGenres = Array.isArray(genresResult)
      ? genresResult.filter((g) => g && g.trim())
      : [];
  } catch (genreError) {
    logWarn(`Could not fetch existing genres: ${genreError.message}`);
    existingGenres = [];
  }
  return existingGenres.sort();
}
