import { TasksRepository } from "./tasks.repository";
import { parseFuzzyDate } from "./utils/fuzzy-date.parser";
import { prisma } from "../../infrastructure/database/prisma.client";
import { TaskStatus } from "@prisma/client";

export class TasksService {
  constructor(private tasksRepository: TasksRepository) {}

  private generateOccurrencesForTask(
    taskId: string,
    startDate: Date,
    recurrenceRule: string | null,
    scheduledTime: string | null
  ) {
    const promises = [];
    const baseDate = new Date(startDate);

    if (recurrenceRule === "FREQ=DAILY") {
      // Create occurrences for 30 days
      for (let i = 0; i < 30; i++) {
        const occurrenceDate = new Date(baseDate);
        occurrenceDate.setDate(baseDate.getDate() + i);
        promises.push(
          this.tasksRepository.createOccurrence({
            taskId,
            status: TaskStatus.SCHEDULED,
            scheduledDate: occurrenceDate,
            scheduledTime,
          })
        );
      }
    } else if (recurrenceRule && recurrenceRule.startsWith("FREQ=WEEKLY")) {
      // Create occurrences for 10 weeks
      for (let i = 0; i < 10; i++) {
        const occurrenceDate = new Date(baseDate);
        occurrenceDate.setDate(baseDate.getDate() + i * 7);
        promises.push(
          this.tasksRepository.createOccurrence({
            taskId,
            status: TaskStatus.SCHEDULED,
            scheduledDate: occurrenceDate,
            scheduledTime,
          })
        );
      }
    } else {
      // Single task occurrence
      promises.push(
        this.tasksRepository.createOccurrence({
          taskId,
          status: TaskStatus.SCHEDULED,
          scheduledDate: baseDate,
          scheduledTime,
        })
      );
    }

    return Promise.all(promises);
  }

  async createTaskFromFuzzy(userId: string, rawInput: string, notes?: string) {
    const parsed = parseFuzzyDate(rawInput);
    
    // 1. Create the Task rule/metadata
    const task = await this.tasksRepository.create({
      userId,
      title: parsed.title,
      description: notes,
      source: "MANUAL",
      priority: "MEDIUM",
      recurrenceRule: parsed.recurrenceRule,
      fuzzyDate: parsed.originalDueDateText,
    });

    // 2. Generate initial occurrences
    const start = parsed.dueDate || new Date();
    await this.generateOccurrencesForTask(task.id, start, parsed.recurrenceRule, parsed.scheduledTime);

    return task;
  }

  async createTaskFromInboxItem(userId: string, brainDumpId: string, notes?: string) {
    return prisma.$transaction(async (tx) => {
      const brainDump = await tx.brainDump.findUnique({
        where: { id: brainDumpId },
      });

      if (!brainDump) throw new Error("Target brain dump item not found.");

      const rawTextToParse = brainDump.contentType === "TEXT" ? brainDump.content : brainDump.rawText || "";
      const parsed = parseFuzzyDate(rawTextToParse);

      const resolvedDescription = notes || (brainDump.contentType === "AUDIO" ? `Original audio link: ${brainDump.content}` : undefined);

      // 1. Create Task
      const task = await tx.task.create({
        data: {
          userId,
          title: parsed.title,
          description: resolvedDescription,
          source: brainDump.contentType === "TEXT" ? "INBOX_TEXT" : "INBOX_AUDIO",
          priority: "MEDIUM",
          recurrenceRule: parsed.recurrenceRule,
          fuzzyDate: parsed.originalDueDateText,
          brainDumpId,
        },
      });

      // 2. Mark the brain dump item as processed
      await tx.brainDump.update({
        where: { id: brainDumpId },
        data: { status: "PROCESSED" },
      });

      return { task, parsed };
    }).then(async (result) => {
      // 3. Generate occurrences outside the database transaction for performance
      const start = result.parsed.dueDate || new Date();
      await this.generateOccurrencesForTask(result.task.id, start, result.parsed.recurrenceRule, result.parsed.scheduledTime);
      return result.task;
    });
  }

  async getTodayTasks(userId: string, dateStr: string) {
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const [today, backlog] = await Promise.all([
      this.tasksRepository.findTodayOccurrences(userId, targetDate),
      this.tasksRepository.findBacklogOccurrences(userId, targetDate),
    ]);

    // Attach postpone history counts to each occurrence task
    const attachCounts = async (occurrences: any[]) => {
      return Promise.all(
        occurrences.map(async (o) => {
          const rescheduleCount = await this.tasksRepository.findRescheduleCount(o.taskId);
          return {
            ...o,
            rescheduleCount,
          };
        })
      );
    };

    return {
      today: await attachCounts(today),
      backlog: await attachCounts(backlog),
    };
  }

  async getOccurrencesByDateRange(userId: string, startStr: string, endStr: string) {
    const start = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${endStr}T23:59:59.999Z`);

    const occurrences = await this.tasksRepository.findOccurrencesByDateRange(userId, start, end);
    return Promise.all(
      occurrences.map(async (o) => {
        const rescheduleCount = await this.tasksRepository.findRescheduleCount(o.taskId);
        return {
          ...o,
          rescheduleCount,
        };
      })
    );
  }

  async updateOccurrenceStatus(id: string, status: TaskStatus) {
    return this.tasksRepository.updateOccurrenceStatus(id, status);
  }

  async rescheduleOccurrence(id: string, newDateStr: string, reason?: string) {
    const newDate = new Date(newDateStr);
    newDate.setHours(12, 0, 0, 0);
    return this.tasksRepository.rescheduleOccurrence(id, newDate, reason);
  }

  async deleteOccurrence(id: string) {
    return this.tasksRepository.deleteOccurrence(id);
  }

  async deleteTask(id: string) {
    return this.tasksRepository.delete(id);
  }

  async getTaskHistory(taskId: string) {
    return this.tasksRepository.findTaskHistory(taskId);
  }

  async getWeeklyReport(userId: string, startStr: string, endStr: string) {
    const start = new Date(`${startStr}T00:00:00.000Z`);
    const end = new Date(`${endStr}T23:59:59.999Z`);

    const [completed, dropped, histories, uncompletedOccurrences] = await Promise.all([
      this.tasksRepository.findCompletedInRange(userId, start, end),
      this.tasksRepository.findDroppedInRange(userId, start, end),
      this.tasksRepository.findRescheduledInRange(userId, start, end),
      this.tasksRepository.findUncompletedBefore(userId, end),
    ]);

    // Group histories by taskId to calculate postpone metrics
    const rescheduleMap = new Map<string, { taskId: string; title: string; postponeCount: number; history: any[] }>();

    for (const h of histories) {
      const taskId = h.taskId;
      const title = h.task.title;
      if (!rescheduleMap.has(taskId)) {
        rescheduleMap.set(taskId, {
          taskId,
          title,
          postponeCount: 0,
          history: [],
        });
      }

      const entry = rescheduleMap.get(taskId)!;
      entry.postponeCount += 1;
      entry.history.push({
        fromDate: h.fromDate,
        toDate: h.toDate,
        rescheduledAt: h.rescheduledAt,
        reason: h.reason,
      });
    }

    const rescheduledStats = Array.from(rescheduleMap.values()).sort(
      (a, b) => b.postponeCount - a.postponeCount
    );

    // Attach total rescheduleCount to the uncompleted items
    const uncompleted = await Promise.all(
      uncompletedOccurrences.map(async (o) => {
        const rescheduleCount = await this.tasksRepository.findRescheduleCount(o.taskId);
        return {
          ...o,
          rescheduleCount,
        };
      })
    );

    return {
      completed,
      dropped,
      rescheduled: rescheduledStats,
      uncompleted,
    };
  }
}
