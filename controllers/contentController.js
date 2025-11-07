import Content from '../models/content.js';
import '../models/episode.js';
import '../models/show.js';    
import '../models/movie.js';   

export const getContentById = async (req, res) => {
  try {
    const contentId = req.params.id;
    const selectedContent = await Content.findById(contentId);

    if (!selectedContent) {
      return res.status(404).send("Content not found");
    }

    if (selectedContent.type === 'Show' && selectedContent.seasons) {
            
      const seasonKeys = Array.from(selectedContent.seasons.keys()); 
      
      if (seasonKeys.length > 0) {
        const populatePaths = seasonKeys.map(key => ({
          path: `seasons.${key}`,
          model: 'Episode'
        }));

        await selectedContent.populate(populatePaths);
      }
    } else {
      console.log("Not a 'Show' or no seasons found");
    }

    let similarContent = [];
    if (selectedContent.genres && selectedContent.genres.length > 0) {

      similarContent = await Content.find({
        _id: { $ne: selectedContent._id }, 
        genres: { $in: selectedContent.genres } 
      }).limit(6); 
    }
    
    res.render("select_content", { 
      content: selectedContent,
      similarContent: similarContent
    });

  } catch (err) {
    console.error("Error fetching single content:", err);
    res.status(500).send("Error loading content");
  }
};