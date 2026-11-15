import { expect, it } from "vitest";
import { gradeAnswer } from "../../lib/domain/learning/grading";
import { attemptSchema } from "../../lib/contracts/attempt";

it("grades matching, ordered token identities and normalized German text", () => {
  expect(
    gradeAnswer("vocabulary-match", { choiceId: "a" }, { choiceId: "a" }),
  ).toBe(true);
  expect(
    gradeAnswer("vocabulary-match", { choiceId: "b" }, { choiceId: "a" }),
  ).toBe(false);
  expect(
    gradeAnswer(
      "grammar-order",
      { tokenIds: ["1", "2"] },
      { tokenIds: ["2", "1"] },
    ),
  ).toBe(false);
  expect(
    gradeAnswer(
      "grammar-order",
      { tokenIds: ["2", "1"] },
      { tokenIds: ["2", "1"] },
    ),
  ).toBe(true);
  expect(
    gradeAnswer(
      "dictation",
      { text: "  Gru\u0308ße   Anna " },
      { accepted: ["Grüße Anna"] },
    ),
  ).toBe(true);
  expect(
    gradeAnswer(
      "dictation",
      { text: "Grusse Anna" },
      { accepted: ["Grüße Anna"] },
    ),
  ).toBe(false);
});
it("never invents pronunciation credit", () => {
  expect(() => gradeAnswer("pronunciation", { text: "Hallo" }, {})).toThrow(
    "GRADING_UNAVAILABLE",
  );
});
it("rejects client-computed grade and partial attempts", () => {
  const input = {
    lessonId: "de-01",
    revisionId: "de-01-v1",
    stageId: "de-01-1",
    kind: "full",
    completed: true,
    answers: [{ questionId: "q", revision: 1, response: { choiceId: "a" } }],
  };
  expect(attemptSchema.safeParse({ ...input, score: 1 }).success).toBe(false);
  expect(attemptSchema.safeParse({ ...input, completed: false }).success).toBe(
    false,
  );
});
