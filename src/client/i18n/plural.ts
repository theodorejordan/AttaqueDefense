// Plural forms differ by language: French says "0 carte", English "0 cards".
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules
export type Language = 'en' | 'fr';

const rules: Record<Language, Intl.PluralRules> = {
  en: new Intl.PluralRules('en'),
  fr: new Intl.PluralRules('fr'),
};

/** `count` followed by the right form of the word. */
export function plural(language: Language, count: number, forms: { one: string; other: string }): string {
  return `${count} ${rules[language].select(count) === 'one' ? forms.one : forms.other}`;
}
