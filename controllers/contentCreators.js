import Movie from "../models/movie.js";
import Show from "../models/show.js";
import Episode from "../models/episode.js";
import { error as logError } from "../utils/logger.js";

// Create Movie
export async function createMovie(data) {
  try {
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
  } catch (err) {
    logError(`Failed to create movie "${data.title}": ${err.message}`, {
      stack: err.stack,
    });
    throw err;
  }
}

// Create Show
export async function createShow(data) {
  try {
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
  } catch (err) {
    logError(`Failed to create show "${data.title}": ${err.message}`, {
      stack: err.stack,
    });
    throw err;
  }
}

// Create Episode and link to parent show
export async function createEpisode(data) {
  try {
    // Case-insensitive show lookup
    const show = await Show.findOne({
      title: new RegExp(`^${data.title}$`, "i"),
    });
    if (!show) {
      const error = new Error(`Show "${data.title}" not found.`);
      throw error;
    }

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
  } catch (err) {
    logError(`Failed to create episode for "${data.title}": ${err.message}`, {
      stack: err.stack,
    });
    throw err;
  }
}
