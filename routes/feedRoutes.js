// routes/feedRoutes.js
import express from "express";
// import { getAllContent, testContent, getContentByGenre,getFeedForProfile } from "../controllers/feedController.js";
import { getAllContent, getContentByGenre, getFeedForProfile, testContent, testContent2} from "../controllers/feedController.js";

const router = express.Router();

router.get("/testContent", testContent);
router.get("/testContent2", testContent2);

router.get("/allContent", getAllContent);

router.get("/:profileName", getFeedForProfile);
router.get("/genre/:genre", getContentByGenre);

export default router;