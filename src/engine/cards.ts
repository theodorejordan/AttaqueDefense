// See docs/RULES.md section 2.

export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';

/** Cards are never mutated: the same object moves between piles. */
export interface Card {
  readonly rank: Rank;
  readonly suit: Suit;
  /** Which deck the card comes from: a game can use two identical decks. */
  readonly deck: number;
}

export const RANKS: readonly Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
export const SUITS: readonly Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

const RANK_VALUES: Record<Rank, number> = {
  A: 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
};

export const MAX_CARD_VALUE = 13;

export function cardValue(card: Card): number {
  return RANK_VALUES[card.rank];
}

export function sumValues(cards: readonly Card[]): number {
  return cards.reduce((total, card) => total + cardValue(card), 0);
}

export function createDeck(deck = 0): Card[] {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit, deck })));
}

export function cardKey(card: Card): string {
  return `${card.rank}-${card.suit}-${card.deck}`;
}
