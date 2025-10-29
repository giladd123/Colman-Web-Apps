import User from "../models/user.js";

export const getUserById = async (userId) => {
  try {
    let user = await User.findById((id = userId));
    return user;
  } catch (err) {
    return null;
  }
};
