import { describe, expect, it } from 'vitest';
import { cardValue } from './cards.ts';

describe('cardValue', () => {
  it('counts an ace as 1', () => {
    expect(cardValue({ rank: 'A', suit: 'spades' })).toBe(1);
  });

  it('counts number cards at face value', () => {
    expect(cardValue({ rank: '7', suit: 'hearts' })).toBe(7);
    expect(cardValue({ rank: '10', suit: 'clubs' })).toBe(10);
  });

  it('counts J, Q, K as 11, 12, 13', () => {
    expect(cardValue({ rank: 'J', suit: 'diamonds' })).toBe(11);
    expect(cardValue({ rank: 'Q', suit: 'diamonds' })).toBe(12);
    expect(cardValue({ rank: 'K', suit: 'diamonds' })).toBe(13);
  });
});
