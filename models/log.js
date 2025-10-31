import mongoose from "mongoose";

const logSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    action: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["login", "error", "action"],
    },
    description: String,
  },
  { timestamps: true }
);

const Log = mongoose.model("Log", logSchema);
export default Log;
