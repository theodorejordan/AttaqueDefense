import { describe, expect, it } from 'vitest';
import { cardKey } from './cards.ts';
import { createRng } from './rng.ts';
import { DEFAULT_MAX_MUNITIONS, chooseShield, createGame } from './setup.ts';
import { cards, makePlayer, makeState, values } from './test-helpers.ts';

const newPlayers = (count: number) =>
  Array.from({ length: count }, (_, i) => ({ id: `p${i}`, name: `Player ${i}` }));

describe('createGame', () => {
  it('deals 4 face-down cards to each player', () => {
    const state = createGame(newPlayers(5), {}, createRng(1));
    expect(state.phase).toBe('choosingShields');
    expect(state.players.every((p) => p.dealt.length === 4)).toBe(true);
    expect(state.drawDeck).toHaveLength(52 - 5 * 4);
    const all = [...state.players.flatMap((p) => p.dealt), ...state.drawDeck];
    expect(new Set(all.map(cardKey)).size).toBe(52);
  });

  describe('number of decks (RULES 2)', () => {
    const withDecks = (players: number, deckCount?: number) =>
      createGame(newPlayers(players), { deckCount }, createRng(1));

    it('uses one deck below 6 players', () => {
      expect(withDecks(5).settings.deckCount).toBe(1);
      expect(() => withDecks(5, 2)).toThrow();
    });

    it('lets 6-7 players choose, one deck by default', () => {
      expect(withDecks(7).drawDeck).toHaveLength(52 - 7 * 4);
      expect(withDecks(6, 2).drawDeck).toHaveLength(104 - 6 * 4);
    });

    it('uses two decks from 8 players, with every card still distinct', () => {
      expect(() => withDecks(8, 1)).toThrow();
      const eight = withDecks(8);
      const all = [...eight.players.flatMap((p) => p.dealt), ...eight.drawDeck];
      expect(new Set(all.map(cardKey)).size).toBe(104);
    });
  });

  it('defaults to the "first eliminated" hunter rule and 5 max munitions', () => {
    const { settings } = createGame(newPlayers(4), {}, createRng(1));
    expect(settings).toEqual({ hunterRule: 'firstOnly', deckCount: 1, maxMunitions: DEFAULT_MAX_MUNITIONS });
  });

  it('validates max munitions', () => {
    expect(() => createGame(newPlayers(4), { maxMunitions: 0 }, createRng(1))).toThrow();
    expect(() => createGame(newPlayers(4), { maxMunitions: 3 }, createRng(1))).not.toThrow();
  });

  it('accepts 3 to 10 players only', () => {
    expect(() => createGame(newPlayers(2), {}, createRng(1))).toThrow();
    expect(() => createGame(newPlayers(11), {}, createRng(1))).toThrow();
    expect(() => createGame(newPlayers(10), {}, createRng(1))).not.toThrow();
  });

  it('rejects duplicate player ids', () => {
    const players = [...newPlayers(2), { id: 'p0', name: 'Again' }];
    expect(() => createGame(players, {}, createRng(1))).toThrow();
  });

  it('is reproducible with the same seed', () => {
    const a = createGame(newPlayers(4), {}, createRng(42));
    const b = createGame(newPlayers(4), {}, createRng(42));
    expect(a).toEqual(b);
  });
});

describe('chooseShield', () => {
  const choosing = (dealt: Parameters<typeof cards>[]) =>
    makeState(
      dealt.map((ranks, i) => makePlayer(`p${i}`, { dealt: cards(...ranks), life: [] })),
      { phase: 'choosingShields', turn: null },
    );

  it('turns the chosen card into the shield and the other 3 into life cards', () => {
    const state = choosing([['2', '3', '4', '5'], ['2', '3', '4', '5'], ['2', '3', '4', '5']]);
    const { state: next } = chooseShield(state, 'p0', 1);
    const p0 = next.players[0]!;
    expect(values([p0.shield!])).toEqual([3]);
    expect(values(p0.life)).toEqual([2, 4, 5]);
    expect(next.phase).toBe('choosingShields');
  });

  it('rejects a second choice and an invalid index', () => {
    const state = choosing([['2', '3', '4', '5'], ['2', '3', '4', '5'], ['2', '3', '4', '5']]);
    const { state: next } = chooseShield(state, 'p0', 0);
    expect(() => chooseShield(next, 'p0', 1)).toThrow();
    expect(() => chooseShield(state, 'p1', 4)).toThrow();
  });

  const chooseAll = (state: ReturnType<typeof choosing>, index: number) =>
    state.players.reduce((s, p) => chooseShield(s, p.id, index).state, state);

  it('starts the game with the lowest life total once everyone has chosen', () => {
    const state = choosing([['K', 'K', 'K', 'A'], ['2', '2', '2', 'A'], ['5', '5', '5', 'A']]);
    const next = chooseAll(state, 3);
    expect(next.phase).toBe('playing');
    expect(next.turn?.player).toBe('p1');
  });

  it('breaks a life tie with the lowest shield, then the random tie-break order', () => {
    const shieldTie = chooseAll(choosing([['5', '5', '5', '9'], ['5', '5', '5', '3'], ['K', 'K', 'K', 'A']]), 3);
    expect(shieldTie.turn?.player).toBe('p1');

    const fullTie = choosing([['5', '5', '5', '3'], ['5', '5', '5', '3'], ['K', 'K', 'K', 'A']]);
    fullTie.tieBreakOrder = ['p2', 'p1', 'p0'];
    expect(chooseAll(fullTie, 3).turn?.player).toBe('p1');
  });
});
