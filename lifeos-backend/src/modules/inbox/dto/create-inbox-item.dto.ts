import { z } from "zod";

export const CreateInboxItemDto = z.object({
  contentType: z.enum(["TEXT", "AUDIO"], {
    errorMap: () => ({ message: "contentType must be either 'TEXT' or 'AUDIO'" }),
  }),
  content: z
    .string()
    .min(1, { message: "Content cannot be empty" })
    .optional(),
});

export type CreateInboxItemInput = z.infer<typeof CreateInboxItemDto>;
