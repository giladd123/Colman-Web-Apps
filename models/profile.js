import mongoose from "mongoose";

const profileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    avatar: String,
    likedContents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Content",
        default: [],
      },
    ],
    watchlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Content",
        default: [],
      },
    ],
  },
  { timestamps: true }
);

const Profile = mongoose.model("Profile", profileSchema);
export default Profile;
