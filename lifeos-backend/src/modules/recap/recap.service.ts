import { RecapRepository } from "./recap.repository";
import { prisma } from "../../infrastructure/database/prisma.client";
import { QueueManager } from "../../jobs/queue.manager";

export class RecapService {
  constructor(private recapRepository: RecapRepository) {}

  async getTodayRecap(userId: string) {
    // Assert if a recap is already compiled for today
    const existing = await this.recapRepository.findTodayRecapByUserId(userId);
    if (existing) {
      return existing;
    }

    // Compile fresh summary on the fly
    return this.generateDailyRecap(userId);
  }

  async generateDailyRecap(userId: string) {
    const today = new Date();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Fetch Today's Active Task Occurrences
    const occurrences = await prisma.taskOccurrence.findMany({
      where: {
        task: { userId },
        status: { in: ["CAPTURED", "SCHEDULED", "IN_PROGRESS"] },
        scheduledDate: startOfToday,
      },
      include: {
        task: true,
      },
    });

    // 2. Fetch Unprocessed Inbox captures (captured within last 48 hours)
    const searchThreshold = new Date();
    searchThreshold.setDate(searchThreshold.getDate() - 2);

    const captures = await prisma.brainDump.findMany({
      where: {
        userId,
        status: "INBOX",
        archived: false,
        createdAt: {
          gte: searchThreshold,
        },
      },
    });

    // 3. Fetch Outstanding debt transactions
    const ledger = await prisma.transaction.findMany({
      where: {
        userId,
        status: "PENDING",
        type: { in: ["LENT", "BORROWED"] },
      },
      include: { person: true },
    });

    // 4. Assemble Markdown Content
    const longDate = today.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let content = `# Morning Recap — ${longDate}\n\n`;

    // Tasks Section
    content += `## 📅 Today's Schedule\n`;
    if (occurrences.length === 0) {
      content += `No tasks scheduled for today. Have a peaceful day!\n\n`;
    } else {
      occurrences.forEach((o) => {
        const timeLabel = o.scheduledTime ? ` [${o.scheduledTime}]` : "";
        content += `* [ ] ${o.task.title}${timeLabel}\n`;
      });
      content += `\n`;
    }

    // Captures Section
    content += `## 📥 Unprocessed Captures\n`;
    if (captures.length === 0) {
      content += `Inbox is empty. Excellent job organizing captures!\n\n`;
    } else {
      content += `Items from yesterday awaiting organization:\n`;
      captures.forEach((c: any) => {
        const textValue = c.contentType === "AUDIO" ? c.rawText : c.content;
        content += `* "${textValue || "Voice note"}"\n`;
      });
      content += `\n`;
    }

    // Ledger Section
    content += `## 💸 Ledger Highlights\n`;
    const lent = ledger.filter((l) => l.type === "LENT");
    const borrowed = ledger.filter((l) => l.type === "BORROWED");

    if (lent.length === 0 && borrowed.length === 0) {
      content += `No pending debts outstanding.\n\n`;
    } else {
      if (lent.length > 0) {
        content += `### Owed to You:\n`;
        lent.forEach((l) => {
          content += `* $${Number(l.amount).toFixed(2)} from ${l.person?.name || "someone"} (${
            l.description
          })\n`;
        });
      }
      if (borrowed.length > 0) {
        content += `### You Owe:\n`;
        borrowed.forEach((b) => {
          content += `* $${Number(b.amount).toFixed(2)} to ${b.person?.name || "someone"} (${
            b.description
          })\n`;
        });
      }
      content += `\n`;
    }

    // Write to postgres database
    const recap = await this.recapRepository.createRecap({
      userId,
      content,
    });

    // Enqueue push notifications
    try {
      await QueueManager.getInstance().enqueuePushNotification(
        userId,
        "🌅 Your Morning Recap is Ready",
        `Review your digest tasks, inbox cards, and ledger updates for today.`
      );
    } catch (err) {
      console.error("[RecapService] Push notification queuing exception:", err);
    }

    return recap;
  }
}
