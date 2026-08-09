import { prisma } from "../infrastructure/database/prisma.client";
import { QueueManager } from "./queue.manager";
import { TriggerType, TaskStatus } from "@prisma/client";

export class TriggerEvaluator {
  static async evaluate(): Promise<void> {
    try {
      const now = new Date();
      // Fetch all pending triggers whose scheduled time has passed
      const pendingTriggers = await prisma.trigger.findMany({
        where: {
          fired: false,
          scheduledTime: {
            lte: now,
          },
        },
        include: {
          taskOccurrence: {
            include: {
              task: true,
            },
          },
          event: true,
          person: true,
          transaction: {
            include: {
              person: true,
            },
          },
        },
      });

      if (pendingTriggers.length === 0) return;

      console.log(`[TriggerEvaluator] Evaluating ${pendingTriggers.length} pending triggers...`);

      for (const trigger of pendingTriggers) {
        try {
          let shouldNotify = false;
          let userId = "";
          let title = "";
          let body = "";

          if (trigger.type === TriggerType.TIME && trigger.taskOccurrence) {
            const occurrence = trigger.taskOccurrence;
            const task = occurrence.task;
            
            // Only remind if the task occurrence is not completed or cancelled
            if (
              occurrence.status !== TaskStatus.COMPLETED &&
              occurrence.status !== TaskStatus.CANCELLED
            ) {
              shouldNotify = true;
              userId = task.userId;
              title = `⏰ Reminder: ${task.title}`;
              body = task.description || "Scheduled task reminder.";
            }
          } 
          else if (trigger.type === TriggerType.TIME && trigger.transaction) {
            const tx = trigger.transaction;
            if (tx.status === "PENDING") {
              shouldNotify = true;
              userId = tx.userId;
              const nameLabel = tx.person?.name || "someone";
              const amtStr = Number(tx.amount).toFixed(2);
              if (tx.type === "LENT") {
                title = `💸 Payment Reminder`;
                body = `${nameLabel} owes you $${amtStr} for: ${tx.description}`;
              } else {
                title = `💸 Debt Reminder`;
                body = `You owe ${nameLabel} $${amtStr} for: ${tx.description}`;
              }
            }
          } 
          else if (trigger.type === TriggerType.BEFORE_EVENT && trigger.event) {
            const event = trigger.event;
            shouldNotify = true;
            userId = event.userId;
            title = `📅 Upcoming Event: ${event.title}`;
            body = `Starts at ${new Date(event.startDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. ${event.description || ""}`;
          } 
          else if (trigger.type === TriggerType.NOT_COMPLETED && trigger.taskOccurrence) {
            const occurrence = trigger.taskOccurrence;
            const task = occurrence.task;

            // Warn if the task is still uncompleted at the end of the scheduled day
            if (
              occurrence.status !== TaskStatus.COMPLETED &&
              occurrence.status !== TaskStatus.CANCELLED
            ) {
              shouldNotify = true;
              userId = task.userId;
              title = `⚠️ Task Outstanding`;
              body = `Did you complete "${task.title}" today? Review your backlog review cards.`;
            }
          }
          else if (trigger.type === TriggerType.BIRTHDAY && trigger.person) {
            const person = trigger.person;
            shouldNotify = true;
            userId = person.userId;
            title = `🎂 Birthday Reminder`;
            body = `Tomorrow is ${person.name}'s birthday! Don't forget to wish them well.`;

            // Birthday triggers are recurring yearly. Calculate the next year's date.
            const nextYear = new Date(trigger.scheduledTime!);
            nextYear.setFullYear(nextYear.getFullYear() + 1);

            // Update database record for next year instead of setting fired = true
            await prisma.trigger.update({
              where: { id: trigger.id },
              data: {
                scheduledTime: nextYear,
                fired: false,
              },
            });
          }

          // Enqueue notification payload
          if (shouldNotify && userId) {
            await QueueManager.getInstance().enqueuePushNotification(userId, title, body);
          }

          if (trigger.type !== TriggerType.BIRTHDAY) {
            // Mark trigger as fired
            await prisma.trigger.update({
              where: { id: trigger.id },
              data: { fired: true },
            });
          }
        } catch (err) {
          console.error(`[TriggerEvaluator] Failed to evaluate trigger ${trigger.id}:`, err);
        }
      }
    } catch (err) {
      console.error("[TriggerEvaluator] Evaluation loop error:", err);
    }
  }
}
