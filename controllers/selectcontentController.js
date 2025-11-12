import Content from '../models/content.js';
import Profile from '../models/profile.js';
import Habit from '../models/habit.js';
import '../models/episode.js';
import '../models/show.js';
import '../models/movie.js';
import { ok, notFound, serverError } from '../utils/apiResponse.js';
import { error as logError, warn } from '../utils/logger.js';

// GET /select-content/data/:id
// This function retrieves detailed content data and the users watch status
export const getContentDataById = async (req, res) => {
  const contentId = req.params.id;
  const { profileId } = req.query;
  const selectedContent = await Content.findById(contentId);

  if (!selectedContent) {
    warn(`Content with ID ${contentId} not found for user ${profileName || 'unknown'}`);
    return notFound(res, "Content not found");
  }
  
  if (!selectedContent.type) {
    logError(`Data integrity error: Content ${contentId} is missing the 'type' field.`, { content: selectedContent });
    return serverError(res, "Error loading content: Data is malformed.");
  }

  // if content is a Show get its seasons and their episodes
  if (selectedContent.type === 'Show' && selectedContent.seasons) {
    const seasonKeys = Array.from(selectedContent.seasons.keys());
    if (seasonKeys.length > 0) {
      const populatePaths = seasonKeys.map(key => ({
        path: `seasons.${key}`,
        model: 'Episode'
      }));
      await selectedContent.populate(populatePaths);
    }
  }

  // Find content with the same genres
  let similarContent = [];
  if (selectedContent.genres && selectedContent.genres.length > 0) {
    similarContent = await Content.find({
      _id: { $ne: selectedContent._id },
      genres: { $in: selectedContent.genres }
    }).limit(6);
  }

  // check like, watchlist and habit status for the profile
  let profile = null;
  let isLiked = false;
  let isInWatchlist = false;
  let isCompleted = false;
  const watchHabitsMap = {}; // store user's watched time { episodeId: seconds }

  if (profileId) {
    profile = await Profile.findById(profileId); // Find by ID
  }

  if (profile) {
    const profileId = profile._id;
    isLiked = profile.likedContents?.some(id => id.equals(contentId)) || false;
    isInWatchlist = profile.watchlist?.some(id => id.equals(contentId)) || false;

    // if the content is a Movie get its habit
    // if the content is a Show get habits for all its episodes
    if (selectedContent.type === 'Movie') {
      const habit = await Habit.findOne({ contentId, profileId });
      isCompleted = habit?.completed || false;
      if (habit) {
        watchHabitsMap[contentId] = habit.watchedTimeInSeconds;
      }
    } 
    else if (selectedContent.type === 'Show') {
      const allEpisodeIds = Array.from(selectedContent.seasons.values()).flat().map(ep => ep._id || ep);
      const habits = await Habit.find({ profileId, contentId: { $in: allEpisodeIds } });
      
      habits.forEach(h => {
        watchHabitsMap[h.contentId] = h.watchedTimeInSeconds;
      });

      const seasonKeys = Array.from(selectedContent.seasons.keys());
      const lastSeasonKey = seasonKeys.sort((a, b) => Number(a) - Number(b)).pop();
      const lastSeason = selectedContent.seasons.get(lastSeasonKey);
      
      if (lastSeason && lastSeason.length > 0) {
        const lastEpisode = lastSeason[lastSeason.length - 1];
        const lastEpisodeId = lastEpisode._id || lastEpisode;
        const lastEpisodeHabit = habits.find(h => h.contentId.equals(lastEpisodeId));
        isCompleted = lastEpisodeHabit?.completed || false;
      }
    }
  }

  ok(res , {
    content: selectedContent,
    similarContent: similarContent,
    isLiked: isLiked,
    isInWatchlist: isInWatchlist,
    isCompleted: isCompleted,
    watchHabits: watchHabitsMap
  });
};

// GET /select-content/:id
// This function serves the HTML shell for content selection
export const getContentById = async (req, res) => {
  res.render("select_content", {
    content: null,
    similarContent: []
  });
};
