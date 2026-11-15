"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@heroui/react";
import { AppFrame } from "./app-frame";
import { loadLearner } from "@/lib/client/learner";
import type { Learner } from "@/lib/contracts/experience";

export function Destination({
  destination,
}: {
  destination: "path" | "profile";
}) {
  const router = useRouter();
  const [model, setModel] = useState<Learner | null>(null);
  useEffect(() => {
    void loadLearner()
      .then(setModel)
      .catch(() => {});
  }, []);
  return (
    <AppFrame model={model}>
      <main className="p-6 flex flex-col items-center gap-4">
        <h1>{destination === "path" ? "مسیر من" : "پروفایل"}</h1>
        {model ? (
          <>
            <p>
              {model.kind === "user"
                ? model.user?.displayName || "حساب شما"
                : "مهمان"}
            </p>
            <p>
              درس فعلی:{" "}
              {model.progress.lessons.find(
                (lesson) => lesson.id === model.progress.currentLesson,
              )?.number ?? 1}{" "}
              از ۶۰
            </p>
            <Button
              onPress={() =>
                router.push(
                  `/classroom/${encodeURIComponent(model.progress.lastActivity?.lesson_id ?? model.progress.currentLesson)}`,
                )
              }
            >
              ادامه کلاس
            </Button>
            {model.kind === "guest" && (
              <Button variant="secondary" onPress={() => router.push("/auth")}>
                ایجاد حساب یا ورود
              </Button>
            )}
          </>
        ) : (
          <p role="status">در حال بارگذاری…</p>
        )}
      </main>
    </AppFrame>
  );
}
