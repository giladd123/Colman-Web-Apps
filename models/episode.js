import mongoose from "mongoose";
import Content from "./content.js";

const episodeSchema = new mongoose.Schema(
  {
    showId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Show",
      required: true,
      index: true, // This makes querying much faster
    },
    episodeTitle: {
      type: String,
      required: true,
    },
    seasonNumber : {
      type: Number,
      required: true,
    },
    episodeNumber: {
      type: Number,
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
