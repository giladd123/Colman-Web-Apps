import express from "express";
const router = express.Router();
import userController from "../controllers/userController.js";
import catchAsync from "../controllers/utils.js";
import {
  validateCreateUser,
  validateLoginUser,
} from "../middleware/validateUser.js";

router.get("/:userId", catchAsync(userController.getUserById));
router.post("/login", validateLoginUser, catchAsync(userController.loginUser));
router.post(
  "/create",
  validateCreateUser,
  catchAsync(userController.createUser)
);

router.delete("/:userId", catchAsync(userController.deleteUser));

router.put("/:userId", catchAsync(userController.updateUser));

export default router;
