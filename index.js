import express from "express";
import { connectDB } from "./config/db.js";
import "dotenv/config";
import userRoutes from "./routes/userRoutes.js";
import profilesRoutes from "./routes/profilesRoutes.js";
import habitsRoutes from "./routes/habitsRoutes.js";
import errorHandler from "./middleware/errorHandler.js";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 8000;

// Connect to MongoDB
connectDB();

app.use(express.static("public"));
app.set("view engine", "ejs");

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

app.get("/settings", (req, res) => {
  res.render("settings_page");
});

app.use("/api/user", userRoutes);
app.use("/api/profiles", profilesRoutes);
app.use("/api/habits", habitsRoutes);

app.use(errorHandler);

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
