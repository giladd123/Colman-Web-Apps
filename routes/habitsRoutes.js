import { Router } from "express";
import HabitsController from "../controllers/habitsController.js";
import catchAsync from "../controllers/utils.js";
import {
  validateCreateHabit,
  validateUpdateHabit,
} from "../middleware/validateHabit.js";
import { requireProfile, requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.get(
  "/user/:userId/summary",
  requireAuth,
  catchAsync(HabitsController.getUserSummary)
);

router.get("/user/:userId", requireAuth, catchAsync(HabitsController.getHabitsByUser));

router.get(
  "/profile/:profileId",
  requireProfile,
  catchAsync(HabitsController.getHabitsByProfile)
);

router.post("/", requireProfile, validateCreateHabit, catchAsync(HabitsController.createHabit));

router.put(
  "/:habitId",
  requireProfile,
  validateUpdateHabit,
  catchAsync(HabitsController.updateHabit)
);

router.delete("/:habitId", requireProfile, catchAsync(HabitsController.deleteHabit));

export default router;
