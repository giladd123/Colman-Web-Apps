import mongoose from "mongoose";

const watchingHabitSchema = new mongoose.Schema(
  {
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
      required: true,
    },
    contentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Content",
      required: true,
    },
    liked: {
      type: Boolean,
      default: false,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    lastWatchedAt: {
      type: Date,
      default: Date.now,
    },
    watchedTimeInSeconds: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const Habit = mongoose.model("Habit", watchingHabitSchema);
export default Habit;
