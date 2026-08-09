import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import inboxRouter from "./modules/inbox/inbox.routes";
import tasksRouter from "./modules/tasks/tasks.routes";
import placesRouter from "./modules/places/places.routes";
import peopleRouter from "./modules/people/people.routes";
import ledgerRouter from "./modules/ledger/ledger.routes";
import recapRouter from "./modules/recap/recap.routes";
import eventsRouter from "./modules/events/events.routes";
import ideasRouter from "./modules/ideas/ideas.routes";
import habitsRouter from "./modules/habits/habits.routes";
import settingsRouter from "./modules/settings/settings.routes";

const app = express();

// Set security middleware
app.use(cors());
app.use(
  helmet({
    // Disable resource policy checks locally so the mobile client can stream/play back saved audio files
    crossOriginResourcePolicy: false,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static serving for audio uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// System health check
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ success: true, message: "LifeOS Server is active and operational." });
});

// Bind Feature Modules
app.use("/api/inbox", inboxRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/events", eventsRouter);
app.use("/api/places", placesRouter);
app.use("/api/people", peopleRouter);
app.use("/api/transactions", ledgerRouter);
app.use("/api/recap", recapRouter);
app.use("/api/ideas", ideasRouter);
app.use("/api/habits", habitsRouter);
app.use("/api/settings", settingsRouter);

// Global error fallback middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[GlobalErrorFilter] Caught unhandled exception:", err);

  const status = err.status || 500;
  res.status(status).json({
    success: false,
    error: {
      code: err.code || "INTERNAL_SERVER_ERROR",
      message: err.message || "An unexpected error occurred on the server",
    },
  });
});

export default app;
