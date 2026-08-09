import { prisma } from "../../infrastructure/database/prisma.client";

export class RecapRepository {
  async createRecap(data: { userId: string; content: string }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.dailyRecap.upsert({
      where: {
        userId_date: {
          userId: data.userId,
          date: today,
        },
      },
      update: {
        summary: data.content,
      },
      create: {
        userId: data.userId,
        date: today,
        summary: data.content,
      },
    });
  }

  async findTodayRecapByUserId(userId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return prisma.dailyRecap.findFirst({
      where: {
        userId,
        date: today,
      },
      orderBy: { generatedAt: "desc" },
    });
  }
}
