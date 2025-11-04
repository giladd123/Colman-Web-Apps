import User from "../models/user.js";
import { badRequest, serverError } from "../utils/apiResponse.js";
import { warn, info } from "../utils/logger.js";

const usernamePattern = /^[A-Za-z0-9_.]{3,30}$/;
const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function validateCreateUser(req, res, next) {
  try {
    const { username, email, password } = req.body || {};

    if (!username || typeof username !== "string") {
      warn("validateCreateUser - missing username", { body: req.body });
      return badRequest(res, "Username is required");
    }
    if (!usernamePattern.test(username)) {
      warn("validateCreateUser - invalid username format", { username });
      return badRequest(res, "Invalid username format");
    }

    if (!email || typeof email !== "string" || !emailPattern.test(email)) {
      warn("validateCreateUser - invalid email format", { email });
      return badRequest(res, "Invalid email format");
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      warn("validateCreateUser - short password", { username, email });
      return badRequest(res, "Password must be at least 6 characters long");
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      warn("validateCreateUser - email exists", { email });
      return badRequest(res, "User with this email already exists");
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      warn("validateCreateUser - username taken", { username });
      return badRequest(res, "Username already taken");
    }

    // attach validated payload for controller
    req.validatedBody = { username, email, password };
    info("validateCreateUser passed", { username, email });
    return next();
  } catch (err) {
    warn(`validateCreateUser error: ${err.message}`);
    return serverError(res);
  }
}

export function validateLoginUser(req, res, next) {
  const { email, password } = req.body || {};
  if (!email || !password) {
    warn("validateLoginUser - missing credentials", { body: req.body });
    return badRequest(res, "Email and password are required");
  }
  // basic email shape check
  if (typeof email !== "string" || !emailPattern.test(email)) {
    warn("validateLoginUser - invalid email format", { email });
    return badRequest(res, "Invalid email format");
  }
  req.validatedBody = { email, password };
  info("validateLoginUser passed", { email });
  return next();
}

export default { validateCreateUser, validateLoginUser };
