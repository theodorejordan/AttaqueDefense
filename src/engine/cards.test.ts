import { describe, expect, it } from 'vitest';
import { cardKey, cardValue, createDeck } from './cards.ts';
import { card } from './test-helpers.ts';

describe('cardValue', () => {
  it('counts an ace as 1', () => {
    expect(cardValue(card('A', 'spades'))).toBe(1);
  });

  it('counts number cards at face value', () => {
    expect(cardValue(card('7', 'hearts'))).toBe(7);
    expect(cardValue(card('10', 'clubs'))).toBe(10);
  });

  it('counts J, Q, K as 11, 12, 13', () => {
    expect(cardValue(card('J', 'diamonds'))).toBe(11);
    expect(cardValue(card('Q', 'diamonds'))).toBe(12);
    expect(cardValue(card('K', 'diamonds'))).toBe(13);
  });
});

describe('createDeck', () => {
  it('has 52 distinct cards', () => {
    expect(new Set(createDeck().map(cardKey)).size).toBe(52);
  });

  it('tells apart identical cards from two decks', () => {
    expect(cardKey(card('7', 'hearts', 0))).not.toBe(cardKey(card('7', 'hearts', 1)));
  });
});
