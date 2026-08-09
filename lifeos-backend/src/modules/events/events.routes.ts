import { Router } from "express";
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";
import { EventsRepository } from "./events.repository";

const router = Router();

const eventsRepository = new EventsRepository();
const eventsService = new EventsService(eventsRepository);
const eventsController = new EventsController(eventsService);

router.post("/", eventsController.create);
router.get("/", eventsController.getRange);
router.delete("/:id", eventsController.delete);

export default router;
