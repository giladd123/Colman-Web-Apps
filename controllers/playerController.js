import Content from '../models/content.js';
import Habit from '../models/habit.js';
import Profile from '../models/profile.js';
import Show from '../models/show.js';
import Episode from '../models/episode.js'; 
import { notFound, ok, serverError, badRequest } from '../utils/apiResponse.js';
import { error as logError, warn, info } from '../utils/logger.js';

// GET /player
// this function serves the HTML shell of the video player page
export async function getPlayerPage(req, res) {
  res.render('video_player'); 
}

// this function (internal helper func) determines the episodes to play
async function findShowAndNextEpisode(episode, showId) {
  try {
    const contentId = episode._id;
    if (!showId) {
      warn(`Attempted to find show for episode ${contentId} but no showId was provided in query.`);
      return { showData: null, nextEpisodeId: null };
    }

    const show = await Show.findById(showId);
    if (!show) {
      logError(`Show not found for ID ${showId}`);
      return { showData: null, nextEpisodeId: null };
    }

    // get all seasons and their episodes for the drawer menu
    const seasonKeys = Array.from(show.seasons.keys());
    if (seasonKeys.length > 0) {
      const populatePaths = seasonKeys.map(key => ({
        path: `seasons.${key}`,
        model: 'Episode'
      }));
      await show.populate(populatePaths);
    }

    let nextEpisodeId = null;
    let currentSeasonKey = null;
    let currentEpisodeIndex = -1;

    // find the current episode's location
    const sortedSeasonKeys = seasonKeys.sort((a, b) => Number(a) - Number(b));
    for (const key of sortedSeasonKeys) {
      const episodes = show.seasons.get(key) || [];
      const index = episodes.findIndex(ep => String(ep._id) === String(contentId));
      if (index > -1) {
        currentSeasonKey = key;
        currentEpisodeIndex = index;
        break;
      }
    }

    // find the next episode ID
    if (currentSeasonKey) {
      const currentSeasonEpisodes = show.seasons.get(currentSeasonKey);
      if (currentEpisodeIndex + 1 < currentSeasonEpisodes.length) {
        nextEpisodeId = currentSeasonEpisodes[currentEpisodeIndex + 1]._id;
      } else {
        const nextSeasonKey = String(Number(currentSeasonKey) + 1);
        const nextSeasonEpisodes = show.seasons.get(nextSeasonKey);
        if (nextSeasonEpisodes && nextSeasonEpisodes.length > 0) {
          nextEpisodeId = nextSeasonEpisodes[0]._id;
        }
      }
    }

    return { showData: show, nextEpisodeId };

  } catch (err) {
    logError(`Error in findShowAndNextEpisode: ${err.message}`, { stack: err.stack });
    return { showData: null, nextEpisodeId: null };
  }
}

// GET /api/player/data/:contentId/:profileName
// this function gets the video URL, watch time and show data
export async function getPlayerData(req, res) {
  const { contentId, profileId } = req.params; 
  const { showId } = req.query; 

  const profile = await Profile.findById(profileId); 
  if (!profile){
    return notFound(res, 'Profile not found');
  }

  const content = await Content.findById(contentId);
  if (!content) {
    return notFound(res, 'Content not found');
  } 

  const habit = await Habit.findOne({
    profileId: profile._id,
    contentId: content._id,
  });

  if (!content.videoUrl) {
    return notFound(res, 'No video URL found for this content');
  }

  let showData = null;
  let nextEpisodeId = null;

  // If it's an episode, find its show and next episode
  if (content.type === 'Episode') {
    const showInfo = await findShowAndNextEpisode(content, showId); 
    showData = showInfo.showData;
    nextEpisodeId = showInfo.nextEpisodeId;
  }

  ok(res, {
    success: true,
    content: content,
    habit: habit,       
    showData: showData, 
    nextEpisodeId: nextEpisodeId, 
  });
}

// POST /api/player/progress
// this function saves the user's watch progress
export async function savePlayerProgress(req, res) {

  const { profileId, contentId, currentTime, isComplete } = req.body;

  const profile = await Profile.findById(profileId); 
  if (!profile) {
    return notFound(res, 'Profile not found');
  }

  if (!contentId || currentTime == null) {
    return badRequest(res, 'contentId and currentTime are required');
  }

  const habitData = {
    profileId: profile._id,
    contentId: contentId,
    watchedTimeInSeconds: currentTime,
    completed: isComplete || false,
    lastWatchedAt: Date.now(),
  };

  await Habit.findOneAndUpdate(
    { profileId: profile._id, contentId: contentId },
    { $set: habitData },
    { upsert: true, new: true }
  );

  ok(res, { success: true, message: 'Progress saved' });
}

// GET /api/player/next-episode/:showId/:profileName
// this function gets the next to resume the last episode watched by the profile
export async function getNextEpisodeToPlay(req, res) {
  const { showId, profileId } = req.params;
  
  const profile = await Profile.findById(profileId);
  if (!profile) {
    return notFound(res, 'Profile not found');
  }

  const show = await Show.findById(showId);
  if (!show) {
      return notFound(res, 'Content not found');
  }

  // find all habits for episodes of this show and sort by lastWatchedAt
  const allEpisodeIds = Array.from(show.seasons.values()).flat();
  const habits = await Habit.find({
    profileId: profile._id,
    contentId: { $in: allEpisodeIds }
  }).sort({ lastWatchedAt: -1 });

  if (habits.length > 0) {
    const lastHabit = habits[0];
    if (!lastHabit.completed) {
      return ok(res, { episodeId: lastHabit.contentId });
    }
    // if completed, find the next episode
    const { nextEpisodeId } = await findShowAndNextEpisode(await Episode.findById(lastHabit.contentId), showId);
    if (nextEpisodeId) {
      return ok(res, { episodeId: nextEpisodeId });
    }
  }

  // if no habits found or all completed, return episode 1 of season 1
  const firstSeasonKey = Array.from(show.seasons.keys()).sort((a,b) => Number(a) - Number(b))[0];
  const firstSeason = show.seasons.get(firstSeasonKey);
  
  if (!firstSeason || firstSeason.length === 0) {
      return notFound(res, 'Could not find any episodes for this show');
  }
  
  const s1e1 = firstSeason[0];
  return ok(res, { episodeId: s1e1._id || s1e1 });
}