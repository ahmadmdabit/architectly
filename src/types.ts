// types.ts — Shared types for the entire app.

export type DocType = "PRD" | "BRD";
export type Step = "welcome" | "interview" | "generating" | "result" | "library";
export type Locale = "en" | "tr" | "ar";
export type Direction = "ltr" | "rtl";
export type QuestionType = "text" | "long" | "multi-text" | "choice";
export type Priority = "high" | "medium" | "low";

export interface ChoiceOption {
  value: string;
  label: string;
  icon?: string;
  desc?: string;
}

export interface Question {
  id: string;
  category: string;
  priority: Priority;
  type: QuestionType;
  text: string;
  helper?: string;
  placeholder?: string;
  options?: ReadonlyArray<string | ChoiceOption>;
  suggestedValue?: string;
  dynamic?: boolean;
  followUp?: (answer: AnswerValue, all: AnswerMap) => Question[];
}

export type AnswerValue = string | string[];
export type AnswerMap = Record<string, AnswerValue | undefined> & { docType?: DocType };

export interface HistoryEntry {
  id: string;
  text: string;
  answer: AnswerValue;
  type: QuestionType;
  category: string;
  assumed?: boolean;
  skipped?: boolean;
  assumeError?: boolean;
}

export interface DocSummary {
  docType: DocType;
  title: string;
  vision: AnswerValue;
  problemStatement: AnswerValue;
  successMetrics: AnswerValue;
  stakeholders: AnswerValue;
  constraints: AnswerValue;
  timeline: AnswerValue;
  additionalContext: AnswerValue;
  userPersonas: AnswerValue;
  userStories: AnswerValue;
  functionalRequirements: AnswerValue;
  nonFunctionalRequirements: AnswerValue;
  designGuidelines: AnswerValue;
  technicalConstraints: AnswerValue;
  releaseCriteria: AnswerValue;
  businessObjectives: AnswerValue;
  targetAudience: AnswerValue;
  keyFeatures: AnswerValue;
  budget: AnswerValue;
}

export interface DocMeta {
  generatedAt: string;
  summary: DocSummary;
}

export interface SavedDocument {
  id: string;
  docType: DocType;
  title: string;
  document: string;
  documentMeta: DocMeta;
  history: HistoryEntry[];
  answers: AnswerMap;
  savedAt: string;
  updatedAt: string;
}

export interface SessionSnapshot {
  step: Step;
  docType: DocType | null;
  answers: AnswerMap;
  history: HistoryEntry[];
  currentQuestionId: string | null;
  document: string;
  documentMeta: DocMeta | null;
  draft: string;
}

export interface RefineTarget {
  heading: string;
  originalContent: string;
}

export type ToastKind = "info" | "success" | "error";
export interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}
