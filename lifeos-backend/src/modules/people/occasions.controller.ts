import { Request, Response } from "express";
import { OccasionsService } from "./occasions.service";

export class OccasionsController {
  constructor(private service: OccasionsService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { personId, title, date, type, offsets } = req.body;

      if (!personId || !title || !date || !type) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "personId, title, date, and type are required fields.",
          },
        });
        return;
      }

      const result = await this.service.create(userId, {
        personId,
        title,
        date,
        type,
        offsets: offsets || [0],
      });

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to establish occasion record.",
        },
      });
    }
  };

  getForPerson = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { personId } = req.params;

      const result = await this.service.getForContact(userId, personId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch occasions lists.",
        },
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      await this.service.delete(userId, id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete occasion record.",
        },
      });
    }
  };
}
