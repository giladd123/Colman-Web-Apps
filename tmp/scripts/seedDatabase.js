import "dotenv/config";
import mongoose from "mongoose";
import path from "node:path";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import ffmpeg from "fluent-ffmpeg";

import { connectDB } from "../../config/db.js";
import media from "../../config/media.js";
import Content from "../../models/content.js";
import Movie from "../../models/movie.js";
import Show from "../../models/show.js";
import Episode from "../../models/episode.js";
import User from "../../models/user.js";
import Profile from "../../models/profile.js";
import Habit from "../../models/habit.js";
import Log from "../../models/log.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");

const MOVIE_TARGET = 61;
const SHOW_TARGET = 46;
const MIN_SHOW_SEASONS = 1;
const MAX_SHOW_SEASONS = 5;
const MIN_EPISODES_PER_SEASON = 4;
const MAX_EPISODES_PER_SEASON = 10;

const AVATAR_OPTIONS = [
  "/images/profiles/green.png",
  "/images/profiles/pink.png",
  "/images/profiles/purple.png",
  "/images/profiles/white.png",
  "/images/profiles/yellow.png",
];

const USER_CONFIG = [
  { username: "user1", email: "user1@example.com" },
  { username: "user2", email: "user2@example.com" },
  { username: "user3", email: "user3@example.com" },
];

function parseRuntime(runtime) {
  if (!runtime) return 90;
  const match = String(runtime).match(/(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 90;
}

function parseYear(value) {
  if (!value) return undefined;
  const match = String(value).match(/\d{4}/);
  return match ? Number.parseInt(match[0], 10) : undefined;
}

function parseToNumber(value) {
  if (!value || value === "N/A") return undefined;
  const num = Number.parseFloat(String(value));
  return Number.isNaN(num) ? undefined : num;
}

function parseList(value) {
  if (!value || value === "N/A") return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function computePopularity(item) {
  const votes = item.imdbVotes
    ? Number.parseInt(String(item.imdbVotes).replace(/[^\d]/g, ""), 10)
    : 0;
  if (!votes) return Math.floor(Math.random() * 250) + 50;
  // Compress the votes to a manageable popularity score
  return Math.max(50, Math.min(5000, Math.floor(votes / 500)));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDateWithinPast(days) {
  const now = Date.now();
  const offset = randomInt(0, days * 24 * 60 * 60 * 1000);
  return new Date(now - offset);
}

function pickRandomElements(source, min, max, exclude = new Set()) {
  const available = source.filter((item) => !exclude.has(String(item)));
  const count = Math.min(available.length, randomInt(min, max));
  const picked = new Set();
  while (picked.size < count && available.length) {
    const index = randomInt(0, available.length - 1);
    picked.add(available.splice(index, 1)[0]);
  }
  return Array.from(picked);
}

async function loadMoviesJson() {
  const filePath = path.join(ROOT_DIR, "movies.json");
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

function getVideoDurationInMinutes(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        reject(err);
        return;
      }
      const durationSeconds = metadata.format.duration;
      const durationMinutes = Math.ceil(durationSeconds / 60);
      resolve(durationMinutes);
    });
  });
}

async function ensureMediaAssets() {
  const videosDir = path.join(ROOT_DIR, "zvideos");
  let entries;
  try {
    entries = await fs.readdir(videosDir, { withFileTypes: true });
  } catch (err) {
    throw new Error(
      `Failed to read videos directory at ${videosDir}: ${err.message}`
    );
  }

  const videoFiles = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.toLowerCase().endsWith(".mp4"));

  if (!videoFiles.length) {
    throw new Error(
      `No .mp4 files found in ${videosDir}. Please add at least one video.`
    );
  }

  const uploadedAssets = [];

  for (const filename of videoFiles) {
    const sourcePath = path.join(videosDir, filename);

    // Get video duration before uploading
    let durationMinutes;
    try {
      durationMinutes = await getVideoDurationInMinutes(sourcePath);
    } catch (err) {
      console.warn(
        `Could not read duration for ${filename}, defaulting to 90 minutes:`,
        err.message
      );
      durationMinutes = 90;
    }

    const fileBuffer = await fs.readFile(sourcePath);
    const sanitizedName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const uniqueId = randomUUID();
    const key = `seed-assets/${uniqueId}-${sanitizedName}`;

    try {
      const uploadedKey = await media.uploadBuffer(
        fileBuffer,
        key,
        "video/mp4"
      );
      const url = media.getObjectUrl(uploadedKey);
      uploadedAssets.push({
        filename,
        url,
        key: uploadedKey,
        durationMinutes,
      });
      console.log(
        `Uploaded video asset ${filename} (${durationMinutes} min) to S3 key ${uploadedKey}`
      );
    } catch (err) {
      console.error(`Failed to upload ${filename} to S3`, err);
      throw err;
    }
  }

  return uploadedAssets;
}

async function clearDatabase() {
  await Promise.all([
    Content.deleteMany({}),
    User.deleteMany({}),
    Profile.deleteMany({}),
    Habit.deleteMany({}),
    Log.deleteMany({}),
  ]);
}

function buildContentBase(item) {
  const releaseYear = parseYear(item.Year);
  return {
    title: item.Title,
    description: item.Plot && item.Plot !== "N/A" ? item.Plot : undefined,
    posterUrl: item.Poster && item.Poster !== "N/A" ? item.Poster : undefined,
    releaseYear,
    director:
      item.Director && item.Director !== "N/A" ? item.Director : undefined,
    actors: parseList(item.Actors),
    genres: parseList(item.Genre),
    imdbRating: parseToNumber(item.imdbRating),
    popularity: computePopularity(item),
  };
}

async function createMovies(entries, selectVideo) {
  const created = [];
  for (const item of entries) {
    const base = buildContentBase(item);
    const video = selectVideo();
    const movie = await Movie.create({
      ...base,
      videoUrl: video.url,
      lengthMinutes: video.durationMinutes,
    });
    created.push(movie);
  }
  return created;
}

async function createShows(entries, selectVideo) {
  const created = [];
  for (const item of entries) {
    const base = buildContentBase(item);
    const show = new Show(base);
    await show.save();

    const declaredSeasons = Number.parseInt(
      String(item.totalSeasons || ""),
      10
    );
    const maxSeasons = Number.isNaN(declaredSeasons)
      ? MAX_SHOW_SEASONS
      : Math.max(MIN_SHOW_SEASONS, Math.min(MAX_SHOW_SEASONS, declaredSeasons));
    const seasonCount = randomInt(MIN_SHOW_SEASONS, maxSeasons);

    for (let seasonNumber = 1; seasonNumber <= seasonCount; seasonNumber += 1) {
      const episodesInSeason = randomInt(
        MIN_EPISODES_PER_SEASON,
        MAX_EPISODES_PER_SEASON
      );
      const episodeIds = [];
      for (
        let episodeNumber = 1;
        episodeNumber <= episodesInSeason;
        episodeNumber += 1
      ) {
        const episodeTitle = `${show.title} S${String(seasonNumber).padStart(
          2,
          "0"
        )}E${String(episodeNumber).padStart(2, "0")}`;
        const epVideo = selectVideo();
        const episode = await Episode.create({
          ...base,
          title: episodeTitle,
          episodeTitle,
          seasonNumber,
          episodeNumber,
          releaseYear: base.releaseYear
            ? base.releaseYear + seasonNumber - 1
            : undefined,
          lengthMinutes: epVideo.durationMinutes,
          videoUrl: epVideo.url,
        });
        episodeIds.push(episode._id);
      }
      show.seasons.set(String(seasonNumber), episodeIds);
    }

    await show.save();
    created.push(show);
  }
  return created;
}

async function seedUsersProfilesAndHabits(contents) {
  const contentIds = contents.map((doc) => doc._id);
  const habitsMap = new Map();
  const popularityBumps = new Map();

  function queueHabit(profileId, contentId, updates) {
    const key = `${profileId.toString()}::${contentId.toString()}`;
    const existing = habitsMap.get(key) || {};
    const merged = {
      ...existing,
      ...updates,
      watchedTimeInSeconds: Math.max(
        existing.watchedTimeInSeconds || 0,
        updates.watchedTimeInSeconds || 0
      ),
      lastWatchedAt:
        updates.lastWatchedAt || existing.lastWatchedAt || new Date(),
    };
    habitsMap.set(key, merged);
  }

  function bumpPopularity(contentId, amount = 1) {
    const key = contentId.toString();
    popularityBumps.set(key, (popularityBumps.get(key) || 0) + amount);
  }

  for (const { username, email } of USER_CONFIG) {
    const user = new User({ username, email, password: "password" });
    await user.save();

    const profileCount = randomInt(3, 5);
    const userProfileIds = [];

    for (let i = 0; i < profileCount; i += 1) {
      const profileName = `profile_${i + 1}`;
      const avatar =
        AVATAR_OPTIONS[
          (i + randomInt(0, AVATAR_OPTIONS.length - 1)) % AVATAR_OPTIONS.length
        ];

      const profile = new Profile({
        user: user._id,
        name: profileName,
        avatar,
      });
      await profile.save();

      const liked = pickRandomElements(contentIds, 3, 5);
      const watchlistExclude = new Set(liked.map(String));
      const watchlist = pickRandomElements(contentIds, 4, 6, watchlistExclude);

      const continueWatching = pickRandomElements(contentIds, 2, 3);
      const completed = pickRandomElements(contentIds, 2, 3);

      profile.likedContents = liked;
      profile.watchlist = watchlist;
      await profile.save();

      liked.forEach((contentId) => {
        queueHabit(profile._id, contentId, {
          liked: true,
          watchedTimeInSeconds: randomInt(900, 5400),
          completed: Math.random() < 0.4,
          lastWatchedAt: randomDateWithinPast(45),
        });
        bumpPopularity(contentId, 1);
      });

      continueWatching.forEach((contentId) => {
        queueHabit(profile._id, contentId, {
          liked: liked.some((id) => String(id) === String(contentId)),
          watchedTimeInSeconds: randomInt(600, 3600),
          completed: false,
          lastWatchedAt: randomDateWithinPast(15),
        });
      });

      completed.forEach((contentId) => {
        queueHabit(profile._id, contentId, {
          watchedTimeInSeconds: randomInt(3600, 9600),
          completed: true,
          liked:
            liked.some((id) => String(id) === String(contentId)) ||
            Math.random() < 0.5,
          lastWatchedAt: randomDateWithinPast(90),
        });
      });

      userProfileIds.push(profile._id);
    }

    user.profiles = userProfileIds;
    await user.save();
  }

  const habitWrites = [];
  for (const [key, data] of habitsMap.entries()) {
    const [profileId, contentId] = key.split("::");
    habitWrites.push(
      Habit.findOneAndUpdate(
        { profileId, contentId },
        {
          $set: {
            ...data,
            lastWatchedAt: data.lastWatchedAt,
          },
        },
        { upsert: true, new: true }
      )
    );
  }
  await Promise.all(habitWrites);

  if (popularityBumps.size) {
    const bulkOps = Array.from(popularityBumps.entries()).map(
      ([contentId, inc]) => ({
        updateOne: {
          filter: { _id: contentId },
          update: { $inc: { popularity: inc } },
        },
      })
    );
    await Content.bulkWrite(bulkOps);
  }
}

async function main() {
  console.log("Connecting to database...");
  await connectDB();

  console.log("Uploading media assets to S3...");
  const videoAssets = await ensureMediaAssets();

  if (!videoAssets.length) {
    throw new Error(
      "No video assets were uploaded. Cannot proceed with seeding."
    );
  }

  // Helper to pick a random video asset (with URL and duration) from uploaded assets
  const getRandomVideo = () => {
    const index = randomInt(0, videoAssets.length - 1);
    return videoAssets[index];
  };

  console.log("Loading source dataset...");
  const entries = await loadMoviesJson();
  const movies = entries.filter((item) => item.Type?.toLowerCase() === "movie");
  const series = entries.filter(
    (item) => item.Type?.toLowerCase() === "series"
  );

  if (movies.length < MOVIE_TARGET) {
    throw new Error(`movies.json does not contain ${MOVIE_TARGET} movies`);
  }
  if (series.length < SHOW_TARGET) {
    throw new Error(
      `movies.json does not contain ${SHOW_TARGET} series entries`
    );
  }

  const moviesSubset = movies.slice(0, MOVIE_TARGET);
  const showsSubset = series.slice(0, SHOW_TARGET);

  console.log("Clearing existing database documents...");
  await clearDatabase();

  console.log(`Creating ${moviesSubset.length} movies...`);
  await createMovies(moviesSubset, getRandomVideo);

  console.log(`Creating ${showsSubset.length} shows with episodes...`);
  await createShows(showsSubset, getRandomVideo);

  const contents = await Content.find({ type: { $ne: "Episode" } });

  console.log("Creating users, profiles, and viewing habits...");
  await seedUsersProfilesAndHabits(contents);

  console.log("Seed data generation complete.\nSummary: ");
  console.log(`  Movies created: ${moviesSubset.length}`);
  console.log(`  Shows created: ${showsSubset.length}`);
  console.log(`  Users created: ${USER_CONFIG.length}`);

  await mongoose.disconnect();
  console.log("Disconnected from database.");
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("Seeding failed:", err);
    mongoose.disconnect().finally(() => process.exit(1));
  });
