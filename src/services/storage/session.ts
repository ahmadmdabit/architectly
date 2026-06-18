// session.ts — localStorage for the in-flight interview, draft, and user settings.
import type { Locale, SessionSnapshot } from "../../types.ts";

const SESSION_KEY = "architectly:session:v3";
const SETTINGS_KEY = "architectly:settings:v3";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export interface UserSettings {
  locale: Locale;
  showStepDots: boolean;
}

const DEFAULT_SETTINGS: UserSettings = { locale: "en", showStepDots: true };

export function loadSession(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveSession(snapshot: SessionSnapshot): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
    } catch {
      /* quota */
    }
  }, 100);
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<UserSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(patch: Partial<UserSettings>): void {
  try {
    const current = loadSettings();
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...current, ...patch }));
  } catch {
    /* ignore */
  }
}
