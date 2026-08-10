import { Request, Response } from "express";
import { PeopleService } from "./people.service";

export class PeopleController {
  constructor(private peopleService: PeopleService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const { name, phone, relationship, birthday, tags } = req.body;

      if (!name) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "name is a required parameter",
          },
        });
        return;
      }

      const result = await this.peopleService.addPerson(userId, { name, phone, relationship, birthday, tags });
      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create contact",
        },
      });
    }
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req as any).user.id;
      const result = await this.peopleService.getPeople(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve people records",
        },
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.peopleService.removePerson(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete contact record",
        },
      });
    }
  };

  linkPlace = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { placeId } = req.body;

      if (!placeId) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "placeId is required" },
        });
        return;
      }

      const result = await this.peopleService.linkPlaceToPerson(id, placeId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to link place" },
      });
    }
  };

  unlinkPlace = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, placeId } = req.params;
      await this.peopleService.unlinkPlaceFromPerson(id, placeId);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to unlink place" },
      });
    }
  };

  addTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { tagName } = req.body;

      if (!tagName) {
        res.status(400).json({
          success: false,
          error: { code: "VALIDATION_ERROR", message: "tagName is required" },
        });
        return;
      }

      const result = await this.peopleService.addTagToPerson(id, tagName);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to add tag" },
      });
    }
  };

  removeTag = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, tagId } = req.params;
      await this.peopleService.removeTagFromPerson(id, tagId);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: error.message || "Failed to remove tag" },
      });
    }
  };
}
