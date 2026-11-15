import { z } from "zod";

export const answerSchema = z
  .object({
    questionId: z.string().min(1).max(120),
    revision: z.number().int().positive(),
    response: z.union([
      z.object({ choiceId: z.string().min(1).max(120) }).strict(),
      z
        .object({ tokenIds: z.array(z.string().max(120)).min(1).max(100) })
        .strict(),
      z.object({ text: z.string().max(2000) }).strict(),
    ]),
  })
  .strict();
export const attemptSchema = z
  .object({
    lessonId: z.string().min(1).max(120),
    revisionId: z.string().min(1).max(120),
    stageId: z.string().min(1).max(120),
    kind: z.literal("full"),
    completed: z.literal(true),
    answers: z.array(answerSchema).min(1).max(64),
  })
  .strict();
export type FullAttemptInput = z.infer<typeof attemptSchema>;
