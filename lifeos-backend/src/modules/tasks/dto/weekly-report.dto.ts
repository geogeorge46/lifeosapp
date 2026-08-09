import { z } from "zod";

export const WeeklyReportQueryDto = z.object({
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date format (YYYY-MM-DD)"),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date format (YYYY-MM-DD)"),
});
