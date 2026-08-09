import { Router } from "express";
import { RecapController } from "./recap.controller";
import { RecapService } from "./recap.service";
import { RecapRepository } from "./recap.repository";

const router = Router();

const recapRepository = new RecapRepository();
const recapService = new RecapService(recapRepository);
const recapController = new RecapController(recapService);

router.get("/today", recapController.getToday);
router.post("/trigger", recapController.triggerGeneration);

export default router;
