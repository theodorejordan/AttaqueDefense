// Each device picks its own language (docs/DECISIONS.md > UI > Languages).
import { en, type Messages } from './en.ts';
import { fr } from './fr.ts';
import type { Language } from './plural.ts';

export type { Language };
export const LANGUAGES: readonly Language[] = ['en', 'fr'];
const dictionaries: Record<Language, Messages> = { en, fr };
const STORAGE_KEY = 'attaque-defense-language';

/** The saved choice first, then the browser's languages, then English. */
export function detectLanguage(saved: string | null, browserLanguages: readonly string[]): Language {
  if (LANGUAGES.includes(saved as Language)) return saved as Language;
  const fromBrowser = browserLanguages.map((l) => l.slice(0, 2).toLowerCase()).find((l) => LANGUAGES.includes(l as Language));
  return (fromBrowser as Language | undefined) ?? 'en';
}

/** Storage can be unavailable (private mode, blocked site data): the language then just isn't remembered. */
function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

let language = detectLanguage(readSaved(), typeof navigator === 'undefined' ? [] : navigator.languages);

/**
 * The texts of the current language. An `export let` is a live binding: importers see the new value after `setLanguage`.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export#description
 */
export let t: Messages = dictionaries[language];

export function getLanguage(): Language {
  return language;
}

export function setLanguage(next: Language) {
  language = next;
  t = dictionaries[next];
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Not remembered, still switched.
  }
}
