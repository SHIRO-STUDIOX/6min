"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { resumePath } from "@/lib/client/resume-path";
import { loadLearner } from "@/lib/client/learner";
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    void loadLearner()
      .then((model) => router.replace(resumePath(model.progress)))
      .catch(() => router.replace("/auth?returnTo=/classroom"));
  }, [router]);
  return <p role="status">در حال بازیابی کلاس…</p>;
}
