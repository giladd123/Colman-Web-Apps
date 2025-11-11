import express from "express";
import { connectDB } from "./config/db.js";
import "dotenv/config";
import userRoutes from "./routes/userRoutes.js";
import profilesRoutes from "./routes/profilesRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import contentRoutes from './routes/contentRoutes.js';
import session from 'express-session';
import feedRoutes from "./routes/feedRoutes.js";
import likesRoutes from "./routes/likesRoutes.js";
import watchlistRoutes from "./routes/watchlistRoutes.js";
import playerRoutes from "./routes/playerRoutes.js"; // <-- ADD THIS



const app = express();
app.set("view engine", "ejs");
app.set('views', 'views');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.use(session({
  secret: process.env.SESSION_SECRET || 'a-very-strong-secret-key-you-should-change',
  resave: false,
  saveUninitialized: false, // Don't create sessions for unauthenticated users
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    httpOnly: true, // Prevents client-side JS from accessing the cookie
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
connectDB();

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

app.get("/main", (req, res) => {
  res.render("main_menu");
});

app.use("/api/user", userRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/watchlist", watchlistRoutes);


app.use(errorHandler);

app.use("/feed", feedRoutes);

app.get("/feed", (req, res) => {
  res.render("feed");
});

app.use("/select-content", contentRoutes);
app.use("/player", playerRoutes);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
