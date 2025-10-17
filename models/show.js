import mongoose from "mongoose";
import Content from "./content.js";

const showSchema = new mongoose.Schema(
  {
    seasons: {
      type: Map,
      of: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Episode",
        },
      ],
      default: {},
    },
  },
  { timestamps: true }
);

const Show = Content.discriminator("Show", showSchema);
export default Show;
