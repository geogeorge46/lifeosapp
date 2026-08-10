import { Request, Response } from "express";
import { HabitsService } from "./habits.service";

export class HabitsController {
  constructor(private habitsService: HabitsService) {}

  getAll = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const result = await this.habitsService.getHabits(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve habits list",
        },
      });
    }
  };

  create = async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { title } = req.body;
      if (!title) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "title is a required field",
          },
        });
        return;
      }
      const result = await this.habitsService.addHabit(userId, title);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create habit record",
        },
      });
    }
  };

  toggle = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { date } = req.body;
      const result = await this.habitsService.toggleHabitCompletion(id, date);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to toggle habit completion status",
        },
      });
    }
  };

  delete = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await this.habitsService.removeHabit(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete habit record",
        },
      });
    }
  };
}
