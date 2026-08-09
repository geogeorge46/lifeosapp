import { Request, Response } from "express";
import { LedgerService } from "./ledger.service";

export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const { amount, type, description, personId, placeId, category, dueDate } = req.body;

      if (amount === undefined || !type || !description) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "amount, type, and description are required fields.",
          },
        });
        return;
      }

      if (!["EXPENSE", "LENT", "BORROWED"].includes(type)) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "type must be either 'EXPENSE', 'LENT', or 'BORROWED'.",
          },
        });
        return;
      }

      const tzOffset = req.headers["x-timezone-offset"]
        ? parseInt(req.headers["x-timezone-offset"] as string)
        : 0;

      const result = await this.ledgerService.addTransaction(
        userId,
        {
          personId,
          placeId,
          amount: parseFloat(amount),
          type,
          description,
          category,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
        tzOffset
      );

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create transaction record.",
        },
      });
    }
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const result = await this.ledgerService.getTransactions(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve ledger entries.",
        },
      });
    }
  };

  settle = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { amount } = req.body; // optional partial payment amount
      const result = await this.ledgerService.settleTransaction(
        id,
        amount !== undefined ? parseFloat(amount) : undefined
      );
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to settle transaction.",
        },
      });
    }
  };

  split = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const { totalAmount, description, placeId, splits } = req.body;

      if (totalAmount === undefined || !description || !splits || !Array.isArray(splits)) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "totalAmount, description, and splits array are required fields.",
          },
        });
        return;
      }

      const result = await this.ledgerService.splitExpense(userId, {
        totalAmount: parseFloat(totalAmount),
        description,
        placeId,
        splits: splits.map((s: any) => ({
          personId: s.personId,
          amount: parseFloat(s.amount),
        })),
      });

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to perform group split.",
        },
      });
    }
  };

  getPersonBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const { personId } = req.params;
      const result = await this.ledgerService.getPersonBalanceAndLogs(userId, personId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch balance details.",
        },
      });
    }
  };

  getSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const result = await this.ledgerService.getLedgerSummary(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to compile financial ledger summaries.",
        },
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.ledgerService.removeTransaction(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete transaction log.",
        },
      });
    }
  };
}
