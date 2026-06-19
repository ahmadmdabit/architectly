// store.ts — Typed signals for the entire app. All UI subscribes here.
import { signal, batch } from "./signal.ts";
import type {
  AnswerMap,
  DocMeta,
  DocType,
  HistoryEntry,
  Locale,
  Question,
  RefineTarget,
  SavedDocument,
  Step,
} from "../types.ts";

// --- Step / routing ---
export const step = signal<Step>("welcome");

// --- Interview ---
export const docType = signal<DocType | null>(null);
export const answers = signal<AnswerMap>({});
export const history = signal<HistoryEntry[]>([]);
export const allQuestions = signal<readonly Question[]>([]);
export const currentQuestion = signal<Question | null>(null);
export const pendingFollowUps = signal<Question[]>([]);
export const showStepDots = signal<boolean>(true);
// Cursor-based history navigation (Previous/Next) — null means we're at the "next unanswered" position.
export const historyCursor = signal<number | null>(null);
export const assumptionReview = signal<boolean>(false);

// --- Document ---
export const documentText = signal<string>("");
export const documentMeta = signal<DocMeta | null>(null);
export const showRaw = signal<boolean>(false);

// --- Generating (live AI stream) ---
export const streamBuffer = signal<string>("");

// --- Refine modal ---
export const refineTarget = signal<RefineTarget | null>(null);
export const refineDraft = signal<string>("");

// --- Inline edit per section ---
export const editingHeading = signal<string | null>(null);

// --- UX ---
export const isBusy = signal<boolean>(false);
export const busyLabel = signal<string>("");
export const error = signal<string | null>(null);

// --- Library (IndexedDB sourced) ---
export const library = signal<SavedDocument[]>([]);
export const librarySearch = signal<string>("");

// --- i18n ---
export const locale = signal<Locale>("en");

/** One-shot reset to a clean welcome state, used by Start Over. */
export function resetAll(): void {
  batch(() => {
    step.set("welcome");
    docType.set(null);
    answers.set({});
    history.set([]);
    allQuestions.set([]);
    currentQuestion.set(null);
    pendingFollowUps.set([]);
    historyCursor.set(null);
    assumptionReview.set(false);
    documentText.set("");
    documentMeta.set(null);
    streamBuffer.set("");
    refineTarget.set(null);
    refineDraft.set("");
    editingHeading.set(null);
    isBusy.set(false);
    busyLabel.set("");
    error.set(null);
  });
}
