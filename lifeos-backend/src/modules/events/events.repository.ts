import { prisma } from "../../infrastructure/database/prisma.client";

export class EventsRepository {
  async create(data: {
    userId: string;
    title: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    recurrenceRule?: string | null;
    placeId?: string | null;
    brainDumpId?: string | null;
  }) {
    return prisma.event.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description || null,
        startDate: data.startDate,
        endDate: data.endDate,
        recurrenceRule: data.recurrenceRule || null,
        placeId: data.placeId || null,
        brainDumpId: data.brainDumpId || null,
      },
    });
  }

  async findByDateRange(userId: string, start: Date, end: Date) {
    return prisma.event.findMany({
      where: {
        userId,
        startDate: {
          lte: end,
        },
        endDate: {
          gte: start,
        },
      },
      orderBy: { startDate: "asc" },
    });
  }

  async findById(id: string) {
    return prisma.event.findUnique({
      where: { id },
    });
  }

  async delete(id: string) {
    return prisma.event.delete({
      where: { id },
    });
  }
}
