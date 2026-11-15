"use client";

import { Button, TextField, Label, InputGroup } from "@heroui/react";
import type { PublicQuestion } from "@/lib/contracts/content";

export type RawResponse =
  | { choiceId: string }
  | { tokenIds: string[] }
  | { text: string };
export function QuestionRenderer({
  question,
  kind,
  response,
  onResponse,
  disabled = false,
}: {
  question: PublicQuestion;
  kind: string;
  response: RawResponse | null;
  onResponse: (value: RawResponse) => void;
  disabled?: boolean;
}) {
  const tokenIds = response && "tokenIds" in response ? response.tokenIds : [];
  return (
    <div className="flex flex-col gap-3" data-question-id={question.id}>
      <p lang="de" dir="ltr" className="text-start font-semibold">
        {question.prompt}
      </p>
      {kind === "vocabulary-match" ? (
        <div className="flex flex-wrap gap-2">
          {question.options.map((option) => (
            <Button
              key={option.id}
              isDisabled={disabled}
              variant={
                response &&
                "choiceId" in response &&
                response.choiceId === option.id
                  ? "primary"
                  : "secondary"
              }
              onPress={() => onResponse({ choiceId: option.id })}
            >
              {option.text}
            </Button>
          ))}
        </div>
      ) : kind === "grammar-order" ? (
        <>
          <div
            className="flex flex-wrap gap-2 min-h-12"
            dir="ltr"
            aria-label="ترتیب انتخاب‌شده"
          >
            {tokenIds.map((id) => (
              <Button
                key={id}
                size="sm"
                isDisabled={disabled}
                aria-label={`حذف ${question.options.find((option) => option.id === id)?.text ?? id}`}
                onPress={() =>
                  onResponse({
                    tokenIds: tokenIds.filter((token) => token !== id),
                  })
                }
              >
                {question.options.find((option) => option.id === id)?.text}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2" dir="ltr">
            {question.options
              .filter((option) => !tokenIds.includes(option.id))
              .map((option) => (
                <Button
                  key={option.id}
                  size="sm"
                  variant="secondary"
                  isDisabled={disabled}
                  onPress={() =>
                    onResponse({ tokenIds: [...tokenIds, option.id] })
                  }
                >
                  {option.text}
                </Button>
              ))}
          </div>
        </>
      ) : kind === "dictation" ? (
        <TextField
          value={response && "text" in response ? response.text : ""}
          onChange={(text) => onResponse({ text })}
          isDisabled={disabled}
        >
          <Label>پاسخ</Label>
          <InputGroup>
            <InputGroup.Input
              dir="ltr"
              lang="de"
              autoComplete="off"
              spellCheck={false}
            />
          </InputGroup>
        </TextField>
      ) : (
        <p>ارزیابی معتبر این تمرین در دسترس نیست؛ امتیازی ثبت نمی‌شود.</p>
      )}
    </div>
  );
}
