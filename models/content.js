import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: String,
    posterUrl: String,
    releaseYear: Number,
    director: String,
    actors: [String],
    genres: [String],
    imdbRating: {
      type: Number,
      min: 0,
      max: 10,
    },
    popularity: {
      type: Number,
      default: 0,
    },
  },
  {
    discriminatorKey: "type",
    timestamps: true,
  }
);

const Content = mongoose.model("Content", contentSchema);
export default Content;
