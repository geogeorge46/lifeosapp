import { Router, Request, Response } from "express";
import { prisma } from "../../infrastructure/database/prisma.client";

const router = Router();

router.get("/export", async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "00000000-0000-0000-0000-000000000000";

    const [
      tasks,
      transactions,
      people,
      relationships,
      places,
      events,
      habits,
      brainDumps,
      ideas,
    ] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        include: { occurrences: true, history: true },
      }),
      prisma.transaction.findMany({
        where: { userId },
        include: { partialPayments: true },
      }),
      prisma.person.findMany({
        where: { userId },
        include: { tags: { include: { tag: true } } },
      }),
      prisma.relationship.findMany({
        where: {
          personA: { userId },
        },
      }),
      prisma.place.findMany({
        where: { userId },
        include: { geofences: true },
      }),
      prisma.event.findMany({
        where: { userId },
      }),
      prisma.habit.findMany({
        where: { userId },
        include: { completions: true },
      }),
      prisma.brainDump.findMany({
        where: { userId },
      }),
      prisma.idea.findMany({
        where: { userId },
      }),
    ]);

    const exportBundle = {
      exportedAt: new Date().toISOString(),
      userId,
      data: {
        tasks,
        transactions,
        people,
        relationships,
        places,
        events,
        habits,
        brainDumps,
        ideas,
      },
    };

    res.status(200).json({ success: true, data: exportBundle });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: "EXPORT_ERROR",
        message: error.message || "Failed to compile data backup export.",
      },
    });
  }
});

export default router;
