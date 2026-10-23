import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../engine/state.ts';
import { card } from '../../engine/test-helpers.ts';
import { describeEvent, describeLastAction, lastAction } from './describe.ts';

const nameOf = (id: string) => id;
const attack: GameEvent = {
  type: 'attacked',
  attacker: 'Basile',
  target: 'Ada',
  cards: [card('7'), card('3', 'spades')],
  total: 10,
  shield: card('8', 'diamonds'),
  shieldDestroyed: true,
  damage: 2,
};

describe('describeEvent', () => {
  it('writes the attack cards with their suits, summed when there are munitions', () => {
    expect(describeEvent(attack, nameOf)).toBe('Basile attacked Ada: 7♥ + 3♠ = 10, defence 8♦ destroyed, 2 damage');
    const single: GameEvent = { ...attack, cards: [card('Q', 'clubs')], total: 12, shield: null, shieldDestroyed: false, damage: 12 };
    expect(describeEvent(single, nameOf)).toBe('Basile attacked Ada: Q♣, 12 damage');
  });
});

describe('lastAction', () => {
  it('finds the latest move and the players it eliminated', () => {
    const log: GameEvent[] = [
      { type: 'turnStarted', player: 'Basile' },
      { type: 'drew', player: 'Basile' },
      attack,
      { type: 'damaged', player: 'Ada', damage: 2, before: [card('2')], after: [] },
      { type: 'eliminated', player: 'Ada' },
      { type: 'turnStarted', player: 'Chloé' },
      { type: 'drew', player: 'Chloé' },
    ];
    const action = lastAction(log)!;
    expect(action).toEqual({ move: attack, eliminated: ['Ada'] });
    expect(describeLastAction(action, nameOf)).toBe(
      'Basile attacked Ada: 7♥ + 3♠ = 10, defence 8♦ destroyed, 2 damage · Ada is eliminated',
    );
  });

  it('is empty before the first move', () => {
    expect(lastAction([{ type: 'shieldChosen', player: 'Ada' }])).toBeNull();
  });
});
