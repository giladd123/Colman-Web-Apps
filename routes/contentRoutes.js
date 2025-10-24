const express = require("express");
const router = express.Router();
const contentController = require("../controllers/contentController");

router.get("/add-content", contentController.showAddForm);
router.post("/add-content", contentController.createContent);

module.exports = router;
