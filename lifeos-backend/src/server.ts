import dotenv from "dotenv";
import path from "path";

// Initialize environment variables from the backend root folder
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import app from "./app";
import { QueueManager } from "./jobs/queue.manager";
import { prisma } from "./infrastructure/database/prisma.client";
import bcrypt from "bcryptjs";

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`🚀 LifeOS API listening on http://localhost:${PORT}`);
  console.log(`🚀 Environment: ${process.env.NODE_ENV || "development"}`);
  
  // Start background workers and event queues
  QueueManager.getInstance().initialize();

  // Auto-seed default developer user to satisfy relational constraints
  const defaultUserId = "00000000-0000-0000-0000-000000000000";
  prisma.user
    .upsert({
      where: { id: defaultUserId },
      update: {},
      create: {
        id: defaultUserId,
        email: "developer@lifeos.local",
        passwordHash: bcrypt.hashSync("developer", 10),
        name: "Default Developer",
      },
    })
    .then(() => {
      console.log("👤 Default developer user seeded successfully.");
    })
    .catch((err) => {
      console.error("⚠️ Failed to seed default developer user:", err);
    });
});

// Handle standard process shutdowns gracefully
process.on("SIGTERM", () => {
  console.log("SIGTERM received, executing graceful shutdown...");
  QueueManager.getInstance().stop();
  server.close(() => {
    console.log("HTTP server terminated.");
  });
});
