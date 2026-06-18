// selectors.ts — Derived state from the store. Pure, computed signals.
import { computed } from "./signal.ts";
import { allQuestions, currentQuestion, history } from "./store.ts";
import { isInterviewComplete } from "../services/interview/engine.ts";

/** Total questions estimate (+1 for derived title). */
export const totalEstimate = computed(() => allQuestions().length + 1);

/** Number of non-skipped, answered questions. */
export const answeredCount = computed(() => history().filter((h) => !h.skipped).length);

/** 0–100 progress. */
export const progressPercent = computed(() => {
  const total = totalEstimate();
  if (total === 0) return 0;
  return Math.min(100, Math.round((answeredCount() / total) * 100));
});

/** 1-based current step number. */
export const stepNumber = computed(() => answeredCount() + 1);

/** True when all high-priority questions are answered. */
export const interviewComplete = computed(() =>
  isInterviewComplete(history(), allQuestions()),
);

/** True when the user can finish (no current question and history non-empty). */
export const canFinish = computed(() => currentQuestion() === null && history().length > 0);
