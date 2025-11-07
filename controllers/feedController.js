// controllers/feedController.js
import Content from "../models/content.js";
import Profile from "../models/profile.js";
import watchingHabit from "../models/habit.js";

export async function testContent(req, res) {
  try {
    const contents = await Content.aggregate([{ $sample: { size: 5 } }]);

    res.status(200).json(contents);
  } catch (err) {
    console.error("Error fetching test content:", err);
    res.status(500).json({ error: "Failed to fetch test content" });
  }
}

export async function testContent2(req, res) {
  try {
    const contents = await Content.aggregate([{ $sample: { size: 22 } }]);

    res.status(200).json(contents);
  } catch (err) {
    console.error("Error fetching test content:", err);
    res.status(500).json({ error: "Failed to fetch test content" });
  }
}

// Fetch all content (movies, shows, etc.) VV
export const getAllContent = async (req, res, next) => {
  try {
    const contents = await Content.find().sort({ popularity: -1 }).lean();
    res.status(200).json(contents);
  } catch (err) {
    next(err); // pass to centralized error handler
  }
};

// GET /api/content/:id - Fetch a specific content item by ID
// export const getContentById = async (req, res, next) => {
//   try {
//     const content = await Content.findById(req.params.id).lean();
//     if (!content) {
//       return res.status(404).json({ message: "Content not found" });
//     }
//     res.status(200).json(content);
//   } catch (err) {
//     next(err);
//   }
// };

//General For All Profiles
//Fetch content by genre
export async function getContentByGenre(req, res, next) {
  try {
    const { genre } = req.params;
    const content = await Content.find({ genres: genre })
      .sort({ releaseYear: -1 })
      .lean();
    res.status(200).json(content);
  } catch (err) {
    next(err);
  }
}

//-------------------------------------------------------------------

//Per Profile
async function continueWatchingForProfile(profileId) {
  const habits = await watchingHabit.find({
    profileId,
    completed: false,
    watchedTimeInSeconds: { $gt: 0 },
  })
    .sort({ updatedAt: -1 })
    .limit(10)
    .populate("contentId")
    .lean();

  return habits.map(h => h.contentId);
}

async function completedWatchingByProfile(profileId) {
  const habits = await watchingHabit.find({ profileId, completed: true })
    .sort({ updatedAt: -1 })
    .populate("contentId")
    .lean();

  return habits.map(h => h.contentId);
}

async function likedByProfile(profileId) {
  const habits = await watchingHabit.find({ profileId, liked: true })
    .populate("contentId")
    .lean();

  return habits.map(h => h.contentId);
}

async function recommendationsForProfile(profileId) {
  const liked = await likedByProfile(profileId);
  if (!liked.length) {
    // Fallback: top popular content
    return await Content.find().sort({ popularity: -1 }).limit(10).lean();
  }

  // Collect genres from liked content
  const likedGenres = liked.flatMap(item => item.genres || []);
  const topGenres = [...new Set(likedGenres)];

  // Find more content in similar genres (excluding already liked)
  return await Content.find({
    genres: { $in: topGenres },
    _id: { $nin: liked.map(c => c._id) },
  })
    .sort({ popularity: -1 })
    .limit(10)
    .lean();
}

// -------------------------------------------------------------------

// For generating feed
export async function getFeedForProfile(req, res) {
  try {
    const profileName = req.params.profileName;
    const profile = await Profile.findOne({ name: profileName });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    const profileId = profile._id;

    // Continue Watching
    const continueWatching = await continueWatchingForProfile(profileId);

    // Recommendations
    const recommendations = await recommendationsForProfile(profileId);

    // Most Popular
    const mostPopular = await Content.find()
      .sort({ popularity: -1 })
      .limit(10)
      .lean();

    // Newest by Genre
    const contents = await Content.find().sort({ releaseYear: -1 }).lean();
    const newestByGenre = {};
    for (const movie of contents) {
      for (const genre of movie.genres || []) {
        if (!newestByGenre[genre]) newestByGenre[genre] = [];
        if (newestByGenre[genre].length < 10) {
          newestByGenre[genre].push(movie);
        }
      }
    }

    res.json({
      continueWatching,
      recommendations,
      mostPopular,
      newestByGenre,
    });
    // console.log(continueWatching, newestByGenre) //,  mostPopular recommendations, newestByGenre
  } catch (err) {
    console.error("Error building feed:", err);
    res.status(500).json({ error: "Failed to build feed" });
  }
}
