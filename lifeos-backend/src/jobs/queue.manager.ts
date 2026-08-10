import { Queue, Worker } from "bullmq";
import { prisma } from "../infrastructure/database/prisma.client";
import { ExpoPushService } from "../infrastructure/push/expo-push.service";
import { TriggerEvaluator } from "./trigger.evaluator";

const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);

export class QueueManager {
  private static instance: QueueManager;
  private isRedisConnected = false;

  private notificationQueue: Queue | null = null;
  private fallbackTimer: NodeJS.Timeout | null = null;
  private triggerEvaluatorTimer: NodeJS.Timeout | null = null;
  private expoPushService = new ExpoPushService();

  private constructor() {}

  static getInstance(): QueueManager {
    if (!QueueManager.instance) {
      QueueManager.instance = new QueueManager();
    }
    return QueueManager.instance;
  }

  async initialize(): Promise<void> {
    try {
      console.log(`[QueueManager] Initializing BullMQ on Redis: ${REDIS_HOST}:${REDIS_PORT}...`);

      const connection = { host: REDIS_HOST, port: REDIS_PORT };

      // Initialize standard BullMQ queue instances
      this.notificationQueue = new Queue("notification-queue", { connection });

      // Start BullMQ listening workers
      this.startWorkers({ connection });
      this.isRedisConnected = true;

      console.log("[QueueManager] BullMQ system operational.");
    } catch (err) {
      console.warn(
        "[QueueManager] Redis connection unavailable. Falling back to DB-polling worker simulation..."
      );
      this.isRedisConnected = false;
      this.startFallbackLoop();
    } finally {
      this.startTriggerEvaluatorLoop();
    }
  }

  private startWorkers(config: { connection: any }) {
    new Worker(
      "notification-queue",
      async (job) => {
        const { userId, title, body } = job.data;
        console.log(`[BullMQ Worker] Pulling notification task for user ${userId}`);

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { pushToken: true }
        });

        if (user && user.pushToken) {
          await this.expoPushService.sendPushNotification(user.pushToken, title, body);
        }

        // Keep database logs updated
        await prisma.notificationLog.updateMany({
          where: { userId, title, status: "QUEUED" },
          data: { status: "SENT", sentAt: new Date() },
        });
      },
      config
    );
  }

  private startFallbackLoop() {
    this.fallbackTimer = setInterval(async () => {
      try {
        const pending = await prisma.notificationLog.findMany({
          where: { status: "QUEUED" },
          take: 5,
        });

        for (const log of pending) {
          console.log(`[Fallback Worker] Processing queued notification alert: ${log.title}`);

          const user = await prisma.user.findUnique({
            where: { id: log.userId },
            select: { pushToken: true }
          });

          if (user && user.pushToken) {
            await this.expoPushService.sendPushNotification(
              user.pushToken,
              log.title,
              log.body
            );
          }

          await prisma.notificationLog.update({
            where: { id: log.id },
            data: { status: "SENT", sentAt: new Date() },
          });
        }
      } catch (err) {
        console.error("[Fallback Worker] Simulation loop execution exception:", err);
      }
    }, 8000); // Check every 8 seconds
  }

  async enqueuePushNotification(userId: string, title: string, body: string) {
    // Write standard log entry
    await prisma.notificationLog.create({
      data: {
        userId,
        title,
        body,
        status: "QUEUED",
      },
    });

    if (this.isRedisConnected && this.notificationQueue) {
      await this.notificationQueue.add("send-push", { userId, title, body });
    } else {
      console.log(`[QueueManager] Enqueued log notification for ${userId} in fallback mode`);
    }
  }

  private startTriggerEvaluatorLoop() {
    console.log("[QueueManager] Starting Trigger Evaluator polling interval loop.");
    this.triggerEvaluatorTimer = setInterval(async () => {
      await TriggerEvaluator.evaluate();
    }, 30000); // Poll every 30 seconds
  }

  async stop() {
    if (this.fallbackTimer) {
      clearInterval(this.fallbackTimer);
    }
    if (this.triggerEvaluatorTimer) {
      clearInterval(this.triggerEvaluatorTimer);
    }
  }
}
