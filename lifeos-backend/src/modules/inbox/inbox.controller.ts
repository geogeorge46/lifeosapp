import { Request, Response } from "express";
import { InboxService } from "./inbox.service";
import { CreateInboxItemDto } from "./dto/create-inbox-item.dto";

export class InboxController {
  constructor(private inboxService: InboxService) {}

  capture = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { type, collectionId } = req.body;

      // 1. Process as voice recording upload
      if (req.file) {
        const file = req.file;
        const result = await this.inboxService.captureAudio(
          userId,
          file.buffer,
          file.originalname,
          file.mimetype,
          type,
          collectionId
        );
        res.status(201).json({ success: true, data: result });
        return;
      }

      // 2. Process as standard text capture
      const validation = CreateInboxItemDto.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request parameters failed validation checks",
            details: validation.error.errors,
          },
        });
        return;
      }

      const { contentType, content } = validation.data;

      if (contentType === "TEXT") {
        if (!content) {
          res.status(400).json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Content payload required for text captures",
            },
          });
          return;
        }

        const result = await this.inboxService.captureText(userId, content, type, collectionId);
        res.status(201).json({ success: true, data: result });
        return;
      }

      res.status(400).json({
        success: false,
        error: {
          code: "BAD_REQUEST",
          message: "Unable to process AUDIO content type without file attachments",
        },
      });
    } catch (error: any) {
      console.error("[InboxController] Capture exception:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Unexpected failure during capture operations",
        },
      });
    }
  };

  getInbox = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { collectionId, type } = req.query;

      const items = await this.inboxService.getUserInbox(
        userId,
        collectionId ? (collectionId as string) : undefined,
        type ? (type as string) : undefined
      );
      res.status(200).json({ success: true, data: items });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve user capture records",
        },
      });
    }
  };

  process = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.inboxService.processInboxItem(id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to mark item as processed",
        },
      });
    }
  };

  archive = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.inboxService.archiveInboxItem(id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to archive item",
        },
      });
    }
  };

  unarchive = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.inboxService.unarchiveInboxItem(id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to unarchive item",
        },
      });
    }
  };

  updateType = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { type } = req.body;
      const result = await this.inboxService.updateType(id, type);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update entry classification",
        },
      });
    }
  };

  updateContent = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const result = await this.inboxService.updateContent(id, content);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to edit content",
        },
      });
    }
  };

  moveToCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { collectionId } = req.body;
      const result = await this.inboxService.moveToCollection(id, collectionId || null);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to move capture to collection",
        },
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.inboxService.deleteInboxItem(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete item",
        },
      });
    }
  };

  // --- Collections controllers ---
  createCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { name } = req.body;
      if (!name) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "Collection name required" },
        });
        return;
      }
      const result = await this.inboxService.createCollection(userId, name);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to create collection" },
      });
    }
  };

  getCollections = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const result = await this.inboxService.getCollections(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to retrieve collections" },
      });
    }
  };

  deleteCollection = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.inboxService.deleteCollection(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to delete collection" },
      });
    }
  };
}
