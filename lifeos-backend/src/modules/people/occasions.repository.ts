import { prisma } from "../../infrastructure/database/prisma.client";
import { TriggerType } from "@prisma/client";

export class OccasionsRepository {
  async createOccasion(data: {
    personId: string;
    title: string;
    date: Date;
    type: string;
    offsets: number[];
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Create occasion record
      const occasion = await tx.occasion.create({
        data: {
          personId: data.personId,
          title: data.title,
          date: data.date,
          type: data.type.toUpperCase(),
        },
      });

      // 2. Create dynamic TIME triggers for each offset (offsets in minutes)
      for (const offset of data.offsets) {
        // e.g. 9:00 AM on the offset day
        const triggerTime = new Date(data.date);
        triggerTime.setHours(9, 0, 0, 0); // 9:00 AM
        const adjustedTime = new Date(triggerTime.getTime() + offset * 60 * 1000);

        await tx.trigger.create({
          data: {
            type: TriggerType.TIME,
            scheduledTime: adjustedTime,
            occasionId: occasion.id,
            personId: data.personId,
          },
        });
      }

      return tx.occasion.findUnique({
        where: { id: occasion.id },
        include: { triggers: true },
      });
    });
  }

  async findByPersonId(personId: string) {
    return prisma.occasion.findMany({
      where: { personId },
      include: { triggers: true },
      orderBy: { date: "asc" },
    });
  }

  async findById(id: string) {
    return prisma.occasion.findUnique({
      where: { id },
      include: { person: true },
    });
  }

  async delete(id: string) {
    return prisma.occasion.delete({
      where: { id },
    });
  }
}
