import { Request, Response } from "express";
import { TasksService } from "./tasks.service";
import { UpdateTaskStatusDto } from "./dto/create-task.dto";
import { TaskStatus } from "@prisma/client";
import { WeeklyReportQueryDto } from "./dto/weekly-report.dto";

export class TasksController {
  constructor(private tasksService: TasksService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const { rawInput, inboxItemId, brainDumpId, notes } = req.body;
      const targetDumpId = brainDumpId || inboxItemId;

      if (targetDumpId) {
        const result = await this.tasksService.createTaskFromInboxItem(userId, targetDumpId, notes);
        res.status(201).json({ success: true, data: result });
        return;
      }

      if (!rawInput) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Either 'rawInput' or 'inboxItemId' must be provided to create a task",
          },
        });
        return;
      }

      const result = await this.tasksService.createTaskFromFuzzy(userId, rawInput, notes);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      console.error("[TasksController] Create exception:", error);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create task",
        },
      });
    }
  };

  getToday = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const dateStr = (req.query.date as string) || new Date().toISOString().split("T")[0];
      
      const result = await this.tasksService.getTodayTasks(userId, dateStr);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve today's tasks list",
        },
      });
    }
  };

  getCalendar = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
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

      const result = await this.tasksService.getOccurrencesByDateRange(userId, startStr, endStr);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve calendar occurrences",
        },
      });
    }
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params; // occurrence ID
      const validation = UpdateTaskStatusDto.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid status parameters provided",
            details: validation.error.errors,
          },
        });
        return;
      }

      const result = await this.tasksService.updateOccurrenceStatus(id, validation.data.status as TaskStatus);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update task status",
        },
      });
    }
  };

  reschedule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params; // occurrence ID
      const { date, reason } = req.body;

      if (!date) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Parameter 'date' (YYYY-MM-DD) is required to reschedule",
          },
        });
        return;
      }

      const result = await this.tasksService.rescheduleOccurrence(id, date, reason);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to reschedule task occurrence",
        },
      });
    }
  };

  getHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { taskId } = req.params;
      const result = await this.tasksService.getTaskHistory(taskId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve task rescheduling history",
        },
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params; // occurrence ID
      await this.tasksService.deleteOccurrence(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete task occurrence",
        },
      });
    }
  };

  deleteTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params; // Task ID
      await this.tasksService.deleteTask(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete task",
        },
      });
    }
  };

  getWeeklyReport = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      
      const validation = WeeklyReportQueryDto.safeParse(req.query);
      if (!validation.success) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Query parameters 'start' and 'end' must be formatted as YYYY-MM-DD",
            details: validation.error.errors,
          },
        });
        return;
      }

      const { start, end } = validation.data;
      const result = await this.tasksService.getWeeklyReport(userId, start, end);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to compile weekly report",
        },
      });
    }
  };
}
