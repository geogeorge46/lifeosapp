import { prisma } from "../../infrastructure/database/prisma.client";

export class HabitsRepository {
  async findAllByUserId(userId: string) {
    return prisma.habit.findMany({
      where: { userId },
      include: {
        completions: {
          orderBy: { date: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return prisma.habit.findUnique({
      where: { id },
      include: {
        completions: true,
      },
    });
  }

  async createHabit(userId: string, title: string) {
    return prisma.habit.create({
      data: {
        userId,
        title,
      },
      include: {
        completions: true,
      },
    });
  }

  async deleteHabit(id: string) {
    return prisma.habit.delete({
      where: { id },
    });
  }

  async toggleCompletion(habitId: string, targetDate: Date) {
    // Truncate time to ensure unique YYYY-MM-DD date part
    const dateOnly = new Date(targetDate);
    dateOnly.setHours(0, 0, 0, 0);

    const existing = await prisma.habitCompletion.findFirst({
      where: {
        habitId,
        date: dateOnly,
      },
    });

    if (existing) {
      // Un-complete habit
      await prisma.habitCompletion.delete({
        where: { id: existing.id },
      });
    } else {
      // Complete habit
      await prisma.habitCompletion.create({
        data: {
          habitId,
          date: dateOnly,
        },
      });
    }

    // Recalculate streak values dynamically
    const completions = await prisma.habitCompletion.findMany({
      where: { habitId },
      orderBy: { date: "asc" },
    });

    const dates = completions.map((c) => c.date);
    const { currentStreak, longestStreak } = calculateStreaks(dates);

    return prisma.habit.update({
      where: { id: habitId },
      data: {
        streak: currentStreak,
        longestStreak: longestStreak,
      },
      include: {
        completions: {
          orderBy: { date: "asc" },
        },
      },
    });
  }
}

function calculateStreaks(completionDates: Date[]): { currentStreak: number; longestStreak: number } {
  if (completionDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Format date parts into YYYY-MM-DD strings using UTC/local offsets safely
  const dateStrings = Array.from(
    new Set(
      completionDates.map((d) => {
        const date = new Date(d);
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${y}-${m}-${day}`;
      })
    )
  ).sort();

  const subtractDays = (dateStr: string, days: number): string => {
    const d = new Date(dateStr + "T12:00:00");
    d.setDate(d.getDate() - days);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const yesterdayStr = subtractDays(todayStr, 1);

  // 1. Calculate Current Streak
  let currentStreak = 0;
  let targetDateStr = "";

  if (dateStrings.includes(todayStr)) {
    targetDateStr = todayStr;
  } else if (dateStrings.includes(yesterdayStr)) {
    targetDateStr = yesterdayStr;
  }

  if (targetDateStr) {
    let checkDateStr = targetDateStr;
    while (dateStrings.includes(checkDateStr)) {
      currentStreak++;
      checkDateStr = subtractDays(checkDateStr, 1);
    }
  }

  // 2. Calculate Longest Streak
  let longestStreak = 0;
  let currentRun = 0;
  let prevDateStr: string | null = null;

  for (const dateStr of dateStrings) {
    if (prevDateStr === null) {
      currentRun = 1;
    } else {
      const expectedPrev = subtractDays(dateStr, 1);
      if (prevDateStr === expectedPrev) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    }
    if (currentRun > longestStreak) {
      longestStreak = currentRun;
    }
    prevDateStr = dateStr;
  }

  return { currentStreak, longestStreak };
}
