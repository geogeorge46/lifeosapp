import { prisma } from "../../infrastructure/database/prisma.client";
import { TaskStatus, TriggerType } from "@prisma/client";

function getTriggerTime(scheduledDate: Date, timeStr: string | null, isNotCompleted = false): Date {
  const date = new Date(scheduledDate);
  if (isNotCompleted) {
    date.setHours(21, 0, 0, 0); // 9:00 PM
    return date;
  }
  
  if (timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (match) {
      let hour = parseInt(match[1], 10);
      const min = parseInt(match[2], 10);
      const ampm = match[3].toUpperCase();
      if (ampm === "PM" && hour < 12) hour += 12;
      if (ampm === "AM" && hour === 12) hour = 0;
      date.setHours(hour, min, 0, 0);
    } else {
      date.setHours(10, 0, 0, 0); // 10:00 AM default
    }
  } else {
    date.setHours(10, 0, 0, 0); // 10:00 AM default
  }
  return date;
}

export class TasksRepository {
  async create(data: {
    userId: string;
    title: string;
    description?: string;
    source?: string;
    priority?: string;
    recurrenceRule?: string | null;
    fuzzyDate?: string | null;
    personId?: string | null;
    placeId?: string | null;
    brainDumpId?: string | null;
  }) {
    return prisma.task.create({
      data: {
        userId: data.userId,
        title: data.title,
        description: data.description || null,
        source: data.source || "MANUAL",
        priority: data.priority || "MEDIUM",
        recurrenceRule: data.recurrenceRule || null,
        fuzzyDate: data.fuzzyDate || null,
        personId: data.personId || null,
        placeId: data.placeId || null,
        brainDumpId: data.brainDumpId || null,
      },
    });
  }

  async createOccurrence(data: {
    taskId: string;
    status: TaskStatus;
    scheduledDate: Date;
    scheduledTime?: string | null;
  }) {
    const occurrence = await prisma.taskOccurrence.create({
      data: {
        taskId: data.taskId,
        status: data.status,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime || null,
      },
    });

    const timeTriggerDate = getTriggerTime(data.scheduledDate, data.scheduledTime || null, false);
    const notCompletedTriggerDate = getTriggerTime(data.scheduledDate, null, true);

    await prisma.trigger.createMany({
      data: [
        {
          type: TriggerType.TIME,
          scheduledTime: timeTriggerDate,
          taskOccurrenceId: occurrence.id,
        },
        {
          type: TriggerType.NOT_COMPLETED,
          scheduledTime: notCompletedTriggerDate,
          taskOccurrenceId: occurrence.id,
        },
      ],
    });

    return occurrence;
  }

  async findTodayOccurrences(userId: string, date: Date) {
    return prisma.taskOccurrence.findMany({
      where: {
        task: { userId },
        scheduledDate: date,
      },
      include: {
        task: true,
      },
      orderBy: { id: "asc" },
    });
  }

  async findBacklogOccurrences(userId: string, date: Date) {
    return prisma.taskOccurrence.findMany({
      where: {
        task: { userId },
        scheduledDate: { lt: date },
        status: { notIn: [TaskStatus.COMPLETED, TaskStatus.CANCELLED] },
      },
      include: {
        task: true,
      },
      orderBy: { scheduledDate: "desc" },
    });
  }

  async findOccurrencesByDateRange(userId: string, start: Date, end: Date) {
    return prisma.taskOccurrence.findMany({
      where: {
        task: { userId },
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        task: true,
      },
      orderBy: { scheduledDate: "asc" },
    });
  }

  async findOccurrenceById(id: string) {
    return prisma.taskOccurrence.findUnique({
      where: { id },
      include: {
        task: true,
      },
    });
  }

  async updateOccurrenceStatus(id: string, status: TaskStatus) {
    const completedAt = status === TaskStatus.COMPLETED ? new Date() : null;
    return prisma.taskOccurrence.update({
      where: { id },
      data: {
        status,
        completedAt,
      },
      include: {
        task: true,
      },
    });
  }

  async rescheduleOccurrence(id: string, newDate: Date, reason?: string) {
    const occurrence = await prisma.taskOccurrence.findUnique({
      where: { id },
    });
    if (!occurrence) throw new Error("Task occurrence not found");

    return prisma.$transaction(async (tx) => {
      // 1. Update date and mark status as SCHEDULED
      const updated = await tx.taskOccurrence.update({
        where: { id },
        data: {
          scheduledDate: newDate,
          status: TaskStatus.SCHEDULED,
        },
      });

      // 2. Insert rescheduling audit trail
      await tx.taskHistory.create({
        data: {
          taskId: occurrence.taskId,
          fromDate: occurrence.scheduledDate,
          toDate: newDate,
          reason: reason || "User rescheduled",
        },
      });

      // 3. Clear old triggers
      await tx.trigger.deleteMany({
        where: { taskOccurrenceId: id },
      });

      // 4. Create new triggers
      const timeTriggerDate = getTriggerTime(newDate, occurrence.scheduledTime, false);
      const notCompletedTriggerDate = getTriggerTime(newDate, null, true);

      await tx.trigger.createMany({
        data: [
          {
            type: TriggerType.TIME,
            scheduledTime: timeTriggerDate,
            taskOccurrenceId: id,
          },
          {
            type: TriggerType.NOT_COMPLETED,
            scheduledTime: notCompletedTriggerDate,
            taskOccurrenceId: id,
          },
        ],
      });

      return updated;
    });
  }

  async findRescheduleCount(taskId: string): Promise<number> {
    return prisma.taskHistory.count({
      where: { taskId },
    });
  }

  async findTaskHistory(taskId: string) {
    return prisma.taskHistory.findMany({
      where: { taskId },
      orderBy: { rescheduledAt: "desc" },
    });
  }

  async delete(id: string) {
    return prisma.task.delete({
      where: { id },
    });
  }

  async deleteOccurrence(id: string) {
    return prisma.taskOccurrence.delete({
      where: { id },
    });
  }

  async findCompletedInRange(userId: string, start: Date, end: Date) {
    return prisma.taskOccurrence.findMany({
      where: {
        task: { userId },
        status: TaskStatus.COMPLETED,
        completedAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        task: true,
      },
      orderBy: { completedAt: "asc" },
    });
  }

  async findDroppedInRange(userId: string, start: Date, end: Date) {
    return prisma.taskOccurrence.findMany({
      where: {
        task: { userId },
        status: TaskStatus.CANCELLED,
        scheduledDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        task: true,
      },
      orderBy: { scheduledDate: "asc" },
    });
  }

  async findRescheduledInRange(userId: string, start: Date, end: Date) {
    return prisma.taskHistory.findMany({
      where: {
        task: { userId },
        rescheduledAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        task: {
          include: {
            occurrences: true,
          },
        },
      },
      orderBy: { rescheduledAt: "asc" },
    });
  }

  async findUncompletedBefore(userId: string, end: Date) {
    return prisma.taskOccurrence.findMany({
      where: {
        task: { userId },
        status: {
          in: [TaskStatus.SCHEDULED, TaskStatus.CAPTURED],
        },
        scheduledDate: {
          lte: end,
        },
      },
      include: {
        task: true,
      },
      orderBy: { scheduledDate: "asc" },
    });
  }
}
