import { Router } from "express";
import { PlacesController } from "./places.controller";
import { PlacesService } from "./places.service";
import { PlacesRepository } from "./places.repository";

const router = Router();

// Composition root for Places Module
const placesRepository = new PlacesRepository();
const placesService = new PlacesService(placesRepository);
const placesController = new PlacesController(placesService);

router.post("/", placesController.create);
router.get("/", placesController.getAll);
router.delete("/:id", placesController.delete);
router.post("/bind", placesController.bindTask);
router.post("/trigger", placesController.triggerGeofence);

export default router;
