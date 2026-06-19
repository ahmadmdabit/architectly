// engine.ts — Pure functions over Question[] + HistoryEntry[].
import type { AnswerMap, DocSummary, DocType, HistoryEntry, Question } from "../../types.ts";

export function getNextQuestion(
  history: readonly HistoryEntry[],
  pendingFollowUps: readonly Question[],
  allQuestions: readonly Question[],
): Question | null {
  if (pendingFollowUps.length > 0) return pendingFollowUps[0] ?? null;
  const answered = new Set(history.map((h) => h.id));
  for (const q of allQuestions) {
    if (!answered.has(q.id)) return q;
  }
  return null;
}

export function isInterviewComplete(
  history: readonly HistoryEntry[],
  allQuestions: readonly Question[],
): boolean {
  if (allQuestions.length === 0) return false;
  const required = allQuestions.filter((q) => q.priority === "high");
  const answered = new Set(history.map((h) => h.id));
  return required.every((q) => answered.has(q.id));
}

export function summarizeAnswers(history: readonly HistoryEntry[], docType: DocType): DocSummary {
  const map: AnswerMap = Object.fromEntries(history.map((h) => [h.id, h.answer]));
  const get = (k: string): string | string[] => map[k] ?? "";
  return {
    docType,
    title: typeof get("title") === "string" ? (get("title") as string) || "Untitled Project" : "Untitled Project",
    vision: get("vision"),
    problemStatement: get("problemStatement"),
    successMetrics: get("successMetrics"),
    stakeholders: get("stakeholders"),
    constraints: get("constraints"),
    timeline: get("timeline"),
    additionalContext: get("additionalContext"),
    userPersonas: get("userPersonas"),
    userStories: get("userStories"),
    functionalRequirements: get("functionalRequirements"),
    nonFunctionalRequirements: get("nonFunctionalRequirements"),
    designGuidelines: get("designGuidelines"),
    technicalConstraints: get("technicalConstraints"),
    releaseCriteria: get("releaseCriteria"),
    businessObjectives: get("businessObjectives"),
    targetAudience: get("targetAudience"),
    keyFeatures: get("keyFeatures"),
    budget: get("budget"),
  };
}

const StopWords = new Set([
  "we", "are", "building", "create", "making", "a", "an", "the", "for", "to", "of", "and", "with",
  "that", "this", "is", "it", "in", "on", "our", "their", "they", "users", "user", "customers",
  "customer", "people", "teams", "team", "so", "can", "be", "have", "has", "do", "does", "from",
  "by", "or", "as", "at", "which", "who", "what", "when", "where", "how", "why",
]);

/** Local, offline fallback when AI title derivation is unavailable. */
export function fallbackTitleFromVision(vision: string): string {
  const words = vision
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w && !StopWords.has(w.toLowerCase()) && w.length > 2);
  if (words.length === 0) return "Untitled Project";
  return words
    .slice(0, 3)
    .map((w) => w.charAt(0).toLocaleUpperCase() + w.slice(1).toLocaleLowerCase())
    .join(" ");
}
