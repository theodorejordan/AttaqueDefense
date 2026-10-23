import { describe, expect, it } from 'vitest';
import { card } from '../../engine/test-helpers.ts';
import type { GameEvent } from '../../engine/state.ts';
import type { PlayerSummary, SpectatorView } from '../../engine/view.ts';
import type { RoomView } from '../../shared/protocol.ts';
import { ATTACK_HOLD_MS, ATTACK_PAUSE_MS } from '../../shared/timing.ts';
import { framesFor } from './playback.ts';

const player = (id: string, overrides: Partial<PlayerSummary> = {}): PlayerSummary => ({
  id,
  name: id,
  life: [card('9'), card('5')],
  shield: card('8'),
  munitionCount: 0,
  eliminated: false,
  hasChosenShield: true,
  ...overrides,
});

const room = (players: PlayerSummary[], turn: SpectatorView['turn']): RoomView => ({
  you: 'A',
  hostId: 'A',
  members: [],
  settings: { hunters: 1, deckCount: 1, maxMunitions: 5 },
  deckCounts: [1],
  game: { phase: 'playing', settings: { hunters: 1, deckCount: 1, maxMunitions: 5 }, players, drawDeckCount: 10, sidePot: [], turn, winner: null },
  outOfCards: false,
  spectatorCount: 0,
  lookingAt: 'B',
});

const attack: GameEvent = {
  type: 'attacked',
  attacker: 'A',
  target: 'B',
  cards: [card('Q'), card('3')],
  total: 15,
  shield: card('8'),
  shieldDestroyed: true,
  damage: 7,
};

describe('framesFor', () => {
  const before = room([player('A', { munitionCount: 1 }), player('B')], { player: 'A', isHunter: false, hasDrawn: true, drawnCard: null });
  const after = room([player('A'), player('B', { life: [card('7')], shield: null })], {
    player: 'B',
    isHunter: false,
    hasDrawn: false,
    drawnCard: null,
  });

  it('shows an update without an attack at once', () => {
    expect(framesFor(before, { room: after, events: [{ type: 'munitionGiven', by: 'A', target: 'B' }] })).toEqual([
      { room: after, attack: null, ms: 0 },
    ]);
  });

  it('lands an attack on the table as it was, then changes the life cards, then clears the attack', () => {
    const [landing, resolved, done] = framesFor(before, { room: after, events: [attack] });
    expect(landing!.attack).toBe(attack);
    expect(landing!.ms).toBe(ATTACK_PAUSE_MS);
    // The target still has their defence and life cards; the attack cards have left the attacker.
    expect(landing!.room.game!.players[1]).toEqual(before.game!.players[1]);
    expect(landing!.room.game!.players[0]!.munitionCount).toBe(0);
    expect(landing!.room.game!.turn).toMatchObject({ player: 'A', hasDrawn: false });
    expect(landing!.room.lookingAt).toBeNull();
    expect(resolved!.room.game!.players).toEqual(after.game!.players);
    expect(resolved!.ms).toBe(ATTACK_HOLD_MS);
    expect(done).toEqual({ room: after, attack: null, ms: 0 });
  });

  it('keeps the attack cards out of the side pot while they lie on the target', () => {
    const discarded = room(after.game!.players, after.game!.turn);
    discarded.game!.sidePot = [card('8'), card('Q'), card('3')];
    const [, resolved, done] = framesFor(before, { room: discarded, events: [attack] });
    expect(resolved!.room.game!.sidePot).toEqual([card('8')]);
    expect(resolved!.attack!.cards).toEqual(attack.cards);
    expect(done!.room.game!.sidePot).toEqual([card('8'), card('Q'), card('3')]);
  });

  it('takes an attack card off the defence once it became a life card', () => {
    const small: GameEvent = { ...attack, cards: [card('2')], total: 2, shield: null, shieldDestroyed: false, damage: 2 };
    const replaced = room([player('A'), player('B', { life: [card('9'), card('2')], shield: null })], after.game!.turn);
    const [, resolved] = framesFor(before, { room: replaced, events: [small] });
    expect(resolved!.attack!.cards).toEqual([]);
  });
});
