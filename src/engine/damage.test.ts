import { describe, expect, it } from 'vitest';
import { chooseDamageOption } from './damage.ts';
import { card, cards } from './test-helpers.ts';

const sorted = (values: number[] | undefined) => [...(values ?? [])].sort((a, b) => a - b);

describe('chooseDamageOption', () => {
  it('eliminates when damage is at least the life total', () => {
    expect(chooseDamageOption(cards('5', '3'), 8, [], [], 'normal')).toBeNull();
    expect(chooseDamageOption(cards('5', '3'), 12, [], [], 'normal')).toBeNull();
  });

  describe('RULES 6 example: life 9-2-12 takes 5 damage', () => {
    const life = cards('9', '2', 'Q');

    it('"Fewest cards" and "Lowest max" both pick 9-9', () => {
      const sidePot = cards('4', '7', '6', '9');
      expect(sorted(chooseDamageOption(life, 5, sidePot, [], 'fewestCards')?.result)).toEqual([9, 9]);
      expect(sorted(chooseDamageOption(life, 5, sidePot, [], 'lowestMax')?.result)).toEqual([9, 9]);
    });

    it('"Normal" picks the least searching: the 4 on top of the side pot', () => {
      const sidePot = cards('9', '6', '7', '4');
      const option = chooseDamageOption(life, 5, sidePot, [], 'normal');
      expect(sorted(option?.result)).toEqual([2, 4, 12]);
      expect(option?.replacements).toEqual([{ pile: 'sidePot', index: 3 }]);
    });

    it('skips an option whose replacement value is not available', () => {
      const sidePot = cards('4', '7', '6'); // no 9 anywhere
      expect(sorted(chooseDamageOption(life, 5, sidePot, [], 'fewestCards')?.result)).toEqual([6, 12]);
    });
  });

  it('removes a card without replacement when it matches the damage exactly', () => {
    const option = chooseDamageOption(cards('9', '2', 'Q'), 2, [], [], 'normal');
    expect(sorted(option?.result)).toEqual([9, 12]);
    expect(option?.replacements).toEqual([]);
  });

  it('RULES 6.1 example: an attack card 2 becomes the new life card (4-12 → 2-12)', () => {
    const option = chooseDamageOption(cards('4', 'Q'), 2, cards('2'), [], 'normal');
    expect(sorted(option?.result)).toEqual([2, 12]);
  });

  it('RULES 6.2 example: 10-4-3 takes 2 → 10-2-3 with "Normal", 10-5 with "Fewest cards"', () => {
    const life = cards('10', '4', '3');
    const sidePot = cards('A', '5', '2');
    expect(sorted(chooseDamageOption(life, 2, sidePot, [], 'normal')?.result)).toEqual([2, 3, 10]);
    expect(sorted(chooseDamageOption(life, 2, sidePot, [], 'fewestCards')?.result)).toEqual([5, 10]);
  });

  describe('search order (RULES 6.1)', () => {
    const life = cards('K');

    it('searches the side pot from the top', () => {
      const sidePot = [card('7', 'clubs'), card('7', 'spades')];
      expect(chooseDamageOption(life, 6, sidePot, [], 'normal')?.replacements).toEqual([
        { pile: 'sidePot', index: 1 },
      ]);
    });

    it('searches the side pot before the draw deck', () => {
      const sidePot = cards('7', '3');
      const drawDeck = cards('7');
      expect(chooseDamageOption(life, 6, sidePot, drawDeck, 'normal')?.replacements).toEqual([
        { pile: 'sidePot', index: 0 },
      ]);
    });

    it('searches the draw deck from the bottom', () => {
      const drawDeck = [card('7', 'hearts'), card('3'), card('7', 'spades')];
      expect(chooseDamageOption(life, 6, [], drawDeck, 'normal')?.replacements).toEqual([
        { pile: 'drawDeck', index: 2 },
      ]);
    });
  });

  describe('fallbacks', () => {
    it('splits the replacement into two cards, least searching first', () => {
      // K takes 5 → needs an 8, none available. 7+1 is found before 6+2.
      const sidePot = cards('6', '2', '7', 'A');
      const option = chooseDamageOption(cards('K'), 5, sidePot, [], 'normal');
      expect(sorted(option?.result)).toEqual([1, 7]);
      expect(option?.replacements).toHaveLength(2);
    });

    it('never splits into more than 3 life cards, then uses the closest lower value', () => {
      // 13-12-11 takes 1: no 12, 11 or 10 available, and splitting one card would make 4 cards.
      const option = chooseDamageOption(cards('K', 'Q', 'J'), 1, cards('6', '6'), [], 'normal');
      expect(sorted(option?.result)).toEqual([6, 12, 13]);
    });

    it('removes cards without replacement if no card is left to search', () => {
      const option = chooseDamageOption(cards('K', '5'), 1, [], [], 'normal');
      expect(option?.result).toEqual([13]);
    });
  });
});
