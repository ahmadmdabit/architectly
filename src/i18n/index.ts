// i18n/index.ts — i18next bootstrap with EN/TR/AR + RTL handling.
// Locale JSONs are bundled at build-time (small, ~3 KB each) to keep the
// experience instant and offline-friendly. The i18next-http-backend dep
// is intentionally not used; we register resources directly.
import i18next from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en.json";
import tr from "./locales/tr.json";
import ar from "./locales/ar.json";
import type { Direction, Locale } from "../types.ts";

export const SUPPORTED: readonly Locale[] = ["en", "tr", "ar"] as const;
export const RtlLocales: ReadonlySet<Locale> = new Set<Locale>(["ar"]);

export function dirOf(locale: Locale): Direction {
  return RtlLocales.has(locale) ? "rtl" : "ltr";
}

export function applyHtmlAttrs(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = dirOf(locale);
}

export async function initI18n(initialLocale?: Locale): Promise<void> {
  await i18next.use(LanguageDetector).init({
    supportedLngs: [...SUPPORTED],
    fallbackLng: "en",
    lng: initialLocale,
    load: "languageOnly",
    ns: ["translation"],
    defaultNS: "translation",
    resources: {
      en: { translation: en },
      tr: { translation: tr },
      ar: { translation: ar },
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "architectly:lang",
      caches: ["localStorage"],
    },
    interpolation: { escapeValue: false },
  });
  applyHtmlAttrs((i18next.language?.slice(0, 2) as Locale) || "en");
}

export function t(key: string, vars?: Record<string, string | number>): string {
  return i18next.t(key, vars) as string;
}

export async function setLocale(locale: Locale): Promise<void> {
  await i18next.changeLanguage(locale);
  try {
    localStorage.setItem("architectly:lang", locale);
  } catch {
    /* ignore */
  }
  applyHtmlAttrs(locale);
}

export function currentLocale(): Locale {
  const l = (i18next.language?.slice(0, 2) ?? "en") as Locale;
  return SUPPORTED.includes(l) ? l : "en";
}
