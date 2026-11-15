"use client";
import { useEffect, useState, useCallback } from "react";
import { loadLearner } from "@/lib/client/learner";
import type { Learner } from "@/lib/contracts/experience";
export function useLearner() {
  const [model, setModel] = useState<Learner | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      setModel(await loadLearner());
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "REQUEST_FAILED");
    }
  }, []);
  useEffect(() => {
    void reload();
  }, [reload]);
  return { model, error, reload };
}
