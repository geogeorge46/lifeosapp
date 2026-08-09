import { Router } from "express";
import { PeopleController } from "./people.controller";
import { PeopleService } from "./people.service";
import { PeopleRepository } from "./people.repository";
import { RelationshipsController } from "./relationships.controller";
import { RelationshipsService } from "./relationships.service";
import { RelationshipsRepository } from "./relationships.repository";
import { OccasionsController } from "./occasions.controller";
import { OccasionsService } from "./occasions.service";
import { OccasionsRepository } from "./occasions.repository";

const router = Router();

const peopleRepository = new PeopleRepository();
const peopleService = new PeopleService(peopleRepository);
const peopleController = new PeopleController(peopleService);

const relationshipsRepository = new RelationshipsRepository();
const relationshipsService = new RelationshipsService(relationshipsRepository);
const relationshipsController = new RelationshipsController(relationshipsService);

const occasionsRepository = new OccasionsRepository();
const occasionsService = new OccasionsService(occasionsRepository);
const occasionsController = new OccasionsController(occasionsService);

router.post("/", peopleController.create);
router.get("/", peopleController.getAll);
router.delete("/:id", peopleController.delete);
router.post("/:id/places", peopleController.linkPlace);
router.delete("/:id/places/:placeId", peopleController.unlinkPlace);
router.post("/:id/tags", peopleController.addTag);
router.delete("/:id/tags/:tagId", peopleController.removeTag);

// Relationships Graph Endpoints
router.post("/relationships", relationshipsController.create);
router.get("/relationships", relationshipsController.getAll);
router.delete("/relationships/:id", relationshipsController.delete);
router.get("/:id/connections", relationshipsController.getConnections);

// Occasions Endpoints
router.post("/occasions", occasionsController.create);
router.get("/:personId/occasions", occasionsController.getForPerson);
router.delete("/occasions/:id", occasionsController.delete);

export default router;
