import { PrismaClient } from "@prisma/client";
import { authContext } from "../../core/utils/auth-context";

const basePrisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["query", "info", "warn", "error"] : ["error"],
});

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        const store = authContext.getStore();
        const anyArgs = args as any;
        
        if (store?.userId) {
          const rlsModels = [
            "BrainDump",
            "BrainDumpCollection",
            "Idea",
            "Task",
            "Event",
            "Place",
            "Person",
            "Transaction",
            "DailyRecap",
            "NotificationPreference",
            "NotificationLog",
            "GeofenceTrigger",
            "Habit",
            "Relationship",
            "Occasion",
            "TaskOccurrence",
            "TaskHistory",
            "HabitCompletion",
            "Trigger",
            "User"
          ];

          if (rlsModels.includes(model)) {
            // Apply isolation scope constraints to query operations
            if (operation !== "create" && operation !== "createMany") {
              anyArgs.where = anyArgs.where || {};
              if (model === "User") {
                anyArgs.where.id = store.userId;
              } else {
                anyArgs.where.userId = store.userId;
              }
            }

            // Apply ownership injection on inserts
            if (operation === "create") {
              anyArgs.data = anyArgs.data || {};
              anyArgs.data.userId = store.userId;
            } else if (operation === "createMany") {
              if (Array.isArray(anyArgs.data)) {
                anyArgs.data = anyArgs.data.map((item: any) => ({
                  ...item,
                  userId: store.userId
                }));
              } else if (anyArgs.data) {
                anyArgs.data.userId = store.userId;
              }
            } else if (operation === "upsert") {
              anyArgs.create = anyArgs.create || {};
              anyArgs.create.userId = store.userId;
              anyArgs.update = anyArgs.update || {};
              anyArgs.update.userId = store.userId;
            }
          }
        }
        return query(anyArgs);
      }
    }
  }
});
