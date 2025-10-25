import Content from "../models/content.js";

export const showAddForm = async (req, res) => {
  try {
    // Get all distinct genres from the DB
    const existingGenres = await Content.distinct("genres");

    res.render("add_content", { genres: existingGenres.sort() });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading form");
  }
};

export const createContent = async (req, res) => {
  try {
    const {
      title,
      type,
      description,
      year,
      genres = [],
      customGenres = [],
      director,
      actors,
      imageUrl,
      videoUrls,
    } = req.body;

    // Combine built-in + custom genres into one clean array
    const allGenres = [
      ...(Array.isArray(genres) ? genres : [genres]),
      ...(Array.isArray(customGenres) ? customGenres : [customGenres]),
    ]
      .map((g) => g.trim())
      .filter((g) => g !== "");

    const newContent = new Content({
      title,
      type,
      description,
      year,
      genres: allGenres,
      director,
      actors: actors ? actors.split(",").map((a) => a.trim()) : [],
      imageUrl,
      videoUrls: videoUrls ? videoUrls.split(",").map((v) => v.trim()) : [],
      popularity: 0,
      rating: null, // will be pulled automatically
    });

    await newContent.save();
    res.render("upload_success");
  } catch (err) {
    console.error(err);
    res.render("upload_fail");
  }
};
