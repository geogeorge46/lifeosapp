import { Router } from "express";
import { HabitsController } from "./habits.controller";
import { HabitsService } from "./habits.service";
import { HabitsRepository } from "./habits.repository";

const router = Router();

const habitsRepository = new HabitsRepository();
const habitsService = new HabitsService(habitsRepository);
const habitsController = new HabitsController(habitsService);

router.get("/", habitsController.getAll);
router.post("/", habitsController.create);
router.post("/:id/toggle", habitsController.toggle);
router.delete("/:id", habitsController.delete);

export default router;
