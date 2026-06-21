import { z } from "zod";

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be less than 2000 characters")
    .trim(),
  parentId: z.string().uuid("Invalid parent comment ID").optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
