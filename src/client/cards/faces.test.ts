import { describe, expect, it } from 'vitest';
import { RANKS, cardValue } from '../../engine/cards.ts';
import { COURT_PATTERNS, pipLayout } from './faces.ts';

describe('pipLayout', () => {
  it('shows as many suit symbols as the value on number cards, none on an Ace or a court card', () => {
    for (const rank of RANKS) {
      const value = cardValue({ rank, suit: 'spades', deck: 0 });
      const expected = value >= 2 && value <= 10 ? value : 0;
      expect(pipLayout(rank), rank).toHaveLength(expected);
    }
  });

  it('turns the bottom-half symbols upside down and keeps every symbol on the card', () => {
    for (const pip of pipLayout('10')) {
      expect(pip.flipped).toBe(pip.y > 0.5);
      expect(pip.x).toBeGreaterThan(0);
      expect(pip.x).toBeLessThan(1);
    }
  });

  it('has a pattern for each court card', () => {
    expect(Object.keys(COURT_PATTERNS).sort()).toEqual(['J', 'K', 'Q']);
  });
});
