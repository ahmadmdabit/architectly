// main.ts — Bootstrap: i18n → router → store rehydration → UI mount → autosave.
import { effect } from "./core/signal.ts";
import {
  allQuestions,
  answers,
  currentQuestion,
  documentMeta,
  documentText,
  history,
  locale as localeSig,
  step,
} from "./core/store.ts";
import { initI18n, currentLocale } from "./i18n/index.ts";
import { initRouter } from "./router/pathRouter.ts";
import { mountApp } from "./ui/host.ts";
import { loadSession, loadSettings, saveSession, saveSettings } from "./services/storage/session.ts";
import { getQuestionsForType } from "./services/interview/questions.ts";
import { docType } from "./core/store.ts";
import "./styles/main.scss";

async function boot(): Promise<void> {
  const settings = loadSettings();
  await initI18n(settings.locale);
  localeSig.set(currentLocale());

  // Rehydrate session if any
  const restored = loadSession();
  if (restored && restored.step !== "welcome") {
    if (restored.docType) {
      docType.set(restored.docType);
      allQuestions.set(getQuestionsForType(restored.docType));
    }
    answers.set(restored.answers);
    history.set(restored.history);
    documentText.set(restored.document);
    documentMeta.set(restored.documentMeta);
    if (restored.currentQuestionId && restored.docType) {
      const q = getQuestionsForType(restored.docType).find((x) => x.id === restored.currentQuestionId);
      currentQuestion.set(q ?? null);
    }
    step.set(restored.step);
  }

  // Router must be initialized after the store is rehydrated so the URL wins ties.
  initRouter();

  // Persist on every relevant change
  effect(() => {
    saveSession({
      step: step(),
      docType: docType(),
      answers: answers(),
      history: history(),
      currentQuestionId: currentQuestion()?.id ?? null,
      document: documentText(),
      documentMeta: documentMeta(),
      draft: "",
    });
  });
  effect(() => {
    saveSettings({ locale: localeSig() });
  });

  // Mount UI
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app root element.");
  mountApp(root);
}

void boot();
