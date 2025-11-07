import express from "express";
import { connectDB } from "./config/db.js";
import "dotenv/config";
import userRoutes from "./routes/userRoutes.js";
import profilesRoutes from "./routes/profilesRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
<<<<<<< HEAD
import mainRoutes from './routes/mainRoutes.js';
=======
import feedRoutes from "./routes/feedRoutes.js";
>>>>>>> b2387c3c9aceae7178da1598b045101fcf479e53

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

app.use("/api/user", userRoutes);
app.use("/api/profiles", profilesRoutes);

app.use(errorHandler);

<<<<<<< HEAD
app.use("/select-content", mainRoutes);
=======
app.use("/feed", feedRoutes);

app.get("/feed", (req, res) => {
  res.render("feed");
});
>>>>>>> b2387c3c9aceae7178da1598b045101fcf479e53

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
