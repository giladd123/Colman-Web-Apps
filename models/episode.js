import mongoose from "mongoose";
import Content from "./content.js";

const episodeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    releaseDate: Date,
    lengthMinutes: Number,
    posterUrl: String,
    videoUrl: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Episode = Content.discriminator("Episode", episodeSchema);
export default Episode;
