import { Request, Response } from "express";
import { PlacesService } from "./places.service";

export class PlacesController {
  constructor(private placesService: PlacesService) {}

  create = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const { name, address, latitude, longitude, radius } = req.body;

      if (!name || latitude === undefined || longitude === undefined) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "name, latitude, and longitude are required fields",
          },
        });
        return;
      }

      const result = await this.placesService.addPlace(userId, {
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius: radius ? parseFloat(radius) : undefined,
      });

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to create place location",
        },
      });
    }
  };

  getAll = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const result = await this.placesService.getPlaces(userId);
      res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to retrieve places list",
        },
      });
    }
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.placesService.removePlace(id);
      res.status(200).json({ success: true, data: null });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to delete place",
        },
      });
    }
  };

  bindTask = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";
      const { placeId, taskId, triggerType } = req.body;

      if (!placeId || !taskId) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "placeId and taskId are required fields",
          },
        });
        return;
      }

      const result = await this.placesService.bindTaskToGeofence(
        userId,
        placeId,
        taskId,
        triggerType || "ENTER"
      );

      res.status(201).json({ success: true, data: result });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to bind task to location trigger",
        },
      });
    }
  };

  triggerGeofence = async (req: Request, res: Response): Promise<void> => {
    try {
      const { placeId } = req.body;
      if (!placeId) {
        res.status(400).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "placeId is required to simulate entry boundary crossing",
          },
        });
        return;
      }

      const logs = await this.placesService.processGeofenceEntryEvent(placeId);
      res.status(200).json({ success: true, data: logs });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to process geofence boundary event",
        },
      });
    }
  };
}
