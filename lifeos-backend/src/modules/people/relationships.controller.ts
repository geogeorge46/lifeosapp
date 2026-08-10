import { Request, Response } from "express";
import { RelationshipsService } from "./relationships.service";

export class RelationshipsController {
  constructor(private service: RelationshipsService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { personAId, personBId, type } = req.body;

      if (!personAId || !personBId || !type) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "personAId, personBId, and type are required fields.",
          },
        });
        return;
      }

      const result = await this.service.addRelationship(userId, personAId, personBId, type);
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to establish relationship.",
        },
      });
    }
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const result = await this.service.getRelationships(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to fetch relationships list.",
        },
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;
      await this.service.removeRelationship(userId, id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to remove relationship.",
        },
      });
    }
  };

  getConnections = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { id } = req.params; // start contact id
      const result = await this.service.getConnectionsGraph(userId, id);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to trace contact connection pathways.",
        },
      });
    }
  };
}
