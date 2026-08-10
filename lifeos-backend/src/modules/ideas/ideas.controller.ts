import { Request, Response } from "express";
import { IdeasService } from "./ideas.service";

export class IdeasController {
  constructor(private ideasService: IdeasService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { title, description, notes, category, brainDumpId, personId, placeId } = req.body;

      if (!title) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "A title must be provided to create an Idea",
          },
        });
        return;
      }

      const result = await this.ideasService.createIdea({
        userId,
        title,
        description,
        notes,
        category,
        brainDumpId,
        personId,
        placeId,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create Idea",
        },
      });
    }
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const result = await this.ideasService.getIdeas(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve Ideas",
        },
      });
    }
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.ideasService.getIdeaById(id);
      if (!result) {
        res.status(404).json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Idea not found",
          },
        });
        return;
      }
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve Idea",
        },
      });
    }
  };

  update = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { title, description, notes, category, personId, placeId } = req.body;

      const result = await this.ideasService.updateIdea(id, {
        title,
        description,
        notes,
        category,
        personId,
        placeId,
      });

      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to update Idea",
        },
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.ideasService.deleteIdea(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete Idea",
        },
      });
    }
  };
}
