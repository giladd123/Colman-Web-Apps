// In Colman-Web-Apps/controllers/contentController.js

import Content from '../models/content.js';
import '../models/episode.js';
import '../models/show.js';
import '../models/movie.js';
import Profile from '../models/profile.js'; // <-- ADD THIS

// This is your NEW function to send JSON data
export const getContentDataById = async (req, res) => {
  try {
    const contentId = req.params.id;
    const { profileName } = req.query; // <-- Get profileName from query

    const selectedContent = await Content.findById(contentId);

    if (!selectedContent) {
      return res.status(404).json({ error: "Content not found" });
    }

    // (Existing show population logic)
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

    // (Existing similar content logic)
    let similarContent = [];
    if (selectedContent.genres && selectedContent.genres.length > 0) {
      similarContent = await Content.find({
        _id: { $ne: selectedContent._id },
        genres: { $in: selectedContent.genres }
      }).limit(6);
    }

    // --- NEW LOGIC: Check profile's status ---
    let profile = null;
    let isLiked = false;
    let isInWatchlist = false;

    if (profileName) {
      profile = await Profile.findOne({ name: profileName });
    }

    if (profile) {
      isLiked = profile.likedContents?.some(id => id.equals(contentId)) || false;
      isInWatchlist = profile.watchlist?.some(id => id.equals(contentId)) || false;
    }
    // --- END NEW LOGIC ---

    res.json({
      content: selectedContent,
      similarContent: similarContent,
      isLiked: isLiked,           // <-- Send this to client
      isInWatchlist: isInWatchlist  // <-- Send this to client
    });

  } catch (err) {
    console.error("Error fetching single content data:", err);
    res.status(500).json({ error: "Error loading content data" });
  }
};

// This is your OLD function, which we will modify in the next step
export const getContentById = async (req, res) => {
  try {
    // We no longer fetch data here. We just render the page.
    // The client-side JS will fetch the data after loading.
    res.render("select_content", {
      // Pass null or empty objects so the EJS file doesn't crash
      // before you convert it in the next step.
      content: null,
      similarContent: []
    });
  } catch (err){
    console.error("Error rendering select_content shell:", err);
    res.status(500).send("Error loading page");
  }
};