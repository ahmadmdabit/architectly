// interview/controller.ts — All interview-related actions. Pure orchestration.
import { batch } from "../../core/signal.ts";
import {
  allQuestions,
  answers,
  busyLabel,
  assumptionReview,
  currentQuestion,
  docType as docTypeSig,
  history,
  historyCursor,
  isBusy,
  pendingFollowUps,
} from "../../core/store.ts";
import { bus } from "../../core/eventBus.ts";
import { currentLocale, t } from "../../i18n/index.ts";
import type { AnswerValue, HistoryEntry, Question } from "../../types.ts";
import { fallbackTitleFromVision, getNextQuestion } from "./engine.ts";
import { getQuestionsForType } from "./questions.ts";
import { deriveProjectTitle, generateAssumption } from "../ai/puter.ts";

let abortCtrl: AbortController | null = null;
function newSignal(): AbortSignal {
  abortCtrl?.abort();
  abortCtrl = new AbortController();
  return abortCtrl.signal;
}
bus.on("abortInflight", () => abortCtrl?.abort());

export function startInterview(type: "PRD" | "BRD"): void {
  const qs = getQuestionsForType(type);
  batch(() => {
    docTypeSig.set(type);
    answers.set({ docType: type });
    history.set([]);
    pendingFollowUps.set([]);
    allQuestions.set(qs);
    currentQuestion.set(qs[0] ?? null);
  });
}

async function deriveTitleQuestion(vision: string): Promise<Question> {
  const signal = newSignal();
  let suggested = "Untitled Project";
  if (vision.trim()) {
    try {
      suggested = await Promise.race([
        deriveProjectTitle(vision, currentLocale(), signal),
        new Promise<string>((r) => setTimeout(() => r(fallbackTitleFromVision(vision)), 4000)),
      ]);
    } catch {
      suggested = fallbackTitleFromVision(vision);
    }
  }
  return {
    id: "title",
    category: "Core",
    priority: "high",
    type: "text",
    text: t("interview.title.withSuggestion"),
    helper: t("interview.title.withSuggestionHelp"),
    placeholder: t("interview.title.placeholder"),
    suggestedValue: suggested,
  };
}

/** Advance to the next question, expanding `__derive_title__` placeholders via AI. */
export async function advanceQuestion(): Promise<void> {
  const pending = [...pendingFollowUps.peek()];
  let next = getNextQuestion(history.peek(), pending, allQuestions.peek());

  if (next && next.id === "__derive_title__") {
    pendingFollowUps.set(pending.slice(1)); // consume the placeholder
    isBusy.set(true);
    busyLabel.set(t("interview.suggestingName"));
    try {
      next = await deriveTitleQuestion(String(answers.peek()["vision"] ?? ""));
    } finally {
      isBusy.set(false);
      busyLabel.set("");
    }
  } else if (next && next === pending[0]) {
    pendingFollowUps.set(pending.slice(1));
  }

  currentQuestion.set(next);
}

function pushAnswer(q: Question, value: AnswerValue, extras: Partial<{ assumed: boolean; skipped: boolean; assumeError: boolean }> = {}): void {
  history.set([...history.peek(), { id: q.id, text: q.text, answer: value, type: q.type, category: q.category, ...extras }]);
  answers.set({ ...answers.peek(), [q.id]: value });
}

export async function answerCurrent(value: AnswerValue): Promise<void> {
  const q = currentQuestion.peek();
  if (!q || isBusy.peek()) return;
  const wasAssumptionReview = assumptionReview.peek();
  const isMulti = q.type === "multi-text";
  const normalized: AnswerValue = isMulti
    ? (Array.isArray(value) ? value : [String(value)]).map((v) => v.trim()).filter(Boolean)
    : typeof value === "string"
      ? value.trim()
      : "";
  if (isMulti && (normalized as string[]).length === 0) return;
  if (!isMulti && !normalized) return;

  // Cursor mode: we are editing/reviewing an already-answered question.
  const cursor = historyCursor.peek();
  if (cursor !== null) {
    const hist = [...history.peek()];
    const entry = hist[cursor];
    if (!entry) return;
    hist[cursor] = {
      ...entry,
      answer: normalized,
      assumed: wasAssumptionReview ? true : entry.assumed,
      skipped: false,
      assumeError: false,
    };
    history.set(hist);
    answers.set({ ...answers.peek(), [q.id]: normalized });
    assumptionReview.set(false);
    if (cursor >= hist.length - 1) {
      historyCursor.set(null);
      isBusy.set(true);
      busyLabel.set(t("interview.preparingNext"));
      try { await advanceQuestion(); } finally { isBusy.set(false); busyLabel.set(""); }
    } else {
      historyCursor.set(cursor + 1);
      const next = hist[cursor + 1];
      if (next) loadQuestionFromHistory(next);
    }
    return;
  }

  pushAnswer(q, normalized, wasAssumptionReview ? { assumed: true } : {});
  assumptionReview.set(false);
  const followUps = q.followUp ? q.followUp(normalized, answers.peek()) : [];
  pendingFollowUps.set(followUps);

  isBusy.set(true);
  busyLabel.set(t("interview.preparingNext"));
  try {
    await advanceQuestion();
  } finally {
    isBusy.set(false);
    busyLabel.set("");
  }
}

export async function skipCurrent(): Promise<void> {
  const q = currentQuestion.peek();
  if (!q || isBusy.peek()) return;
  const type = docTypeSig.peek();
  if (!type) return;

  isBusy.set(true);
  busyLabel.set(t("interview.generatingAssumption"));
  const signal = newSignal();
  try {
    const assumption = await generateAssumption(q, history.peek(), type, currentLocale(), signal);
    // Don't auto-advance: show the generated assumption for user review.
    const text = assumption || "(skipped — no assumption generated)";
    currentQuestion.set({
      ...q,
      suggestedValue: text,
    });
    assumptionReview.set(true);
  } catch (err) {
    const msg = (err as Error)?.message ?? "AI unavailable";
    pushAnswer(q, `(skipped — ${msg})`, { skipped: true, assumeError: true });
    bus.emit("toast", { kind: "error", message: t("errors.assumeFailed", { title: q.text.slice(0, 40) }) });
    pendingFollowUps.set([]);
    isBusy.set(false);
    busyLabel.set("");
    try { await advanceQuestion(); } catch { /* ignore */ }
    return;
  }
  isBusy.set(false);
  busyLabel.set("");
}

function loadQuestionFromHistory(entry: HistoryEntry): void {
  const q = allQuestions.peek().find((x) => x.id === entry.id);
  if (!q) return;
  const suggested = Array.isArray(entry.answer) ? entry.answer.join("\n") : String(entry.answer ?? "");
  currentQuestion.set({ ...q, suggestedValue: suggested });
}

/** Move to the previous answered question WITHOUT deleting answers. */
export function goPrevious(): void {
  const hist = history.peek();
  if (hist.length === 0) return;
  const cur = historyCursor.peek();
  const nextIdx = cur === null ? hist.length - 1 : Math.max(0, cur - 1);
  historyCursor.set(nextIdx);
  loadQuestionFromHistory(hist[nextIdx]!);
  assumptionReview.set(false);
}

/** Move to the next answered question (or back to the current unanswered position). */
export async function goNext(): Promise<void> {
  const hist = history.peek();
  const cur = historyCursor.peek();
  if (cur === null) return;
  assumptionReview.set(false);
  if (cur >= hist.length - 1) {
    historyCursor.set(null);
    pendingFollowUps.set([]);
    isBusy.set(true);
    busyLabel.set(t("interview.preparingNext"));
    try { await advanceQuestion(); } finally { isBusy.set(false); busyLabel.set(""); }
  } else {
    const nextIdx = cur + 1;
    historyCursor.set(nextIdx);
    loadQuestionFromHistory(hist[nextIdx]!);
  }
}

/** Jump to a specific answered question (non-destructive). */
export function jumpToAnswered(id: string): void {
  const all = history.peek();
  const idx = all.findIndex((h) => h.id === id);
  if (idx === -1) return;
  historyCursor.set(idx);
  assumptionReview.set(false);
  loadQuestionFromHistory(all[idx]!);
}

/** Pre-populate state from a sample fixture and skip to the "complete" review screen. */
export function loadSample(type: "PRD" | "BRD", sample: Record<string, AnswerValue | undefined>): void {
  const qs = getQuestionsForType(type);
  const hist = Object.entries(sample)
    .filter(([k, v]) => k !== "title" && k !== "docType" && v !== undefined)
    .map(([id, answer]) => {
      const a = answer as AnswerValue;
      const q = qs.find((x) => x.id === id);
      const type: Question["type"] = Array.isArray(a)
        ? "multi-text"
        : typeof a === "string" && a.length > 80
          ? "long"
          : "text";
      return { id, text: q?.text ?? id, answer: a, type, category: q?.category ?? "Sample" };
    });
  const title = (sample["title"] as string) ?? "Untitled Project";
  batch(() => {
    docTypeSig.set(type);
    allQuestions.set(qs);
    answers.set({ docType: type, ...sample, title });
    history.set([{ id: "title", text: "Project name", answer: title, type: "text", category: "Core" }, ...hist]);
    pendingFollowUps.set([]);
    currentQuestion.set(null);
  });
}