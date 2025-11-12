import mongoose from "mongoose";
import { info as logInfo } from "../utils/logger.js";

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
      default: null,
    },
    popularity: {
      type: Number,
      default: 0,
    },
    type: { 
    type: String, 
    required: true, 
    enum: ['Show', 'Movie', 'Episode'] 
  }
  },
  {
    discriminatorKey: "type",
    timestamps: true,
  }
);

contentSchema.pre("save", function (next) {
  this.$locals = this.$locals || {};
  this.$locals.wasNew = this.isNew;
  next();
});

contentSchema.post("save", function (doc) {
  const modelName = doc.constructor?.modelName || "Content";
  if (doc.$locals && doc.$locals.wasNew) {
    logInfo(
      `content created: ${doc._id}`,
      {
        contentId: doc._id,
        title: doc.title,
        type: doc.type || modelName,
      },
      true
    );
  } else {
    logInfo(
      `content updated: ${doc._id}`,
      {
        contentId: doc._id,
        title: doc.title,
        type: doc.type || modelName,
      },
      true
    );
  }
});

// Add indexes for duplicate checking performance
contentSchema.index({ title: 1, releaseYear: 1, type: 1 }); // For movies/shows
contentSchema.index({ title: 1, seasonNumber: 1, episodeNumber: 1, type: 1 }); // For episodes
contentSchema.index({ title: "text" }); // For text search capabilities

const Content = mongoose.model("Content", contentSchema);
export default Content;
