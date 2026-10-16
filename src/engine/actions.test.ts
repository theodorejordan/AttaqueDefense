import { describe, expect, it } from 'vitest';
import { draw, legalPlays, play } from './actions.ts';
import type { ActionType, GameState, PlayerId } from './state.ts';
import { card, cards, makePlayer, makeState, values } from './test-helpers.ts';

/** Puts `rank` on top of the draw deck, then draws and plays it. */
function drawAndPlay(state: GameState, type: ActionType, target: PlayerId, rank: Parameters<typeof card>[0]) {
  const player = state.turn!.player;
  const withCard = { ...state, drawDeck: [card(rank, 'spades'), ...state.drawDeck] };
  const drawn = draw(withCard, player);
  return play(drawn.state, player, { type, target });
}

const player = (state: GameState, id: PlayerId) => state.players.find((p) => p.id === id)!;
const fourPlayers = () => ['A', 'B', 'C', 'D'].map((id) => makePlayer(id));

describe('draw', () => {
  it('takes the top card, hidden from the player', () => {
    const state = makeState(fourPlayers(), { drawDeck: cards('7', '3') });
    const { state: next } = draw(state, 'A');
    expect(values([next.turn!.drawn!])).toEqual([7]);
    expect(next.turn!.drawnVisible).toBe(false);
    expect(next.drawDeck).toHaveLength(1);
  });

  it('shows the card to a player whose shield is an Ace (RULES 5.4)', () => {
    const players = fourPlayers();
    players[0]!.shield = card('A');
    const { state: next } = draw(makeState(players, { drawDeck: cards('7') }), 'A');
    expect(next.turn!.drawnVisible).toBe(true);
  });

  it('refuses to draw twice or out of turn', () => {
    const state = makeState(fourPlayers(), { drawDeck: cards('7', '3') });
    expect(() => draw(draw(state, 'A').state, 'A')).toThrow();
    expect(() => draw(state, 'B')).toThrow();
  });

  it('flips the side pot without shuffling when the deck is empty (RULES 7)', () => {
    const state = makeState(fourPlayers(), { sidePot: cards('3', '7', 'K') }); // K on top
    const { state: next, events } = draw(state, 'A');
    expect(values([next.turn!.drawn!])).toEqual([3]); // oldest card is now on top
    expect(values(next.drawDeck)).toEqual([7, 13]);
    expect(next.sidePot).toEqual([]);
    expect(events).toContainEqual({ type: 'deckFlipped', cardCount: 3 });
  });
});

describe('attack (RULES 5.1)', () => {
  it('does nothing when lower than the shield, and the target keeps their munitions', () => {
    const players = fourPlayers();
    players[1]!.shield = card('9');
    players[1]!.munitions = cards('4');
    const { state: next } = drawAndPlay(makeState(players), 'attack', 'B', '7');
    expect(values([player(next, 'B').shield!])).toEqual([9]);
    expect(player(next, 'B').munitions).toHaveLength(1);
    expect(values(next.sidePot)).toEqual([7]);
  });

  it('destroys an equal shield without damage, and the target loses their munitions', () => {
    const players = fourPlayers();
    players[1]!.shield = card('9');
    players[1]!.munitions = cards('4');
    const { state: next } = drawAndPlay(makeState(players), 'attack', 'B', '9');
    expect(player(next, 'B').shield).toBeNull();
    expect(values(player(next, 'B').life)).toEqual([5, 5, 5]);
    expect(player(next, 'B').munitions).toEqual([]);
    // Shield, then attack card, then lost munitions.
    expect(values(next.sidePot)).toEqual([9, 9, 4]);
  });

  it('deals the difference when higher than the shield (J vs 9 → 2 damage)', () => {
    const players = fourPlayers();
    players[1]!.shield = card('9');
    players[1]!.life = cards('9', '2', 'Q');
    const { state: next, events } = drawAndPlay(makeState(players), 'attack', 'B', 'J');
    expect(player(next, 'B').shield).toBeNull();
    expect(values(player(next, 'B').life)).toEqual([9, 12]); // the 2 is removed exactly
    expect(events).toContainEqual(expect.objectContaining({ type: 'attacked', total: 11, damage: 2 }));
  });

  it('deals full damage to a player without shield', () => {
    const { state: next } = drawAndPlay(makeState(fourPlayers()), 'attack', 'B', '5');
    expect(values(player(next, 'B').life)).toEqual([5, 5]);
  });

  it('adds all the attacker\'s munitions to the drawn card', () => {
    const players = fourPlayers();
    players[0]!.munitions = cards('3', '4');
    players[1]!.shield = card('Q');
    const { state: next, events } = drawAndPlay(makeState(players), 'attack', 'B', '5');
    expect(player(next, 'A').munitions).toEqual([]);
    expect(player(next, 'B').shield).toBeNull();
    expect(events).toContainEqual(expect.objectContaining({ type: 'attacked', total: 12, damage: 0 }));
  });

  it('cannot target yourself', () => {
    const state = draw(makeState(fourPlayers(), { drawDeck: cards('5') }), 'A').state;
    expect(() => play(state, 'A', { type: 'attack', target: 'A' })).toThrow();
  });

  it('eliminates a player and sends all their cards to the side pot', () => {
    const players = fourPlayers();
    players[1]!.life = cards('2', '3');
    players[1]!.munitions = cards('K');
    const { state: next, events } = drawAndPlay(makeState(players), 'attack', 'B', '5');
    expect(player(next, 'B').eliminated).toBe(true);
    expect(player(next, 'B').life).toEqual([]);
    expect(values(next.sidePot)).toEqual([5, 2, 3, 13]);
    expect(events).toContainEqual({ type: 'eliminated', player: 'B' });
  });
});

describe('defense (RULES 5.2)', () => {
  it('replaces a shield, discards the old one, and keeps munitions', () => {
    const players = fourPlayers();
    players[1]!.shield = card('3');
    players[1]!.munitions = cards('4');
    const { state: next } = drawAndPlay(makeState(players), 'defense', 'B', '8');
    expect(values([player(next, 'B').shield!])).toEqual([8]);
    expect(player(next, 'B').munitions).toHaveLength(1);
    expect(values(next.sidePot)).toEqual([3]);
  });

  it('can give a shield to yourself or to a player without one', () => {
    const self = drawAndPlay(makeState(fourPlayers()), 'defense', 'A', '8').state;
    expect(values([player(self, 'A').shield!])).toEqual([8]);
    const other = drawAndPlay(makeState(fourPlayers()), 'defense', 'C', '8').state;
    expect(values([player(other, 'C').shield!])).toEqual([8]);
  });
});

describe('munition (RULES 5.3)', () => {
  it('gives the card face-down, without revealing it in the events', () => {
    const { state: next, events } = drawAndPlay(makeState(fourPlayers()), 'munition', 'C', 'K');
    expect(values(player(next, 'C').munitions)).toEqual([13]);
    expect(events).toContainEqual({ type: 'munitionGiven', by: 'A', target: 'C' });
  });
});

describe('turn order (RULES 4)', () => {
  it('passes clockwise and skips eliminated players', () => {
    const players = fourPlayers();
    players[1]!.eliminated = true;
    players[1]!.life = [];
    const { state: next } = drawAndPlay(makeState(players), 'munition', 'A', '2');
    expect(next.turn?.player).toBe('C');
  });
});

describe('hunter rule (RULES 8.2)', () => {
  /** Order A, B, C, D. It is C's turn and B has 2 life points. */
  const cTurn = (hunterRule: GameState['settings']['hunterRule'] = 'firstOnly') => {
    const players = fourPlayers();
    players[1]!.life = cards('2');
    return makeState(players, {
      settings: { hunterRule },
      turn: { player: 'C', drawn: null, drawnVisible: false, isHunter: false, resumeAfter: 'C' },
    });
  };

  it('C eliminates B → B plays as hunter → then D', () => {
    const afterKill = drawAndPlay(cTurn(), 'attack', 'B', '5').state;
    expect(afterKill.turn).toMatchObject({ player: 'B', isHunter: true });

    const hunterDrew = draw({ ...afterKill, drawDeck: cards('3') }, 'B').state;
    const targets = legalPlays(hunterDrew, 'B');
    // No shield or munition for themselves.
    expect(targets.some((p) => p.target === 'B')).toBe(false);

    const afterHunter = play(hunterDrew, 'B', { type: 'attack', target: 'A' }).state;
    expect(afterHunter.turn).toMatchObject({ player: 'D', isHunter: false });
  });

  it('only applies to the first elimination by default', () => {
    const state = cTurn();
    state.firstEliminationDone = true;
    const next = drawAndPlay(state, 'attack', 'B', '5').state;
    expect(next.turn).toMatchObject({ player: 'D', isHunter: false });
  });

  it('can be turned off, or applied to every elimination', () => {
    expect(drawAndPlay(cTurn('off'), 'attack', 'B', '5').state.turn?.player).toBe('D');

    const all = cTurn('all');
    all.firstEliminationDone = true;
    expect(drawAndPlay(all, 'attack', 'B', '5').state.turn).toMatchObject({ player: 'B', isHunter: true });
  });
});

describe('end of the game (RULES 8)', () => {
  it('the last player standing wins', () => {
    const players = ['A', 'B', 'C'].map((id) => makePlayer(id));
    players[1]!.life = cards('2');
    players[2]!.eliminated = true;
    players[2]!.life = [];
    const { state: next, events } = drawAndPlay(makeState(players), 'attack', 'B', '5');
    expect(next.phase).toBe('finished');
    expect(next.winner).toBe('A');
    expect(events).toContainEqual({ type: 'gameOver', winner: 'A' });
  });

  it('a hunter can eliminate a player and end the game', () => {
    const players = ['A', 'B', 'C'].map((id) => makePlayer(id));
    players[0]!.life = cards('2');
    players[1]!.life = cards('2');
    let state = makeState(players, {
      turn: { player: 'C', drawn: null, drawnVisible: false, isHunter: false, resumeAfter: 'C' },
    });
    state = drawAndPlay(state, 'attack', 'B', '5').state; // B is eliminated, B hunts
    state = drawAndPlay(state, 'attack', 'A', '5').state; // B eliminates A
    expect(state.phase).toBe('finished');
    expect(state.winner).toBe('C');
  });
});
