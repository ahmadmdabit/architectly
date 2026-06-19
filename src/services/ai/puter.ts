// puter.ts — Thin, abort-aware wrapper around the global puter object loaded by
// <script src="https://js.puter.com/v2/"> in index.html. We intentionally do NOT
// import @heyputer/puter.js as a module because the CDN script ships its own
// runtime and the npm package is a re-export.
import type { DocSummary, DocType, HistoryEntry, Locale, Question } from "../../types.ts";
import {
  buildAssumePrompt,
  buildDeriveTitlePrompt,
  buildGenerationPrompt,
  buildRefinePrompt,
} from "./prompts.ts";
import { fallbackTitleFromVision } from "../interview/engine.ts";

const MODEL = "openai/gpt-oss-120b:free";
const AiTimeoutMs = 300000;

interface PuterAI {
  chat: (
    prompt: string,
    options: { model: string; stream?: boolean },
    legacyStream?: boolean,
  ) => Promise<unknown> | AsyncIterable<unknown>;
}
interface PuterGlobal {
  ai: PuterAI;
  quiet?: boolean;
}
declare global {
  interface Window {
    puter?: PuterGlobal;
  }
}

async function getPuter(): Promise<PuterGlobal> {
  // The CDN script attaches `window.puter` asynchronously. Poll briefly.
  for (let i = 0; i < 50; i++) {
    if (window.puter) {
      window.puter.quiet = true;
      return window.puter;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Puter.js failed to load. Check your network and CSP.");
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string, signal?: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    const onAbort = (): void => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    if (signal) {
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort, { once: true });
    }
    promise.then(
      (v) => {
        clearTimeout(t);
        signal?.removeEventListener("abort", onAbort);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        signal?.removeEventListener("abort", onAbort);
        reject(e);
      },
    );
  });
}

function extractText(response: unknown): string {
  if (response == null) throw new Error("Puter AI returned no response (network error).");
  if (typeof response === "string") return response;
  const r = response as Record<string, unknown>;
  const msg = r["message"] as { content?: unknown } | undefined;
  if (msg?.content) {
    const c = msg.content;
    if (typeof c === "string") return c;
    if (Array.isArray(c)) {
      return c
        .map((p) => (typeof p === "string" ? p : (p as { text?: string })?.text ?? ""))
        .filter(Boolean)
        .join("\n");
    }
  }
  const choices = r["choices"] as Array<{ message?: { content?: string } }> | undefined;
  if (choices?.[0]?.message?.content) return choices[0]!.message!.content!;
  if (typeof r["text"] === "string") return r["text"] as string;
  if (typeof r["output_text"] === "string") return r["output_text"] as string;
  const errField = r["error"];
  if (errField) {
    throw new Error(typeof errField === "string" ? errField : ((errField as { message?: string }).message ?? "Puter AI error."));
  }
  throw new Error("Unexpected response from Puter AI.");
}

function extractDelta(chunk: unknown): string {
  if (chunk == null) return "";
  if (typeof chunk === "string") return chunk;
  const c = chunk as Record<string, unknown>;
  if (typeof c["text"] === "string") return c["text"] as string;
  const msg = c["message"] as { content?: unknown } | undefined;
  if (msg) {
    if (typeof msg.content === "string") return msg.content;
    if (Array.isArray(msg.content)) {
      return msg.content
        .map((p) => (typeof p === "string" ? p : (p as { text?: string })?.text ?? ""))
        .filter(Boolean)
        .join("");
    }
  }
  const delta = c["delta"] as { content?: string } | undefined;
  if (delta?.content) return delta.content;
  return "";
}

// --- Public API ---

export async function deriveProjectTitle(vision: string, locale: Locale, signal?: AbortSignal): Promise<string> {
  try {
    const puter = await getPuter();
    const prompt = buildDeriveTitlePrompt(vision, locale);
    const raw = await withTimeout(
      puter.ai.chat(prompt, { model: MODEL }) as Promise<unknown>,
      30000,
      "Title derivation",
      signal,
    );
    const text = extractText(raw).trim();
    const cleaned = (text.split("\n")[0] ?? "")
      .replace(/^["'`*#\-\s]+|["'`*#\-\s]+$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!cleaned) return fallbackTitleFromVision(vision);
    return cleaned
      .split(" ")
      .map((w) => w.charAt(0).toLocaleUpperCase() + w.slice(1))
      .join(" ")
      .slice(0, 60);
  } catch {
    return fallbackTitleFromVision(vision);
  }
}

export async function generateAssumption(
  question: Question,
  history: readonly HistoryEntry[],
  docType: DocType,
  locale: Locale,
  signal?: AbortSignal,
): Promise<string> {
  const puter = await getPuter();
  const prompt = buildAssumePrompt(question, history, docType, locale);
  const raw = await withTimeout(
    puter.ai.chat(prompt, { model: MODEL }) as Promise<unknown>,
    60000,
    "Assumption",
    signal,
  );
  return extractText(raw).trim();
}

export interface StreamCallbacks {
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}

/** Streams generated document tokens via callback. Returns the full final text. */
export async function generateDocumentStream(
  docType: DocType,
  summary: DocSummary,
  history: readonly HistoryEntry[],
  locale: Locale,
  { onDelta, signal }: StreamCallbacks,
): Promise<string> {
  const puter = await getPuter();
  const prompt = buildGenerationPrompt(docType, summary, history, locale);
  let full = "";

  const tryStream = async (): Promise<string> => {
    // Puter.js v2 returns Promise<AsyncIterable> when stream:true; must await.
    const resolved = (await puter.ai.chat(prompt, { model: MODEL, stream: true })) as unknown;
    const iter = resolved as AsyncIterable<unknown>;
    if (!iter || typeof iter[Symbol.asyncIterator] !== "function") {
      throw new Error("Stream not supported, fall back");
    }
    for await (const chunk of iter) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const delta = extractDelta(chunk);
      if (delta) {
        full += delta;
        onDelta(delta);
      }
    }
    return full;
  };

  try {
    return await withTimeout(tryStream(), AiTimeoutMs, "Document generation", signal);
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    // Non-streaming fallback
    const raw = await withTimeout(
      puter.ai.chat(prompt, { model: MODEL }) as Promise<unknown>,
      AiTimeoutMs,
      "Document generation",
      signal,
    );
    const text = extractText(raw);
    onDelta(text);
    return text;
  }
}

export async function refineDocumentSection(
  docType: DocType,
  heading: string,
  originalContent: string,
  instruction: string,
  locale: Locale,
  signal?: AbortSignal,
): Promise<string> {
  const puter = await getPuter();
  const prompt = buildRefinePrompt(docType, heading, originalContent, instruction, locale);
  const raw = await withTimeout(
    puter.ai.chat(prompt, { model: MODEL }) as Promise<unknown>,
    AiTimeoutMs,
    "Section refinement",
    signal,
  );
  return extractText(raw).trim();
}
