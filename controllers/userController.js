import User from "../models/user.js";

class UsersController {
  static async getUserById(req, res) {
    try {
      const userId = req.params.userId;
      let user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Don't send password hash to client
      const userResponse = user.toObject();
      delete userResponse.password;
      return res.status(200).json(userResponse);
    } catch (error) {
      console.error(`Error fetching user: ${error.message}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async loginUser(req, res) {
    try {
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

      // Don't send password hash to client
      const userResponse = user.toObject();
      delete userResponse.password;
      return res.status(200).json(userResponse);
    } catch (error) {
      console.error(`Error during login: ${error.message}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
  static async createUser(req, res) {
    try {
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
      
      // Don't send password hash to client
      const userResponse = user.toObject();
      delete userResponse.password;
      return res.status(201).json(userResponse);
    } catch (error) {
      console.error(`Error creating user: ${error.message}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async deleteUser(req, res) {
    try {
      const userId = req.params.userId;
      const user = await User.findByIdAndDelete(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error(`Error deleting user: ${error.message}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  }

  static async updateUser(req, res) {
    try {
      const userId = req.params.userId;
      const { email, password } = req.body;
      
      // Validate email if provided
      if (email) {
        const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
        if (!emailPattern.test(email)) {
          return res.status(400).json({ error: "Invalid email format" });
        }
      }
      
      // Validate password if provided
      if (password && password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters long" });
      }
      
      // Find user first to trigger pre-save hook for password hashing
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      
      if (email) user.email = email;
      if (password) user.password = password;
      
      await user.save();
      
      // Don't send password hash to client
      const userResponse = user.toObject();
      delete userResponse.password;
      return res.status(200).json(userResponse);
    } catch (error) {
      console.error(`Error updating user: ${error.message}`);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
}

export default UsersController;
