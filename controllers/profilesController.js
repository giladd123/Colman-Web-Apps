import Profile from "../models/profile.js";
import User from "../models/user.js";
import media from "../config/media.js";
import crypto from "crypto";

class ProfilesController {
  // Create a profile from multipart upload or base64 body
  static async createProfileRequest(req, res) {
    // Support multipart form or JSON: userId may be in req.body or in params
    const body = req.body || {};
    const userId = body.userId || req.params.userId;
    const name = body.name;
    let avatar = req.file;

    const userExists = await User.findById(userId);
    if (!userExists) {
      console.error(
        `A request tried to create a profile to a non existing user id ${userId}`
      );
      return res.status(404).json({ error: `User with id ${userId} not found` });
    }

    const allProfiles = await Profile.find({ user: userId });
    if (allProfiles.length >= 5) {
      return res
        .status(400)
        .json({ error: "Cannot create more than 5 profiles per user" });
    }
    // put hyphen at the end of the class to avoid range interpretation
    let nameRegex = /^[A-Za-z0-9 _-]+$/;
    if (!nameRegex.test(name)) {
      console.error(
        `A request tried to create a profile with illegal name ${name}. Name doesn't adhere to ${nameRegex}`
      );
      return res.status(400).json({ error: "Invalid profile name format" });
    }

    if (!avatar && (!body || !body.base64 || !body.name)) {
      return res.status(400).json({
        error:
          "No file uploaded. Provide multipart req.file or base64 body with name.",
      });
    }
    let url = null;
    if (avatar) {
      const generatedKey = crypto.randomUUID();
      const { key, url: uploadedUrl } = await media.uploadFromMultipart(avatar, generatedKey);
      url = media.getObjectUrl(key) || uploadedUrl;
    }
    const profile = Profile({ name: name, user: userId, avatar: url });
    await profile.save();
    return res.status(201).json(profile);
  }

  static async getProfilesByUserId(req, res) {
    const userId = req.params.userId;
    try {
      const profiles = await Profile.find({ user: userId });
      return res.status(200).json(profiles);
    } catch (error) {
      console.error(
        `Error retrieving profiles for user id ${userId}: ${error.message}`
      );
      return res.status(500).json({ error: `Internal Server Error` });
    }
  }

  static async deleteProfile(req, res) {
    // Route uses :profileId
    const profileId = req.params.profileId;
    try {
      const profile = await Profile.findByIdAndDelete(profileId);
      if (!profile) {
        return res.status(404).json({ error: `Profile with id ${profileId} not found` });
      }
      return res.status(200).json({ message: `Profile with id ${profileId} deleted successfully` });
    } catch (error) {
      console.error(
        `Error deleting profile with id ${profileId}: ${error.message}`
      );
      return res.status(500).json({ error: `Error deleting profile with id ${profileId}` });
    }
  }

  static async updateProfile(req, res) {
    const profileId = req.params.profileId;
    const name = (req.body && req.body.name) || undefined;
    const avatar = req.file;

    try {
      let updateFields = {};
      if (name !== undefined) updateFields.name = name;
      if (avatar) {
        const generatedKey = crypto.randomUUID();
        const { key, url: uploadedUrl } = await media.uploadFromMultipart(avatar, generatedKey);
        updateFields.avatar = media.getObjectUrl(key) || uploadedUrl;
      }
      const profile = await Profile.findByIdAndUpdate(
        profileId,
        updateFields,
        { new: true, runValidators: true }
      );
      if (!profile) {
        return res.status(404).json({ error: `Profile with id ${profileId} not found` });
      }
      return res.status(200).json(profile);
    } catch (error) {
      console.error(
        `Error updating profile id ${profileId}: ${error.message}`
      );
      return res.status(500).json({ error: `Error updating profile with id ${profileId}` });
    }
  }
}

export default ProfilesController;

