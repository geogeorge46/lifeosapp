import { prisma } from "../../infrastructure/database/prisma.client";

export class PlacesRepository {
  async createPlace(data: {
    userId: string;
    name: string;
    address?: string;
    latitude: number;
    longitude: number;
    radius?: number;
  }) {
    return prisma.place.create({
      data: {
        userId: data.userId,
        name: data.name,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius ?? 150.0,
      },
    });
  }

  async findAllPlacesByUserId(userId: string) {
    return prisma.place.findMany({
      where: { userId },
      include: {
        geofences: {
          where: { active: true },
          include: { task: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findPlaceById(id: string) {
    return prisma.place.findUnique({
      where: { id },
      include: { geofences: true },
    });
  }

  async deletePlace(id: string) {
    return prisma.place.delete({
      where: { id },
    });
  }

  async createGeofenceTrigger(data: {
    userId: string;
    placeId: string;
    taskId?: string;
    triggerType: "ENTER" | "EXIT";
  }) {
    return prisma.geofenceTrigger.create({
      data: {
        userId: data.userId,
        placeId: data.placeId,
        taskId: data.taskId,
        triggerType: data.triggerType,
      },
      include: {
        task: true,
        place: true,
      },
    });
  }

  async findActiveTriggersByPlaceId(placeId: string) {
    return prisma.geofenceTrigger.findMany({
      where: {
        placeId,
        active: true,
      },
      include: {
        task: true,
        place: true,
      },
    });
  }

  async deactivateTrigger(id: string) {
    return prisma.geofenceTrigger.update({
      where: { id },
      data: { active: false },
    });
  }
}
