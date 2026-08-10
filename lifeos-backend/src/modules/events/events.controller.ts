import { Request, Response } from "express";
import { EventsService } from "./events.service";

export class EventsController {
  constructor(private eventsService: EventsService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { title, description, startDate, endDate, recurrenceRule, placeId, brainDumpId } = req.body;

      if (!title || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameters 'title', 'startDate', and 'endDate' are required",
          },
        });
        return;
      }

      const result = await this.eventsService.createEvent({
        userId,
        title,
        description,
        startDateStr: startDate,
        endDateStr: endDate,
        recurrenceRule,
        placeId,
        brainDumpId,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create event",
        },
      });
    }
  };

  getRange = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const startStr = req.query.start as string;
      const endStr = req.query.end as string;

      if (!startStr || !endStr) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Query parameters 'start' and 'end' must be provided in format YYYY-MM-DD",
          },
        });
        return;
      }

      const result = await this.eventsService.getEventsForRange(userId, startStr, endStr);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve events",
        },
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.eventsService.deleteEvent(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete event",
        },
      });
    }
  };
}
