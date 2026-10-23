import { describe, expect, it } from 'vitest';
import { draw, eliminateAfterTimeout, flipSidePot, leaveGame, legalPlays, play } from './actions.ts';
import { type ActionType, type GameState, OutOfCardsError, type PlayerId } from './state.ts';
import { card, cards, makePlayer, makeState, testSettings, values } from './test-helpers.ts';

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

  it('refuses to draw from an empty deck: the side pot must be flipped first (RULES 7)', () => {
    const state = makeState(fourPlayers(), { sidePot: cards('3', '7', 'K') });
    expect(() => draw(state, 'A')).toThrow('Flip the side pot first');
  });
});

describe('flipSidePot (RULES 7)', () => {
  it('turns the side pot into the draw deck without shuffling, then the player draws', () => {
    const state = makeState(fourPlayers(), { sidePot: cards('3', '7', 'K') }); // K on top
    const { state: flipped, events } = flipSidePot(state, 'A');
    expect(values(flipped.drawDeck)).toEqual([3, 7, 13]); // oldest card is now on top
    expect(flipped.sidePot).toEqual([]);
    expect(events).toEqual([{ type: 'deckFlipped', player: 'A', cardCount: 3 }]);
    expect(values([draw(flipped, 'A').state.turn!.drawn!])).toEqual([3]);
  });

  it('is only possible for the active player, before drawing, with an empty deck', () => {
    const empty = makeState(fourPlayers(), { sidePot: cards('3', '7') });
    expect(() => flipSidePot(empty, 'B')).toThrow('Not your turn');
    expect(() => flipSidePot(makeState(fourPlayers(), { drawDeck: cards('5'), sidePot: cards('3') }), 'A')).toThrow(
      'The draw deck is not empty',
    );
    const drawn = draw(flipSidePot(empty, 'A').state, 'A').state;
    expect(() => flipSidePot(drawn, 'A')).toThrow('Already drawn');
  });

  it('runs out of cards when the side pot is empty too', () => {
    expect(() => flipSidePot(makeState(fourPlayers()), 'A')).toThrow(OutOfCardsError);
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
  it('cannot give a munition to a player who holds the maximum (5 by default)', () => {
    const players = fourPlayers();
    players[2]!.munitions = cards('2', '3', '4', '5', '6');
    const state = draw(makeState(players, { drawDeck: cards('K') }), 'A').state;
    expect(legalPlays(state, 'A')).not.toContainEqual({ type: 'munition', target: 'C' });
    expect(() => play(state, 'A', { type: 'munition', target: 'C' })).toThrow();
  });

  it('follows the max munitions setting', () => {
    const players = fourPlayers();
    players[2]!.munitions = cards('2', '3');
    const state = draw(makeState(players, { drawDeck: cards('K'), settings: testSettings({ maxMunitions: 2 }) }), 'A').state;
    expect(legalPlays(state, 'A')).not.toContainEqual({ type: 'munition', target: 'C' });
  });

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
  const cTurn = (hunters = 1, eliminationCount = 0) => {
    const players = fourPlayers();
    players[1]!.life = cards('2');
    return makeState(players, {
      settings: testSettings({ hunters }),
      eliminationCount,
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
    const next = drawAndPlay(cTurn(1, 1), 'attack', 'B', '5').state;
    expect(next.turn).toMatchObject({ player: 'D', isHunter: false });
  });

  it('can be turned off', () => {
    expect(drawAndPlay(cTurn(0), 'attack', 'B', '5').state.turn?.player).toBe('D');
  });

  it('can apply to the first 2 or 3 eliminated players', () => {
    expect(drawAndPlay(cTurn(2, 1), 'attack', 'B', '5').state.turn).toMatchObject({ player: 'B', isHunter: true });
    expect(drawAndPlay(cTurn(3, 2), 'attack', 'B', '5').state.turn).toMatchObject({ player: 'B', isHunter: true });
    expect(drawAndPlay(cTurn(3, 3), 'attack', 'B', '5').state.turn).toMatchObject({ player: 'D', isHunter: false });
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

describe('timeout elimination (RULES 10)', () => {
  it('eliminates the active player, discards their drawn card and passes the turn', () => {
    const players = fourPlayers();
    players[0]!.munitions = cards('4');
    const drawn = draw(makeState(players, { drawDeck: cards('9') }), 'A').state;
    const { state: next, events } = eliminateAfterTimeout(drawn, 'A');
    expect(player(next, 'A').eliminated).toBe(true);
    expect(values(next.sidePot)).toEqual([5, 5, 5, 4, 9]);
    expect(next.turn).toMatchObject({ player: 'B', isHunter: false, drawn: null });
    expect(events.map((e) => e.type)).toEqual(['timedOut', 'eliminated', 'turnStarted']);
  });

  it('does not count towards the hunter setting', () => {
    const players = fourPlayers();
    players[2]!.life = cards('2');
    let state = eliminateAfterTimeout(makeState(players), 'A').state; // B's turn, no hunter for A
    expect(state.eliminationCount).toBe(0);
    state = drawAndPlay(state, 'attack', 'C', '5').state;
    expect(state.turn).toMatchObject({ player: 'C', isHunter: true });
  });

  it('cancels a hunter turn, and play resumes', () => {
    const players = fourPlayers();
    players[1]!.eliminated = true;
    players[1]!.life = [];
    const state = makeState(players, {
      turn: { player: 'B', drawn: null, drawnVisible: false, isHunter: true, resumeAfter: 'C' },
    });
    expect(eliminateAfterTimeout(state, 'B').state.turn).toMatchObject({ player: 'D', isHunter: false });
  });

  it('ends the game when one player is left', () => {
    const players = ['A', 'B', 'C'].map((id) => makePlayer(id));
    players[2]!.eliminated = true;
    players[2]!.life = [];
    const { state: next } = eliminateAfterTimeout(makeState(players), 'A');
    expect(next.phase).toBe('finished');
    expect(next.winner).toBe('B');
  });
});

describe('leaving the game (RULES 10)', () => {
  it('works like a timeout: eliminated, drawn card discarded, no hunter turn', () => {
    const drawn = draw(makeState(fourPlayers(), { drawDeck: cards('9') }), 'A').state;
    const { state: next, events } = leaveGame(drawn, 'A');
    expect(player(next, 'A').eliminated).toBe(true);
    expect(values(next.sidePot)).toEqual([5, 5, 5, 9]);
    expect(next.eliminationCount).toBe(0);
    expect(events.map((e) => e.type)).toEqual(['left', 'eliminated', 'turnStarted']);
  });

  it('lets a player leave when it is not their turn', () => {
    const { state: next } = leaveGame(makeState(fourPlayers()), 'C');
    expect(player(next, 'C').eliminated).toBe(true);
    expect(next.turn).toMatchObject({ player: 'A' });
  });
});
