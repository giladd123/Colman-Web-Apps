import mongoose from "mongoose";
import Habit from "../models/habit.js";
import Profile from "../models/profile.js";
import { info, warn, error as logError } from "../utils/logger.js";
import { ok, created, notFound, serverError } from "../utils/apiResponse.js";

function toObjectId(value) {
  return typeof value === "string" ? new mongoose.Types.ObjectId(value) : value;
}

async function createHabit(req, res) {
  const payload = req.validatedHabit || {};
  try {
    let habit = await Habit.findOne({
      profileId: payload.profileId,
      contentId: payload.contentId,
    });

    if (habit) {
      Object.assign(habit, payload);
      await habit.save();
      info("habit updated via create", { habitId: habit._id });
      return ok(res, habit);
    }

    habit = new Habit(payload);
    await habit.save();
    info("habit created", { habitId: habit._id, profileId: payload.profileId });
    return created(res, habit);
  } catch (error) {
    logError(`Error creating habit: ${error.message}`, { stack: error.stack });
    return serverError(res);
  }
}

async function updateHabit(req, res) {
  const habitId = req.params.habitId;
  const updates = req.validatedHabit || {};
  try {
    const habit = await Habit.findById(habitId);
    if (!habit) {
      warn("updateHabit - habit not found", { habitId });
      return notFound(res, `Habit with id ${habitId} not found`);
    }

    Object.assign(habit, updates);
    await habit.save();
    info("habit updated", { habitId });
    return ok(res, habit);
  } catch (error) {
    logError(`Error updating habit ${habitId}: ${error.message}`, {
      stack: error.stack,
    });
    return serverError(res);
  }
}

async function deleteHabit(req, res) {
  const habitId = req.params.habitId;
  try {
    const habit = await Habit.findByIdAndDelete(habitId);
    if (!habit) {
      warn("deleteHabit - habit not found", { habitId });
      return notFound(res, `Habit with id ${habitId} not found`);
    }
    info("habit deleted", { habitId });
    return ok(res, { message: "Habit deleted successfully" });
  } catch (error) {
    logError(`Error deleting habit ${habitId}: ${error.message}`, {
      stack: error.stack,
    });
    return serverError(res);
  }
}

async function getHabitsByProfile(req, res) {
  const profileId = req.session.selectedProfileId;
  try {
    const habits = await Habit.find({ profileId })
      .sort({ lastWatchedAt: -1 })
      .populate("contentId");
    return ok(res, habits);
  } catch (error) {
    logError(
      `Error retrieving habits for profile ${profileId}: ${error.message}`,
      {
        stack: error.stack,
      }
    );
    return serverError(res);
  }
}

async function getHabitsByUser(req, res) {
  const userId = req.params.userId;
  try {
    const profiles = await Profile.find({ user: userId }).select(
      "_id name avatar"
    );
    const profileIds = profiles.map((profile) => profile._id);
    if (!profileIds.length) {
      return ok(res, []);
    }
    const habits = await Habit.find({ profileId: { $in: profileIds } })
      .sort({ lastWatchedAt: -1 })
      .populate("contentId profileId");
    return ok(res, habits);
  } catch (error) {
    logError(`Error retrieving habits for user ${userId}: ${error.message}`, {
      stack: error.stack,
    });
    return serverError(res);
  }
}

async function getUserSummary(req, res) {
  const userId = req.params.userId;
  try {
    const profiles = await Profile.find({ user: userId }).select(
      "_id name avatar"
    );
    if (!profiles.length) {
      return ok(res, {
        profiles: [],
        genrePopularity: [],
        dailyWatches: [],
      });
    }

    const profileIds = profiles.map((profile) => profile._id);
    const profileMap = new Map(
      profiles.map((profile) => [profile._id.toString(), profile])
    );

    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 6);

    const dailyAggregation = await Habit.aggregate([
      {
        $match: {
          profileId: { $in: profileIds.map(toObjectId) },
          lastWatchedAt: { $gte: startDate },
        },
      },
      {
        $project: {
          profileId: 1,
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$lastWatchedAt" },
          },
        },
      },
      {
        $group: {
          _id: { profileId: "$profileId", day: "$day" },
          total: { $sum: 1 },
        },
      },
      { $sort: { "_id.day": 1 } },
    ]);

    const dailyWatches = dailyAggregation.map((entry) => {
      const profileId = entry._id.profileId.toString();
      const profile = profileMap.get(profileId);
      return {
        date: entry._id.day,
        profileId,
        profileName: profile?.name || "Unknown",
        avatar: profile?.avatar || null,
        total: entry.total,
      };
    });

    const genreAggregation = await Habit.aggregate([
      {
        $match: {
          profileId: { $in: profileIds.map(toObjectId) },
        },
      },
      {
        $lookup: {
          from: "contents",
          localField: "contentId",
          foreignField: "_id",
          as: "content",
        },
      },
      { $unwind: "$content" },
      { $unwind: "$content.genres" },
      {
        $group: {
          _id: "$content.genres",
          total: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);

    const genrePopularity = genreAggregation.map((entry) => ({
      genre: entry._id,
      total: entry.total,
    }));

    return ok(res, {
      profiles: profiles.map((profile) => ({
        id: profile._id,
        name: profile.name,
        avatar: profile.avatar || null,
      })),
      genrePopularity,
      dailyWatches,
    });
  } catch (error) {
    logError(
      `Error building habits summary for user ${userId}: ${error.message}`,
      {
        stack: error.stack,
      }
    );
    return serverError(res);
  }
}

export default {
  createHabit,
  updateHabit,
  deleteHabit,
  getHabitsByProfile,
  getHabitsByUser,
  getUserSummary,
};
