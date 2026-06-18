// actions.ts — Top-level orchestration: generate, refine, save, export.
import { batch } from "./core/signal.ts";
import {
  busyLabel,
  docType as docTypeSig,
  documentMeta,
  documentText,
  error,
  history,
  isBusy,
  library,
  refineDraft,
  refineTarget,
  step,
  streamBuffer,
  answers,
  allQuestions,
  currentQuestion,
  pendingFollowUps,
  editingHeading,
  resetAll,
} from "./core/store.ts";
import { bus } from "./core/eventBus.ts";
import { navigate } from "./router/pathRouter.ts";
import { currentLocale, t } from "./i18n/index.ts";
import { generateDocumentStream, refineDocumentSection } from "./services/ai/puter.ts";
import { summarizeAnswers } from "./services/interview/engine.ts";
import { generateFallbackDocument } from "./services/markdown/fallback.ts";
import { extractSection, replaceSection } from "./services/markdown/sections.ts";
import { exportMarkdownFile } from "./services/export/markdown.ts";
import { exportHtmlFile } from "./services/export/html.ts";
import { copyToClipboard } from "./services/export/clipboard.ts";
import { printCurrent } from "./services/export/print.ts";
import { dirOf } from "./i18n/index.ts";
import { getById, listAll, newId, remove, rename, upsert } from "./services/storage/library.ts";
import { getQuestionsForType } from "./services/interview/questions.ts";
import type { SavedDocument } from "./types.ts";

let abortCtrl: AbortController | null = null;
function newSignal(): AbortSignal {
  abortCtrl?.abort();
  abortCtrl = new AbortController();
  return abortCtrl.signal;
}
bus.on("abortInflight", () => abortCtrl?.abort());

// --- Generation ---

export async function generateDocument(): Promise<void> {
  if (isBusy.peek()) return;
  const type = docTypeSig.peek();
  if (!type) return;

  navigate("generating");
  batch(() => {
    isBusy.set(true);
    busyLabel.set(t("generating.title"));
    error.set(null);
    streamBuffer.set("");
  });

  const summary = summarizeAnswers(history.peek(), type);
  const signal = newSignal();
  try {
    const full = await generateDocumentStream(type, summary, history.peek(), currentLocale(), {
      onDelta: (chunk) => streamBuffer.set(streamBuffer.peek() + chunk),
      signal,
    });
    batch(() => {
      documentText.set(full);
      documentMeta.set({ generatedAt: new Date().toISOString(), summary });
    });
    // Let the browser paint the final streamed frame before swapping views.
    await new Promise((r) => setTimeout(r, 250));
    navigate("result");
  } catch (e) {
    if ((e as Error).name === "AbortError") {
      bus.emit("toast", { kind: "info", message: t("toast.cancelled") });
      navigate("interview");
      return;
    }
    const fallback = generateFallbackDocument(summary, history.peek(), type);
    batch(() => {
      documentText.set(fallback);
      documentMeta.set({ generatedAt: new Date().toISOString(), summary });
      error.set(t("errors.aiUnavailable", { detail: (e as Error)?.message ?? "" }));
    });
    navigate("result");
  } finally {
    batch(() => {
      isBusy.set(false);
      busyLabel.set("");
    });
  }
}

export function cancelGeneration(): void {
  abortCtrl?.abort();
}

// --- Refinement ---

export function beginRefine(heading: string): void {
  const original = extractSection(documentText.peek(), heading);
  batch(() => {
    refineTarget.set({ heading, originalContent: original });
    refineDraft.set("");
  });
}

export function cancelRefine(): void {
  batch(() => {
    refineTarget.set(null);
    refineDraft.set("");
  });
}

export function setRefineDraft(text: string): void {
  refineDraft.set(text);
}

export async function applyRefinement(): Promise<void> {
  const target = refineTarget.peek();
  if (!target || isBusy.peek()) return;
  const type = docTypeSig.peek();
  if (!type) return;
  isBusy.set(true);
  busyLabel.set(t("result.refineModal.applying"));
  error.set(null);
  const signal = newSignal();
  try {
    const replacement = await refineDocumentSection(type, target.heading, target.originalContent, refineDraft.peek().trim(), currentLocale(), signal);
    documentText.set(replaceSection(documentText.peek(), target.heading, replacement));
    cancelRefine();
  } catch (e) {
    error.set((e as Error)?.message ?? t("errors.refineFailed"));
  } finally {
    isBusy.set(false);
    busyLabel.set("");
  }
}

/** Save the manually edited section (no AI). */
export function applyManualEdit(newSectionMd: string): void {
  const target = refineTarget.peek();
  if (!target) return;
  documentText.set(replaceSection(documentText.peek(), target.heading, newSectionMd));
  cancelRefine();
}

// --- Inline edit per section ---

export function beginInlineEdit(heading: string): void {
  editingHeading.set(heading);
}
export function endInlineEdit(): void {
  editingHeading.set(null);
}
export function commitInlineEdit(heading: string, newMd: string): void {
  documentText.set(replaceSection(documentText.peek(), heading, newMd));
  editingHeading.set(null);
}

// --- Exports ---

function currentTitle(): string {
  return documentMeta.peek()?.summary.title ?? "document";
}
function currentDocType(): string {
  return docTypeSig.peek() ?? "Document";
}

export async function exportMd(): Promise<void> {
  try {
    exportMarkdownFile(currentTitle(), documentText.peek());
    bus.emit("toast", { kind: "success", message: t("toast.downloadedMd") });
  } catch {
    bus.emit("toast", { kind: "error", message: t("toast.exportFailed") });
  }
  await Promise.resolve();
}

export async function exportHtml(): Promise<void> {
  try {
    const meta = documentMeta.peek();
    const date = meta ? new Date(meta.generatedAt).toLocaleString() : new Date().toLocaleString();
    const lang = currentLocale();
    exportHtmlFile(currentTitle(), currentDocType(), documentText.peek(), date, dirOf(lang), lang);
    bus.emit("toast", { kind: "success", message: t("toast.downloadedHtml") });
  } catch {
    bus.emit("toast", { kind: "error", message: t("toast.exportFailed") });
  }
  await Promise.resolve();
}

export async function exportPdf(): Promise<void> {
  try {
    const { exportPdfFile } = await import("./services/export/pdf.ts");
    await exportPdfFile(currentTitle(), currentDocType(), documentText.peek());
    bus.emit("toast", { kind: "success", message: t("toast.downloadedPdf") });
  } catch {
    bus.emit("toast", { kind: "error", message: t("toast.exportFailed") });
  }
}

export async function exportDocx(): Promise<void> {
  try {
    const { exportDocxFile } = await import("./services/export/docx.ts");
    await exportDocxFile(currentTitle(), currentDocType(), documentText.peek());
    bus.emit("toast", { kind: "success", message: t("toast.downloadedDocx") });
  } catch {
    bus.emit("toast", { kind: "error", message: t("toast.exportFailed") });
  }
}

export async function copyDoc(): Promise<void> {
  try {
    await copyToClipboard(documentText.peek());
    bus.emit("toast", { kind: "success", message: t("toast.copied") });
  } catch {
    bus.emit("toast", { kind: "error", message: t("toast.copyFailed") });
  }
}

export function printDoc(): void {
  printCurrent();
}

// --- Library ---

export async function refreshLibrary(): Promise<void> {
  library.set(await listAll());
}

export async function saveCurrentToLibrary(): Promise<void> {
  const type = docTypeSig.peek();
  const meta = documentMeta.peek();
  if (!type || !meta) return;
  const doc: SavedDocument = {
    id: newId(),
    docType: type,
    title: meta.summary.title,
    document: documentText.peek(),
    documentMeta: meta,
    history: history.peek(),
    answers: answers.peek(),
    savedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await upsert(doc);
  await refreshLibrary();
  bus.emit("toast", { kind: "success", message: t("toast.savedLibrary") });
}

export async function deleteFromLibrary(id: string): Promise<void> {
  await remove(id);
  await refreshLibrary();
  bus.emit("toast", { kind: "info", message: t("toast.deletedLibrary") });
}

export async function renameInLibrary(id: string, title: string): Promise<void> {
  await rename(id, title);
  await refreshLibrary();
  bus.emit("toast", { kind: "success", message: t("toast.renamedLibrary") });
}

export async function openFromLibrary(id: string): Promise<void> {
  const doc = await getById(id);
  if (!doc) return;
  batch(() => {
    docTypeSig.set(doc.docType);
    documentText.set(doc.document);
    documentMeta.set(doc.documentMeta);
    history.set(doc.history);
    answers.set(doc.answers);
    allQuestions.set(getQuestionsForType(doc.docType));
    currentQuestion.set(null);
    pendingFollowUps.set([]);
  });
  navigate("result");
}

export async function resumeFromLibrary(id: string): Promise<void> {
  const doc = await getById(id);
  if (!doc) return;
  const qs = getQuestionsForType(doc.docType);
  batch(() => {
    docTypeSig.set(doc.docType);
    documentText.set("");
    documentMeta.set(null);
    history.set(doc.history);
    answers.set(doc.answers);
    allQuestions.set(qs);
    pendingFollowUps.set([]);
    const answered = new Set(doc.history.map((h) => h.id));
    const next = qs.find((q) => !answered.has(q.id)) ?? null;
    currentQuestion.set(next);
  });
  navigate("interview");
}

// --- Reset ---

export function startOver(): void {
  resetAll();
  navigate("welcome");
  step.set("welcome");
}
