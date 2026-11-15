import { z } from "zod";

export const publicQuestionSchema = z
  .object({
    prompt: z.string().min(1),
    options: z
      .array(z.object({ id: z.string(), text: z.string() }).strict())
      .min(1),
  })
  .strict();

export type PublicQuestion = z.infer<typeof publicQuestionSchema> & {
  id: string;
  revision: number;
};
export type PublicStage = {
  id: string;
  order: number;
  kind: "video" | "exercise";
  exerciseKind: string | null;
  activityLocked: boolean;
  questions: PublicQuestion[];
};

export function demoContentAllowed() {
  return (
    process.env.SHISH_DEMO_MODE === "1" &&
    (process.env.SHISH_ENV === "development" ||
      process.env.SHISH_ENV === "test")
  );
}
