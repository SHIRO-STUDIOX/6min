type Answer = { choiceId: string } | { tokenIds: string[] } | { text: string };
const normalize = (value: string) =>
  value.normalize("NFC").trim().replace(/\s+/g, " ");

export function gradeAnswer(
  kind: string,
  response: Answer,
  key: unknown,
): boolean {
  const expected = key as {
    choiceId?: string;
    tokenIds?: string[];
    accepted?: string[];
  };
  if (kind === "vocabulary-match")
    return "choiceId" in response && response.choiceId === expected.choiceId;
  if (kind === "grammar-order")
    return (
      "tokenIds" in response &&
      JSON.stringify(response.tokenIds) === JSON.stringify(expected.tokenIds)
    );
  if (kind === "dictation")
    return (
      "text" in response &&
      Boolean(
        expected.accepted?.some(
          (text) => normalize(text) === normalize(response.text),
        ),
      )
    );
  throw new Error("GRADING_UNAVAILABLE");
}
