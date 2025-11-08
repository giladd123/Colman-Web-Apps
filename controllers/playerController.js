import Content from '../models/content.js';
import Habit from '../models/habit.js';
import Profile from '../models/profile.js';
import Show from '../models/show.js';
import Episode from '../models/episode.js'; // Import Episode
import { notFound, ok, serverError, badRequest } from '../utils/apiResponse.js';

// Serves the HTML shell
export async function getPlayerPage(req, res) {
  // We use video_player.ejs, but the controller in index.js
  // might be calling it player_page. Let's render the correct file.
  res.render('video_player'); // Use the file name you created
}

/**
 * Helper function to find the parent show and the next episode.
 * This is complex because Episodes don't link back to their Show.
 * We must find the Show by searching for the episodeId in its seasons.
 */
/**
 * Helper function to find the parent show and the next episode.
 * This now uses the 'showId' passed from the client.
 */
async function findShowAndNextEpisode(episode, showId) {
  try {
    const contentId = episode._id;

    // --- THIS IS THE NEW, FIXED LOGIC ---
    if (!showId) {
      console.warn(`Attempted to find show for episode ${contentId} but no showId was provided in query.`);
      return { showData: null, nextEpisodeId: null };
    }

    // 2. Find the show directly using the provided showId
    const show = await Show.findById(showId);
    if (!show) {
      console.error(`Show not found for ID ${showId}`);
      return { showData: null, nextEpisodeId: null };
    }
    // --- END OF NEW LOGIC ---

    // Populate all seasons for the drawer (this logic is the same)
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

    // Find the current episode's location (same as before)
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

    // Find the next episode ID (same as before)
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
    console.error("Error in findShowAndNextEpisode:", err);
    return { showData: null, nextEpisodeId: null };
  }
}


// GET /api/player/data/:contentId/:profileName
// Gets the video URL, watch time, AND show data
// GET /api/player/data/:contentId/:profileName
// Gets the video URL, watch time, AND show data
export async function getPlayerData(req, res) {
  try {
    const { contentId, profileName } = req.params;
    const { showId } = req.query; // <-- READ THE SHOW ID FROM THE URL

    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return notFound(res, 'Profile not found');

    const content = await Content.findById(contentId);
    if (!content) return notFound(res, 'Content not found');

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
      // Pass the showId to the helper function
      const showInfo = await findShowAndNextEpisode(content, showId); 
      showData = showInfo.showData;
      nextEpisodeId = showInfo.nextEpisodeId;
    }

    res.json({
      success: true,
      content: content,
      habit: habit,       
      showData: showData, 
      nextEpisodeId: nextEpisodeId, 
    });

  } catch (err) {
    serverError(res, err.message);
  }
}

// POST /api/player/progress
// Saves the user's watch progress
export async function savePlayerProgress(req, res) {
  try {
    const { profileName, contentId, currentTime, isComplete } = req.body;

    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return notFound(res, 'Profile not found');

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
  } catch (err) {
    serverError(res, err.message);
  }
}

// GET /api/player/next-episode/:showId/:profileName
// This is still used by the select-content page 'Play' button
export async function getNextEpisodeToPlay(req, res) {
  try {
    const { showId, profileName } = req.params;

    const profile = await Profile.findOne({ name: profileName });
    if (!profile) return notFound(res, 'Profile not found');

    const show = await Show.findById(showId);
    if (!show) return notFound(res, 'Content not found');
    
    // Find all habits for episodes of this show
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
      // If completed, we need to find the *next* episode
      const { nextEpisodeId } = await findShowAndNextEpisode(await Episode.findById(lastHabit.contentId), showId);
      if (nextEpisodeId) {
        return ok(res, { episodeId: nextEpisodeId });
      }
    }

    // Fallback: play S1, E1
    const firstSeasonKey = Array.from(show.seasons.keys()).sort((a,b) => Number(a) - Number(b))[0];
    const firstSeason = show.seasons.get(firstSeasonKey);
    
    if (!firstSeason || firstSeason.length === 0) {
       return notFound(res, 'Could not find any episodes for this show');
    }
    
    const s1e1 = firstSeason[0];
    return ok(res, { episodeId: s1e1._id || s1e1 });

  } catch (err) {
    serverError(res, err.message);
  }
}