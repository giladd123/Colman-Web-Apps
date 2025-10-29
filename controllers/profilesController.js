import Profile from "../models/profile.js";
import getUserById from "./usersController.js";
const media = require("../config/media");
import {
  uploadBuffer,
  uploadFromMultipart,
  uploadFromBase64,
  getSignedUrlForGet,
} from "../config/media.js";

export const createProfileRequest = async (req, res) => {
  let { userId, name } = req.body();
  let avatar = req.file();

  if (!getUserById(userId)) {
    console.error(
      `A request tried to create a profile to a non existing user id ${userId}`
    );
    return;
  }
  let nameRegex = /^[A-Za-z0-9_- ]+$/;
  if (!nameRegex.test(name)) {
    console.error(
      `A request tried to create a profile with illegal name ${name}. Name doesn't adhere to ${nameRegex}`
    );
  }

  if (!avatar && (!req.body || !req.body.base64 || !req.body.name)) {
    return res.status(400).json({
      error:
        "No file uploaded. Provide multipart req.file or base64 body with name.",
    });
  }
  createProfile(userId, name, avatar);
};
export const createProfile = async (userId, name, avatar) => {
  const { key, url } = await media.uploadFromMultipart(avatar);
  const profile = Profile((name = name), (user = userId), (avatar = url));
  await profile.save();
};
