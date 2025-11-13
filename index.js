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
import { redirectIfAuth, requireAuthRedirect, requireProfileRedirect } from "./middleware/auth.js";

const app = express();

app.use(express.json());

// Connect to MongoDB
connectDB();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

// Session middleware setup
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key-default-change-me-please',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 hours
  }
}));

// routes
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", redirectIfAuth, (req, res) => {
  res.render("login_page");
});

app.get("/profiles", requireAuthRedirect, (req, res) => {
  res.render("profiles_page");
});

app.get("/settings", requireAuthRedirect, (req, res) => {
  res.render("settings_page");
});

app.get("/feed", requireProfileRedirect, (req, res) => {
  res.render("feed");
});

app.get("/shows", requireProfileRedirect, (req, res) => {
  res.render("shows");
});

app.get("/movies", requireProfileRedirect, (req, res) => {
  res.render("movies");
});

app.get("/my-list", requireProfileRedirect, (req, res) => {
  res.render("my_list");
});


app.get("/admin/edit", requireProfileRedirect, (req, res) => {
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

app.listen(1212, () => console.log(`Server is running on port ${process.env.PORT}`));