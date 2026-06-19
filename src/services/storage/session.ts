// session.ts — localStorage for the in-flight interview, draft, and user settings.
import type { Locale, SessionSnapshot } from "../../types.ts";

const SessionKey = "architectly:session";
const SettingsKey = "architectly:settings";

let saveTimer: ReturnType<typeof setTimeout> | null = null;

export interface UserSettings {
  locale: Locale;
  showStepDots: boolean;
}

const DefaultSettings: UserSettings = { locale: "en", showStepDots: true };

export function loadSession(): SessionSnapshot | null {
  try {
    const raw = localStorage.getItem(SessionKey);
    return raw ? (JSON.parse(raw) as SessionSnapshot) : null;
  } catch {
    return null;
  }
}

export function saveSession(snapshot: SessionSnapshot): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SessionKey, JSON.stringify(snapshot));
    } catch {
      /* quota */
    }
  }, 100);
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SessionKey);
  } catch {
    /* ignore */
  }
}

export function loadSettings(): UserSettings {
  try {
    const raw = localStorage.getItem(SettingsKey);
    if (!raw) return { ...DefaultSettings };
    return { ...DefaultSettings, ...(JSON.parse(raw) as Partial<UserSettings>) };
  } catch {
    return { ...DefaultSettings };
  }
}

export function saveSettings(patch: Partial<UserSettings>): void {
  try {
    const current = loadSettings();
    localStorage.setItem(SettingsKey, JSON.stringify({ ...current, ...patch }));
  } catch {
    /* ignore */
  }
}
