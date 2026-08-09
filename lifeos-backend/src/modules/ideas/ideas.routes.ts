import { Router } from "express";
import { IdeasController } from "./ideas.controller";
import { IdeasService } from "./ideas.service";
import { IdeasRepository } from "./ideas.repository";

const router = Router();

const ideasRepository = new IdeasRepository();
const ideasService = new IdeasService(ideasRepository);
const ideasController = new IdeasController(ideasService);

router.post("/", ideasController.create);
router.get("/", ideasController.getAll);
router.get("/:id", ideasController.getById);
router.put("/:id", ideasController.update);
router.delete("/:id", ideasController.delete);

export default router;
