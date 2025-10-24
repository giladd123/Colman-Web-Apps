import mongoose from "mongoose";
import Content from "./content.js";

const movieSchema = new mongoose.Schema({
  videoUrl: {
    type: String,
    required: true,
  },
  lengthMinutes: {
    type: Number,
    required: true,
  },
});

const Movie = Content.discriminator("Movie", movieSchema);
export default Movie;
