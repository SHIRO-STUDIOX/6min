// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { useGrammarFsm } from "../../hooks/use-grammar-fsm";

afterEach(() => vi.useRealTimers());
it("records unordered public token choices without local correctness and restores drafts", () => {
  vi.useFakeTimers();
  const sentences = [
    {
      id: "q",
      targetSentence: "",
      tokens: ["Morgen", "Guten"],
      publicTokens: [
        { id: "b", text: "Morgen" },
        { id: "a", text: "Guten" },
      ],
    },
  ];
  const graded = vi.fn();
  const { result } = renderHook(() =>
    useGrammarFsm({
      sentences,
      evaluationMode: "deferred",
      autoShuffleBank: false,
      autoPlayAudioOnSuccess: false,
      successFeedbackMs: 1,
      onComplete: graded,
    }),
  );
  act(() => result.current.selectBankToken(result.current.allBankTokens[0]));
  act(() => result.current.selectBankToken(result.current.allBankTokens[1]));
  act(() => result.current.checkSentence());
  expect(result.current.cardState).toBe("ANSWER_RECORDED");
  act(() => vi.runOnlyPendingTimers());
  expect(result.current.deferredAnswers).toEqual({ q: ["b", "a"] });
  expect(graded).not.toHaveBeenCalled();
  act(() => result.current.resetAll());
  act(() =>
    result.current.restoreDeferred({
      answers: { q: ["a", "b"] },
      currentIndex: 0,
      selectedTokenIds: [],
    }),
  );
  expect(result.current.isCompleted).toBe(true);
});
it("keeps default Sandbox local sentence assessment intact", () => {
  vi.useFakeTimers();
  const sentences = [
    { id: "q", targetSentence: "Guten Morgen", tokens: ["Guten", "Morgen"] },
  ];
  const graded = vi.fn();
  const { result } = renderHook(() =>
    useGrammarFsm({
      sentences,
      autoShuffleBank: false,
      autoPlayAudioOnSuccess: false,
      successFeedbackMs: 1,
      onComplete: graded,
    }),
  );
  act(() => result.current.selectBankToken(result.current.allBankTokens[0]));
  act(() => result.current.selectBankToken(result.current.allBankTokens[1]));
  act(() => result.current.checkSentence());
  act(() => vi.runOnlyPendingTimers());
  expect(graded).toHaveBeenCalledWith(
    expect.objectContaining({ accuracyPercentage: 100 }),
  );
});
