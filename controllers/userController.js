import User from "../models/user.js";
import { info, error as logError } from "../utils/logger.js";
import {
  ok,
  created,
  notFound,
  serverError,
  errorResponse,
} from "../utils/apiResponse.js";

async function getUserById(req, res) {
  const userId = req.params.userId;
  try {
    let user = await User.findById(userId);
    if (!user) {
      return notFound(res, "User not found");
    }
    return ok(res, user);
  } catch (error) {
    logError(`Error retrieving user ${userId}: ${error.message}`, {
      stack: error.stack,
    });
    return serverError(res);
  }
}

async function loginUser(req, res) {
  const { email, password } = req.validatedBody || req.body;
  try {
    // Find user by email, then compare hashed password
    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 401, "Invalid email or password");
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 401, "Invalid email or password");
    }

    info(`user login successful: ${user._id}`, { email });
    return ok(res, user);
  } catch (error) {
    logError(`Error during login for ${email}: ${error.message}`, {
      stack: error.stack,
    });
    return serverError(res);
  }
}

async function createUser(req, res) {
  const { username, email, password } = req.validatedBody || req.body;
  try {
    const user = new User({ username, email, password });
    await user.save();
    info(`user created: ${user._id}`, { username, email });
    return created(res, user);
  } catch (error) {
    logError(`Error creating user ${email}: ${error.message}`, {
      stack: error.stack,
    });
    return serverError(res);
  }
}

async function deleteUser(req, res) {
  const userId = req.params.userId;
  try {
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return notFound(res, "User not found");
    }
    return ok(res, { message: "User deleted successfully" });
  } catch (error) {
    logError(`Error deleting user ${userId}: ${error.message}`, {
      stack: error.stack,
    });
    return serverError(res);
  }
}

async function updateUser(req, res) {
  const userId = req.params.userId;
  const { email, password } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      userId,
      { email, password },
      { new: true }
    );
    if (!user) {
      return notFound(res, "User not found");
    }
    return ok(res, user);
  } catch (error) {
    logError(`Error updating user ${userId}: ${error.message}`, {
      stack: error.stack,
    });
    return serverError(res);
  }
}

export default {
  getUserById,
  loginUser,
  createUser,
  deleteUser,
  updateUser,
};
