import { describe, expect, it } from 'vitest';
import { en } from './en.ts';
import { fr } from './fr.ts';
import { detectLanguage } from './index.ts';

describe('languages', () => {
  it('uses the saved choice, then the browser language, then English', () => {
    expect(detectLanguage('en', ['fr-FR'])).toBe('en');
    expect(detectLanguage(null, ['fr-CA', 'en'])).toBe('fr');
    expect(detectLanguage('de', ['de-DE', 'FR'])).toBe('fr');
    expect(detectLanguage(null, ['es'])).toBe('en');
  });

  it('labels face cards R, D, V in French and K, Q, J in English', () => {
    expect([fr.ranks.K, fr.ranks.Q, fr.ranks.J, fr.ranks.A]).toEqual(['R', 'D', 'V', 'A']);
    expect([en.ranks.K, en.ranks.Q, en.ranks.J]).toEqual(['K', 'Q', 'J']);
  });

  it('uses each language plural rules', () => {
    expect(en.log.deckFlipped(1)).toContain('1 card)');
    expect(en.log.deckFlipped(0)).toContain('0 cards');
    expect(fr.log.deckFlipped(0)).toContain('0 carte)');
    expect(fr.log.deckFlipped(2)).toContain('2 cartes');
  });
});
