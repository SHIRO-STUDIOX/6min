// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useVocabularyFsm } from "../../hooks/use-vocabulary-fsm";
import {
  vocabularyCompletion,
  vocabularyPairs,
} from "../../lib/client/exercise-adapter";
import type { PublicStage } from "../../lib/contracts/content";

afterEach(() => vi.useRealTimers());
it("preserves the default local Sandbox matching callback", () => {
  vi.useFakeTimers();
  const pairs = [{ id: "one", source: { id: "s", text: "Hallo" }, target: { id: "t", text: "سلام" } }];
  const complete = vi.fn();
  const { result } = renderHook(() => useVocabularyFsm({ pairs, autoShuffleTarget: false, successFeedbackMs: 1, onComplete: complete }));
  act(() => result.current.selectItem("source", "s"));
  act(() => result.current.selectItem("target", "t"));
  act(() => vi.runOnlyPendingTimers());
  expect(complete).toHaveBeenCalledWith(expect.objectContaining({ accuracyPercentage: 100, matchedCount: 1 }));
});
it("adapts public German fixture to existing FSM and records wrong choices without fake grading", () => {
  vi.useFakeTimers();
  const options = [
    { id: "a", text: "سلام" },
    { id: "b", text: "خداحافظ" },
  ];
  const stage: PublicStage = {
    id: "de-01-1",
    order: 1,
    kind: "exercise",
    exerciseKind: "vocabulary-match",
    activityLocked: false,
    questions: [
      { id: "q1", revision: 1, prompt: "Hallo", options },
      { id: "q2", revision: 1, prompt: "Tschüss", options },
    ],
  };
  const pairs = vocabularyPairs(stage);
  const localGrade = vi.fn();
  const completed = vi.fn();
  const { result } = renderHook(() =>
    useVocabularyFsm({
      pairs,
      autoShuffleTarget: false,
      evaluationMode: "deferred",
      successFeedbackMs: 1,
      onComplete: localGrade,
      onDeferredComplete: completed,
    }),
  );
  act(() => result.current.selectItem("source", "q1"));
  act(() => result.current.selectItem("target", "b"));
  expect(result.current.cardState).toBe("ANSWER_RECORDED");
  act(() => vi.runOnlyPendingTimers());
  act(() => result.current.selectItem("source", "q2"));
  act(() => result.current.selectItem("target", "a"));
  act(() => vi.runOnlyPendingTimers());
  expect(localGrade).not.toHaveBeenCalled();
  expect(completed).toHaveBeenCalledTimes(1);
  const input = vocabularyCompletion(
    "de-01",
    "de-01-v1",
    stage,
    completed.mock.calls[0][0],
  );
  expect(input.answers.map((answer) => answer.response)).toEqual([
    { choiceId: "b" },
    { choiceId: "a" },
  ]);
  act(() => result.current.reset());
  expect(result.current.deferredAnswers).toEqual([]);
});
