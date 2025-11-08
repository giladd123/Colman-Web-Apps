// In Colman-Web-Apps/controllers/contentController.js

import Content from '../models/content.js';
import '../models/episode.js';
import '../models/show.js';
import '../models/movie.js';

// This is your NEW function to send JSON data
export const getContentDataById = async (req, res) => {
  try {
    const contentId = req.params.id;
    const selectedContent = await Content.findById(contentId);

    if (!selectedContent) {
      return res.status(404).json({ error: "Content not found" });
    }

    // (All your existing logic for populating Shows...)
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

    // (All your existing logic for finding similar content...)
    let similarContent = [];
    if (selectedContent.genres && selectedContent.genres.length > 0) {
      similarContent = await Content.find({
        _id: { $ne: selectedContent._id },
        genres: { $in: selectedContent.genres }
      }).limit(6);
    }

    // *** THIS IS THE KEY CHANGE ***
    // Instead of rendering, send the data as JSON
    res.json({
      content: selectedContent,
      similarContent: similarContent
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