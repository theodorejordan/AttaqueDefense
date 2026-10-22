// What is drawn on a card face: outlined, abstract, classic layout (docs/DECISIONS.md > UI > Visual style).
import type { Rank, Suit } from '../../engine/cards.ts';

const circle = (cx: number, cy: number, r: number) =>
  `M${cx - r} ${cy} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 `;

/** Suit symbols, as SVG paths in a 24×24 box. */
export const SUIT_PATHS: Record<Suit, string> = {
  hearts:
    'M12 20.5 C8 17 3.5 13.5 3.5 8.8 C3.5 6 5.6 4 8.1 4 C9.8 4 11.2 5 12 6.4 C12.8 5 14.2 4 15.9 4 C18.4 4 20.5 6 20.5 8.8 C20.5 13.5 16 17 12 20.5 Z',
  diamonds: 'M12 3 L19 12 L12 21 L5 12 Z',
  spades:
    'M12 3.5 C16 7 20.5 10.5 20.5 14.6 C20.5 17 18.6 18.6 16.4 18.6 C14.6 18.6 13 17.6 12 16.2 C11 17.6 9.4 18.6 7.6 18.6 C5.4 18.6 3.5 17 3.5 14.6 C3.5 10.5 8 7 12 3.5 Z M12 16.5 L10.2 21 L13.8 21 Z',
  clubs: `${circle(12, 7.6, 4.1)}${circle(7.4, 13.6, 4.1)}${circle(16.6, 13.6, 4.1)}M12 13.5 L10.2 21 L13.8 21 Z`,
};

export function isRed(suit: Suit): boolean {
  return suit === 'hearts' || suit === 'diamonds';
}

/** Abstract pattern of a court card's top half, in a 60×100 box. The bottom half is the same turned 180°. */
export const COURT_PATTERNS: Partial<Record<Rank, string>> = {
  K: 'M10 34 L30 18 L50 34 M10 26 L30 10 L50 26 M16 6 L30 2.5 L44 6',
  Q: 'M12 32 A18 18 0 0 1 48 32 M18 32 A12 12 0 0 1 42 32 M24 32 A6 6 0 0 1 36 32',
  J: 'M4 10 L18 32 M14 4 L32 32 M28 4 L46 32 M42 4 L56 26',
};

/** A suit symbol on a number card, as fractions of the card's width and height. */
export interface Pip {
  x: number;
  y: number;
  /** Symbols on the bottom half are upside down, as on real cards. */
  flipped: boolean;
}

const L = 0.34;
const C = 0.5;
const R = 0.66;
const PIP_SPOTS: Partial<Record<Rank, [number, number][]>> = {
  '2': [[C, 0.22], [C, 0.78]],
  '3': [[C, 0.22], [C, 0.5], [C, 0.78]],
  '4': [[L, 0.22], [R, 0.22], [L, 0.78], [R, 0.78]],
  '5': [[L, 0.22], [R, 0.22], [C, 0.5], [L, 0.78], [R, 0.78]],
  '6': [[L, 0.22], [R, 0.22], [L, 0.5], [R, 0.5], [L, 0.78], [R, 0.78]],
  '7': [[L, 0.22], [R, 0.22], [C, 0.36], [L, 0.5], [R, 0.5], [L, 0.78], [R, 0.78]],
  '8': [[L, 0.22], [R, 0.22], [C, 0.36], [L, 0.5], [R, 0.5], [C, 0.64], [L, 0.78], [R, 0.78]],
  '9': [[L, 0.22], [R, 0.22], [L, 0.41], [R, 0.41], [C, 0.5], [L, 0.59], [R, 0.59], [L, 0.78], [R, 0.78]],
  '10': [[L, 0.22], [R, 0.22], [C, 0.32], [L, 0.41], [R, 0.41], [L, 0.59], [R, 0.59], [C, 0.68], [L, 0.78], [R, 0.78]],
};

/** The suit symbols of a number card: the 10 of spades shows ten spades. Empty for an Ace or a court card. */
export function pipLayout(rank: Rank): Pip[] {
  return (PIP_SPOTS[rank] ?? []).map(([x, y]) => ({ x, y, flipped: y > 0.5 }));
}
