import { Router } from "express";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";
import { TasksRepository } from "./tasks.repository";

const router = Router();

const tasksRepository = new TasksRepository();
const tasksService = new TasksService(tasksRepository);
const tasksController = new TasksController(tasksService);

router.post("/", tasksController.create);
router.get("/today", tasksController.getToday);
router.get("/calendar", tasksController.getCalendar);
router.patch("/occurrences/:id/status", tasksController.updateStatus);
router.post("/occurrences/:id/reschedule", tasksController.reschedule);
router.get("/weekly-report", tasksController.getWeeklyReport);
router.get("/:taskId/history", tasksController.getHistory);
router.delete("/occurrences/:id", tasksController.delete);
router.delete("/:id", tasksController.deleteTask);

export default router;
