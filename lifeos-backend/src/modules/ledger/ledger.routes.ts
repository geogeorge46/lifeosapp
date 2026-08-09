import { Router } from "express";
import { LedgerController } from "./ledger.controller";
import { LedgerService } from "./ledger.service";
import { LedgerRepository } from "./ledger.repository";

const router = Router();

const ledgerRepository = new LedgerRepository();
const ledgerService = new LedgerService(ledgerRepository);
const ledgerController = new LedgerController(ledgerService);

router.post("/", ledgerController.create);
router.get("/", ledgerController.getAll);
router.get("/summary", ledgerController.getSummary);
router.post("/split", ledgerController.split);
router.post("/:id/settle", ledgerController.settle);
router.get("/people/:personId", ledgerController.getPersonBalance);
router.delete("/:id", ledgerController.delete);

export default router;
