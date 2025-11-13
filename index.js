import express from "express";
import { connectDB } from "./config/db.js";
import "dotenv/config";
import userRoutes from "./routes/userRoutes.js";
import profilesRoutes from "./routes/profilesRoutes.js";
import habitsRoutes from "./routes/habitsRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import contentRoutes from './routes/contentRoutes.js';
import session from 'express-session';
import feedRoutes from "./routes/feedRoutes.js";
import selectContentRoutes from "./routes/selectContentRoutes.js";
import likesRoutes from "./routes/likesRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import genreRoutes from "./routes/genreRoutes.js";
import playerRoutes from "./routes/playerRoutes.js";

const app = express();

app.use(express.json());

// Connect to MongoDB
connectDB();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

/**
 * EXPLANATION: Express-session configuration
 * 
 * This replaces localStorage-based session management with server-side sessions.
 * Benefits:
 * - More secure: session data stored on server, not exposed to client
 * - Prevents tampering: users can't modify their userId or profileId
 * - Supports server-side session expiration
 * - Works across different tabs/windows
 * 
 * Configuration options:
 * - secret: Used to sign the session ID cookie (prevent tampering)
 * - resave: false = don't save session if unmodified (better performance)
 * - saveUninitialized: false = don't create session until something is stored
 * - cookie.secure: false for development (http), true for production (https)
 * - cookie.httpOnly: true = prevents JavaScript access (XSS protection)
 * - cookie.maxAge: Session expires after 24 hours of inactivity
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // true only in production with HTTPS
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// routes
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  // If already logged in, redirect to appropriate page
  if (req.session.userId) {
    if (req.session.selectedProfileId) {
      return res.redirect("/feed");
    }
    return res.redirect("/profiles");
  }
  res.render("login_page");
});

app.get("/profiles", (req, res) => {
  // Require authentication to access profiles page
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  res.render("profiles_page");
});

app.get("/settings", (req, res) => {
  // Require authentication and profile selection
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  if (!req.session.selectedProfileId) {
    return res.redirect("/profiles");
  }
  res.render("settings_page");
});

app.get("/feed", (req, res) => {
  // Require authentication and profile selection
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  if (!req.session.selectedProfileId) {
    return res.redirect("/profiles");
  }
  res.render("feed");
});

app.get("/shows", (req, res) => {
  // Require authentication and profile selection
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  if (!req.session.selectedProfileId) {
    return res.redirect("/profiles");
  }
  res.render("shows");
});

app.get("/movies", (req, res) => {
  // Require authentication and profile selection
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  if (!req.session.selectedProfileId) {
    return res.redirect("/profiles");
  }
  res.render("movies");
});

app.get("/my-list", (req, res) => {
  // Require authentication and profile selection
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  if (!req.session.selectedProfileId) {
    return res.redirect("/profiles");
  }
  res.render("my_list");
});

// Admin edit page (renders the edit_content view for UI/testing)
// Passing an empty content object and genres array so the template can render safely
app.get("/admin/edit", (req, res) => {
  // Require authentication and profile selection
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  if (!req.session.selectedProfileId) {
    return res.redirect("/profiles");
  }
  res.render("edit_content", { content: {}, genres: [] });
});

app.use("/api/user", userRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/habits", habitsRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/watchlist", watchlistRoutes);

app.use(errorHandler);

app.use("/admin", contentRoutes);
app.use("/feed", feedRoutes);
app.use("/genres", genreRoutes);
app.use("/select-content", selectContentRoutes);
app.use("/player", playerRoutes);

app.listen(process.env.PORT, () => console.log(`Server is running on port ${process.env.PORT}`));
