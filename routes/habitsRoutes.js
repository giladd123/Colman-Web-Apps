import { Router } from "express";
import HabitsController from "../controllers/habitsController.js";
import catchAsync from "../controllers/utils.js";
import {
  validateCreateHabit,
  validateUpdateHabit,
} from "../middleware/validateHabit.js";

const router = Router();

router.get(
  "/user/:userId/summary",
  catchAsync(HabitsController.getUserSummary)
);

router.get("/user/:userId", catchAsync(HabitsController.getHabitsByUser));

router.get(
  "/profile/:profileId",
  catchAsync(HabitsController.getHabitsByProfile)
);

router.post("/", validateCreateHabit, catchAsync(HabitsController.createHabit));

router.put(
  "/:habitId",
  validateUpdateHabit,
  catchAsync(HabitsController.updateHabit)
);

router.delete("/:habitId", catchAsync(HabitsController.deleteHabit));

export default router;
