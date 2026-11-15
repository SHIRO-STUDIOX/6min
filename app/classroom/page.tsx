"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { loadLearner } from "@/lib/client/learner";
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    void loadLearner()
      .then((model) =>
        router.replace(
          `/classroom/${encodeURIComponent(model.progress.lastActivity?.lesson_id ?? model.progress.currentLesson)}`,
        ),
      )
      .catch(() => router.replace("/auth?returnTo=/classroom"));
  }, [router]);
  return <p role="status">در حال بازیابی کلاس…</p>;
}
