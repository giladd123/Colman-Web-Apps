const express = require("express");
const app = express();

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

app.get("/selectContent", (req, res) => {
  res.render("select_content");
});

const PORT = 8000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));