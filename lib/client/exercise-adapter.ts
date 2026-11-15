import type { PublicStage } from "../contracts/content";
import { attemptSchema, type FullAttemptInput } from "../contracts/attempt";
import type {
  VocabularyPair,
  VocabularySelection,
} from "../../hooks/use-vocabulary-fsm";

/** Public option ordering is arbitrary, never a correctness association. Use deferred FSM mode. */
export function vocabularyPairs(stage: PublicStage): VocabularyPair[] {
  if (stage.exerciseKind !== "vocabulary-match")
    throw new Error("Unsupported vocabulary stage");
  const options = stage.questions[0]?.options ?? [];
  if (
    options.length !== stage.questions.length ||
    stage.questions.some(
      (question) =>
        JSON.stringify(question.options) !== JSON.stringify(options),
    )
  )
    throw new Error("Matching options must form one shared set");
  return stage.questions.map((question, index) => ({
    id: question.id,
    source: { id: question.id, text: question.prompt },
    target: { id: options[index].id, text: options[index].text },
  }));
}

export function vocabularyCompletion(
  lessonId: string,
  revisionId: string,
  stage: PublicStage,
  selections: VocabularySelection[],
): FullAttemptInput {
  return attemptSchema.parse({
    lessonId,
    revisionId,
    stageId: stage.id,
    kind: "full",
    completed: true,
    answers: selections.map((selection) => ({
      questionId: selection.sourceId,
      revision: stage.questions.find(
        (question) => question.id === selection.sourceId,
      )?.revision,
      response: { choiceId: selection.targetId },
    })),
  });
}

/** Other existing FSMs feed raw responses, never accuracyPercentage as a grade. */
export function fullCompletion(
  lessonId: string,
  revisionId: string,
  stage: PublicStage,
  responses: Record<string, { tokenIds: string[] } | { text: string }>,
): FullAttemptInput {
  if (stage.exerciseKind === "pronunciation")
    throw new Error(
      "Pronunciation grading unavailable: no trusted evaluator configured",
    );
  return attemptSchema.parse({
    lessonId,
    revisionId,
    stageId: stage.id,
    kind: "full",
    completed: true,
    answers: stage.questions.map((question) => ({
      questionId: question.id,
      revision: question.revision,
      response: responses[question.id],
    })),
  });
}
