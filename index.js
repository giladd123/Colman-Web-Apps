import express from "express";
import { connectDB } from "./config/db.js";
import "dotenv/config";
import userRoutes from "./routes/userRoutes.js";
import profilesRoutes from "./routes/profilesRoutes.js";
import habitsRoutes from "./routes/habitsRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import feedRoutes from "./routes/feedRoutes.js";
import contentRoutes from "./routes/contentRoutes.js";
import likesRoutes from "./routes/likesRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import genreRoutes from "./routes/genreRoutes.js";

const PORT = process.env.PORT || 8000;
const app = express();

app.use(express.json());

// Connect to MongoDB
connectDB();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));

// routes
app.get("/", (req, res) => {
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  res.render("login_page");
});

app.get("/profiles", (req, res) => {
  res.render("profiles_page");
});

app.get("/settings", (req, res) => {
  res.render("settings_page");
});
app.get("/feed", (req, res) => {
  res.render("feed");
});

app.get("/shows", (req, res) => {
  res.render("shows");
});

app.get("/movies", (req, res) => {
  res.render("movies");
});

app.get("/my-list", (req, res) => {
  res.render("my_list");
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

app.use(errorHandler);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
