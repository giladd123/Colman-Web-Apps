import User from "../models/user.js";

class UsersController {
  static async getUserById(req, res) {
    const userId = req.params.userId;
    let user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json(user);
  }

  static async loginUser(req, res) {
    const { email, password } = req.body;
    // Find user by email, then compare hashed password
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.status(200).json(user);
  }
  static async createUser(req, res) {
    const { email, password, username } = req.body;

    // Basic validation
    if (!username || typeof username !== "string") {
      return res.status(400).json({ error: "Username is required" });
    }
    const usernamePattern = /^[A-Za-z0-9_.]{3,30}$/;
    if (!usernamePattern.test(username)) {
      return res.status(400).json({ error: "Invalid username format" });
    }

    const existingEmail = await User.findOne({ email: email });
    if (existingEmail) {
      return res.status(400).json({ error: "User with this email already exists" });
    }

    const existingUsername = await User.findOne({ username: username });
    if (existingUsername) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    if (!emailPattern.test(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters long" });
    }

    const user = new User({ username: username, email: email, password: password });
    await user.save();
    return res.status(201).json(user);
  }

  static async deleteUser(req, res) {
    const userId = req.params.userId;
    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json({ message: "User deleted successfully" });
  }

  static async updateUser(req, res) {
    const userId = req.params.userId;
    const { email, password } = req.body;
    const user = await User.findByIdAndUpdate(userId, { email, password }, { new: true });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.status(200).json(user);
  }
}

export default UsersController;
