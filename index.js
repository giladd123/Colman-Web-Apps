const express = require("express");
const app = express();
const connectDB = require("./config/db");
require("dotenv").config();
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

app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));