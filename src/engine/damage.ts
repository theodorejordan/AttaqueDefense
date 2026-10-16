// See docs/RULES.md section 6.
import { type Card, MAX_CARD_VALUE, cardValue } from './cards.ts';
import type { DamagePreference } from './state.ts';

export const MAX_LIFE_CARDS = 3;

export interface CardLocation {
  pile: 'sidePot' | 'drawDeck';
  index: number;
}

export interface DamageOption {
  /** Indices of the life cards to remove. */
  removed: number[];
  /** Where to take the replacement cards from (0, 1 or 2 cards). */
  replacements: CardLocation[];
  /** Resulting life values, used to rank options. */
  result: number[];
  /** How deep we searched to find the replacements (0 = no search). */
  searchCost: number;
}

interface SearchEntry {
  value: number;
  location: CardLocation;
}

/** Search order (RULES 6.1): side pot from the top, then draw deck from the bottom. */
function searchOrder(sidePot: readonly Card[], drawDeck: readonly Card[]): SearchEntry[] {
  const order: SearchEntry[] = [];
  for (let i = sidePot.length - 1; i >= 0; i--) {
    order.push({ value: cardValue(sidePot[i]!), location: { pile: 'sidePot', index: i } });
  }
  for (let i = drawDeck.length - 1; i >= 0; i--) {
    order.push({ value: cardValue(drawDeck[i]!), location: { pile: 'drawDeck', index: i } });
  }
  return order;
}

function nonEmptySubsets(size: number): number[][] {
  const subsets: number[][] = [];
  for (let mask = 1; mask < 1 << size; mask++) {
    subsets.push([...Array(size).keys()].filter((i) => mask & (1 << i)));
  }
  return subsets;
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const count = (o: DamageOption) => o.result.length;
const max = (o: DamageOption) => Math.max(...o.result);

type Compare = (a: DamageOption, b: DamageOption) => number;

/** RULES 6.2: preference first, then the other preference, then least searching. */
function preferenceCompare(preference: DamagePreference): Compare {
  switch (preference) {
    case 'fewestCards':
      return (a, b) => count(a) - count(b) || max(a) - max(b) || a.searchCost - b.searchCost;
    case 'lowestMax':
      return (a, b) => max(a) - max(b) || count(a) - count(b) || a.searchCost - b.searchCost;
    case 'normal':
      return (a, b) => a.searchCost - b.searchCost || count(a) - count(b) || max(a) - max(b);
  }
}

/** Keeps the first best option, so the result is deterministic. */
function best<T extends DamageOption>(options: T[], compare: (a: T, b: T) => number): T | null {
  return options.reduce<T | null>(
    (winner, option) => (winner === null || compare(option, winner) < 0 ? option : winner),
    null,
  );
}

/**
 * Chooses how a player takes `damage` (RULES 6).
 * Returns null when the player is eliminated.
 */
export function chooseDamageOption(
  life: readonly Card[],
  damage: number,
  sidePot: readonly Card[],
  drawDeck: readonly Card[],
  preference: DamagePreference,
): DamageOption | null {
  const values = life.map(cardValue);
  if (damage >= sum(values)) return null;

  const order = searchOrder(sidePot, drawDeck);
  const find = (value: number, skip = -1) =>
    order.findIndex((entry, i) => i !== skip && entry.value === value);
  const byPreference = preferenceCompare(preference);

  const candidates = nonEmptySubsets(values.length)
    .map((removed) => ({
      removed,
      kept: values.filter((_, i) => !removed.includes(i)),
      rest: sum(removed.map((i) => values[i]!)) - damage,
    }))
    .filter(({ rest }) => rest >= 0);

  // At most one replacement card.
  const single: DamageOption[] = [];
  for (const { removed, kept, rest } of candidates) {
    if (rest === 0) {
      single.push({ removed, replacements: [], result: kept, searchCost: 0 });
      continue;
    }
    if (rest > MAX_CARD_VALUE) continue;
    const pos = find(rest);
    if (pos === -1) continue;
    single.push({
      removed,
      replacements: [order[pos]!.location],
      result: [...kept, rest],
      searchCost: pos + 1,
    });
  }
  if (single.length > 0) return best(single, byPreference);

  // Fallback 1: split the replacement into two cards, least searching first.
  const split: DamageOption[] = [];
  for (const { removed, kept, rest } of candidates) {
    if (kept.length + 2 > MAX_LIFE_CARDS) continue;
    for (let a = 1; a <= rest / 2; a++) {
      const b = rest - a;
      if (b > MAX_CARD_VALUE) continue;
      const i = find(a);
      if (i === -1) continue;
      const j = find(b, i);
      if (j === -1) continue;
      split.push({
        removed,
        replacements: [order[i]!.location, order[j]!.location],
        result: [...kept, a, b],
        searchCost: Math.max(i, j) + 1,
      });
    }
  }
  if (split.length > 0) {
    return best(split, (a, b) => a.searchCost - b.searchCost || byPreference(a, b));
  }

  // Fallback 2 (last resort): closest lower available value.
  // Value 0 means removing cards without replacement, which only happens if no card is left to search.
  const lower: (DamageOption & { gap: number })[] = [];
  for (const { removed, kept, rest } of candidates) {
    for (let value = Math.min(rest - 1, MAX_CARD_VALUE); value >= 0; value--) {
      if (value === 0) {
        if (kept.length > 0) lower.push({ removed, replacements: [], result: kept, searchCost: 0, gap: rest });
        break;
      }
      const pos = find(value);
      if (pos === -1) continue;
      lower.push({
        removed,
        replacements: [order[pos]!.location],
        result: [...kept, value],
        searchCost: pos + 1,
        gap: rest - value,
      });
      break;
    }
  }
  return best(lower, (a, b) => a.gap - b.gap || a.searchCost - b.searchCost || byPreference(a, b));
}
