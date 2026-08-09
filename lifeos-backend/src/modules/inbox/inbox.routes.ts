import { Router } from "express";
import multer from "multer";
import { InboxController } from "./inbox.controller";
import { InboxService } from "./inbox.service";
import { InboxRepository } from "./inbox.repository";
import { LocalStorageService } from "../../infrastructure/storage/local-storage.service";
import { MockTranscriptionService } from "./transcription/mock-transcription.service";

const router = Router();

// Setup multer memory storage (stores file temporarily as Buffer in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB file size limit for voice capture clips
  },
});

// Dependency Injection Composition for the Module
const inboxRepository = new InboxRepository();
const localStorageService = new LocalStorageService();
const mockTranscriptionService = new MockTranscriptionService();

const inboxService = new InboxService(
  inboxRepository,
  localStorageService,
  mockTranscriptionService
);
const inboxController = new InboxController(inboxService);

// Bind Endpoint Handlers
router.post("/", upload.single("audio"), inboxController.capture);
router.get("/", inboxController.getInbox);
router.patch("/:id/process", inboxController.process);
router.patch("/:id/archive", inboxController.archive);
router.patch("/:id/unarchive", inboxController.unarchive);
router.delete("/:id", inboxController.delete);

// Collections
router.get("/collections", inboxController.getCollections);
router.post("/collections", inboxController.createCollection);
router.delete("/collections/:id", inboxController.deleteCollection);

// Movement & Classification Edits
router.put("/:id/move", inboxController.moveToCollection);
router.put("/:id/type", inboxController.updateType);
router.put("/:id/content", inboxController.updateContent);

export default router;
