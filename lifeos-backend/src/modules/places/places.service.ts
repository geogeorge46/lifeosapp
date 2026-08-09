import { PlacesRepository } from "./places.repository";
import { prisma } from "../../infrastructure/database/prisma.client";
import { QueueManager } from "../../jobs/queue.manager";
import { TaskStatus } from "@prisma/client";

export class PlacesService {
  constructor(private placesRepository: PlacesRepository) {}

  async addPlace(
    userId: string,
    data: { name: string; address?: string; latitude: number; longitude: number; radius?: number }
  ) {
    return this.placesRepository.createPlace({
      userId,
      ...data,
    });
  }

  async getPlaces(userId: string) {
    return this.placesRepository.findAllPlacesByUserId(userId);
  }

  async removePlace(id: string) {
    return this.placesRepository.deletePlace(id);
  }

  async bindTaskToGeofence(
    userId: string,
    placeId: string,
    taskId: string,
    triggerType: "ENTER" | "EXIT" = "ENTER"
  ) {
    // Assert place and task are valid and associated with the matching user
    const place = await this.placesRepository.findPlaceById(placeId);
    if (!place || place.userId !== userId) {
      throw new Error("Place not found or access denied.");
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) {
      throw new Error("Task not found or access denied.");
    }

    return this.placesRepository.createGeofenceTrigger({
      userId,
      placeId,
      taskId,
      triggerType,
    });
  }

  /**
   * Invoked when a client crosses a geofence boundary.
   * Finds matching active triggers, formats a notification, and logs a QUEUED notification payload.
   */
  async processGeofenceEntryEvent(placeId: string) {
    const triggers = await this.placesRepository.findActiveTriggersByPlaceId(placeId);
    const generatedLogs = [];

    for (const trigger of triggers) {
      if (trigger.task) {
        const title = `📍 Location Alert: ${trigger.task.title}`;
        const body = `Triggered at "${trigger.place.name}". Notes: ${
          trigger.task.description || "No notes provided."
        }`;

        // Enqueue push notification and write standard log entry
        await QueueManager.getInstance().enqueuePushNotification(trigger.userId, title, body);

        // Deactivate trigger to enforce one-shot reminder behavior
        await this.placesRepository.deactivateTrigger(trigger.id);

        // Retrieve the created log to return in the array
        const log = await prisma.notificationLog.findFirst({
          where: { userId: trigger.userId, title, status: "QUEUED" },
          orderBy: { createdAt: "desc" },
        });
        if (log) generatedLogs.push(log);
      }
    }

    // Process generic Trigger table LOCATION rules
    const locationTriggers = await prisma.trigger.findMany({
      where: {
        type: "LOCATION",
        placeId: placeId,
        fired: false,
      },
      include: {
        taskOccurrence: {
          include: {
            task: true,
          },
        },
      },
    });

    for (const t of locationTriggers) {
      if (t.taskOccurrence) {
        const occurrence = t.taskOccurrence;
        const task = occurrence.task;

        if (
          occurrence.status !== TaskStatus.COMPLETED &&
          occurrence.status !== TaskStatus.CANCELLED
        ) {
          const title = `📍 Location Reminder: ${task.title}`;
          const body = `You are near your mapped target place. Notes: ${task.description || ""}`;

          await QueueManager.getInstance().enqueuePushNotification(task.userId, title, body);

          const log = await prisma.notificationLog.findFirst({
            where: { userId: task.userId, title, status: "QUEUED" },
            orderBy: { createdAt: "desc" },
          });
          if (log) generatedLogs.push(log);
        }
      }

      // Mark trigger as fired
      await prisma.trigger.update({
        where: { id: t.id },
        data: { fired: true },
      });
    }

    return generatedLogs;
  }
}
