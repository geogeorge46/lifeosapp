import { z } from "zod";

export const CreateTaskDto = z.object({
  title: z.string().min(1, { message: "Task title cannot be empty" }),
  description: z.string().optional(),
  inboxItemId: z.string().uuid().optional(),
  source: z.string().optional(),
  priority: z.string().optional(),
  recurrenceRule: z.string().optional().nullable(),
  fuzzyDate: z.string().optional().nullable(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskDto>;

export const UpdateTaskStatusDto = z.object({
  status: z.enum(["CAPTURED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "NOT_COMPLETED", "CANCELLED", "DEFERRED"], {
    errorMap: () => ({
      message: "Status must be 'CAPTURED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'NOT_COMPLETED', 'CANCELLED', or 'DEFERRED'",
    }),
  }),
});

export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusDto>;
