import ffmpeg from "fluent-ffmpeg";
import Content from "../models/content.js";
import Movie from "../models/movie.js";
import Show from "../models/show.js";
import Episode from "../models/episode.js";
import { fetchIMDBData } from "./imdbController.js";
import { uploadFromMultipart } from "../config/media.js";

// Normalize form input
function normalizeFormData(req) {
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
async function fetchRuntimeAndRating(
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
    console.warn("IMDb fetch failed:", err.message);
  }

  return { imdbRating, runtimeMinutes };
}

// Extract video duration via ffmpeg if not provided by IMDb
async function extractVideoLength(req, currentLength) {
  return currentLength; // Keep IMDb runtime or user-provided value
}

// Create Movie
async function createMovie(data) {
  const movie = new Movie({
    title: data.title,
    description: data.description,
    posterUrl: data.posterUrl,
    releaseYear: data.parsedYear,
    director: data.director,
    actors: data.normalizedActors,
    genres: data.normalizedGenres,
    imdbRating: data.imdbRating,
    videoUrl: data.videoPath || "",
    lengthMinutes: data.runtimeMinutes,
  });

  await movie.save();
  return movie;
}

// Create Show
async function createShow(data) {
  const show = new Show({
    title: data.title,
    description: data.description,
    posterUrl: data.posterUrl,
    releaseYear: data.parsedYear,
    director: data.director,
    actors: data.normalizedActors,
    genres: data.normalizedGenres,
    imdbRating: data.imdbRating,
    seasons: new Map(),
  });

  await show.save();
  return show;
}

// Create Episode and link to parent show
async function createEpisode(data) {
  // Case-insensitive show lookup
  const show = await Show.findOne({
    title: new RegExp(`^${data.title}$`, "i"),
  });
  if (!show) throw new Error(`Show "${data.title}" not found.`);

  // Create new episode
  const episode = new Episode({
    title: show.title,
    episodeTitle: data.episodeTitle,
    seasonNumber: Number(data.seasonNumber),
    episodeNumber: Number(data.episodeNumber),
    description: data.episodeDescription || show.description || "",
    posterUrl: data.posterUrl,
    releaseDate: data.releaseDate ? new Date(data.releaseDate) : undefined,
    videoUrl: data.videoPath || "",
    lengthMinutes: data.runtimeMinutes,
    director: show.director,
    actors: show.actors,
    genres: show.genres,
    imdbRating: show.imdbRating,
  });

  await episode.save();

  // Update show's seasons map
  const seasonKey = String(data.seasonNumber);
  const seasonsMap =
    show.seasons instanceof Map
      ? show.seasons
      : new Map(Object.entries(show.seasons || {}));

  if (!seasonsMap.has(seasonKey)) seasonsMap.set(seasonKey, []);
  seasonsMap.get(seasonKey).push(episode._id);

  show.seasons = seasonsMap;
  await show.save();

  return episode;
}

// Render the "Add Content" page
export const showAddForm = async (req, res) => {
  try {
    // Get distinct genre list for dropdown
    const existingGenres = await Content.distinct("genres");
    res.render("add_content", { genres: existingGenres.sort() });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading form");
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
    else res.render("upload_fail", { message: "Invalid content type" });

    // Return success message
    return res.render("upload_success", {
      message: `${data.type} added successfully!`,
    });
  } catch (err) {
    console.error("Error saving content:", err);
    const message = err.message?.includes("not found")
      ? err.message
      : "Server error while saving content.";
    res.render("upload_fail", { message });
  }
}
