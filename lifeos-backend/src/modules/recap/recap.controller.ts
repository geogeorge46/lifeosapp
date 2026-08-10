import { Request, Response } from "express";
import { RecapService } from "./recap.service";

export class RecapController {
  constructor(private recapService: RecapService) {}

  getToday = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const result = await this.recapService.getTodayRecap(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve today's recap summary",
        },
      });
    }
  };

  triggerGeneration = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const result = await this.recapService.generateDailyRecap(userId);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to compile fresh daily recap",
        },
      });
    }
  };
}
