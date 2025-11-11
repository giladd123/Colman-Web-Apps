import axios from "axios";
import apiResponse from "../utils/apiResponse.js";
import { error as logError, warn as logWarn } from "../utils/logger.js";

// Parse IMDb release date to YYYY-MM-DD format
function parseReleaseDate(dateStr) {
  if (!dateStr || dateStr === "N/A") return "";
  const date = new Date(dateStr);
  return isNaN(date) ? "" : date.toISOString().split("T")[0];
}

// Format IMDb data
function formatIMDBData(IMDBData) {
  let releaseYear = IMDBData.Year || "";
  if (releaseYear.includes("–")) releaseYear = releaseYear.split("–")[0].trim();

  const isEpisode = IMDBData.Type === "episode";

  return {
    title: IMDBData.Title || "",
    description: IMDBData.Plot && IMDBData.Plot !== "N/A" ? IMDBData.Plot : "",
    director: IMDBData.Director || "",
    actors: IMDBData.Actors || "",
    rating: IMDBData.imdbRating || "",
    genre: IMDBData.Genre ? IMDBData.Genre.split(",").map((g) => g.trim()) : [],
    poster: IMDBData.Poster && IMDBData.Poster !== "N/A" ? IMDBData.Poster : "",
    runtime: IMDBData.Runtime || "",
    imdbID: IMDBData.imdbID || "",
    year: releaseYear || "",
    releaseDate: parseReleaseDate(IMDBData.Released),

    // NEW FIELDS for episodes
    ...(isEpisode && {
      episodeTitle: IMDBData.Title || "",
      seriesTitle:
        IMDBData.SeriesTitle || IMDBData.Series || IMDBData.showTitle || "", // OMDb field may vary
      season: IMDBData.Season,
      episode: IMDBData.Episode,
    }),
  };
}

// Fetch IMDb data
export async function fetchIMDBData({ title, type, season, episode }) {
  const apiKey = process.env.OMDB_API_KEY;
  if (!title) {
    const error = new Error("Title is required");
    throw error;
  }

  // Episode fetch
  if (type === "episode" && season && episode) {
    try {
      const epRes = await axios.get(
        `https://www.omdbapi.com/?t=${encodeURIComponent(
          title
        )}&Season=${season}&Episode=${episode}&plot=full&apikey=${apiKey}`
      );
      if (epRes.data.Response === "False") {
        return null;
      }
      return epRes.data;
    } catch (err) {
      logError(
        `Failed to access IMDb for episode "${title}" S${season}E${episode}: ${err.message}`,
        { stack: err.stack }
      );
      // Throw custom error for middleware
      const imdbErr = new Error("Unable to access IMDB");
      imdbErr.name = "IMDB_ACCESS_ERROR";
      throw imdbErr;
    }
  }

  // Movie / show fetch
  const typeQuery = type === "movie" ? "movie" : "series";
  try {
    const resData = await axios.get(
      `https://www.omdbapi.com/?t=${encodeURIComponent(
        title
      )}&type=${typeQuery}&plot=full&apikey=${apiKey}`
    );
    if (resData.data.Response === "False") {
      return null;
    }
    if (
      !resData.data.Title ||
      resData.data.Title.trim().toLowerCase() !== title.trim().toLowerCase()
    ) {
      return null;
    }
    return resData.data;
  } catch (err) {
    logError(`Failed to access IMDb for ${type} "${title}": ${err.message}`, {
      stack: err.stack,
    });
    // Throw custom error for middleware
    const imdbErr = new Error("Unable to access IMDB");
    imdbErr.name = "IMDB_ACCESS_ERROR";
    throw imdbErr;
  }
}

// Route handler for /fetch-imdb
export async function fetchIMDB(req, res) {
  const { title, season, episode } = req.query;

  if (!title) {
    return apiResponse.badRequest(res, "Title is required");
  }

  try {
    const data = await fetchIMDBData({
      title,
      type: season && episode ? "episode" : "movie",
      season,
      episode,
    });

    if (!data) {
      return apiResponse.notFound(res, "Content not found on IMDb");
    }

    // Format response
    const result = formatIMDBData(data);

    return apiResponse.ok(res, result);
  } catch (err) {
    logError(`Error in IMDb fetch for "${title}": ${err.message}`, {
      stack: err.stack,
    });

    // Pass error to middleware for consistent error handling
    return req.app && req.app.emit
      ? req.app.emit("error", err, req, res)
      : apiResponse.serverError(res, "Failed to fetch IMDb data");
  }
}
