// See docs/RULES.md sections 1 and 3.
import { cardValue, createDeck, sumValues } from './cards.ts';
import { type Rng, shuffle } from './rng.ts';
import {
  type GameEvent,
  type GameState,
  IllegalMoveError,
  type Player,
  type PlayerId,
  type Result,
  type Settings,
  cloneState,
  getPlayer,
} from './state.ts';

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 10;
export const CARDS_DEALT = 4;

export const DEFAULT_SETTINGS: Settings = { hunterRule: 'firstOnly' };

export interface NewPlayer {
  id: PlayerId;
  name: string;
}

export function createGame(newPlayers: NewPlayer[], settings: Settings, rng: Rng): GameState {
  if (newPlayers.length < MIN_PLAYERS || newPlayers.length > MAX_PLAYERS) {
    throw new IllegalMoveError(`A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
  }
  if (new Set(newPlayers.map((p) => p.id)).size !== newPlayers.length) {
    throw new IllegalMoveError('Player ids must be unique');
  }

  const deck = shuffle(createDeck(), rng);
  const players: Player[] = shuffle(newPlayers, rng).map(({ id, name }) => ({
    id,
    name,
    dealt: deck.splice(0, CARDS_DEALT),
    life: [],
    shield: null,
    munitions: [],
    preference: 'normal',
    eliminated: false,
  }));

  return {
    settings: { ...settings },
    phase: 'choosingShields',
    players,
    drawDeck: deck,
    sidePot: [],
    turn: null,
    tieBreakOrder: shuffle(players.map((p) => p.id), rng),
    firstEliminationDone: false,
    winner: null,
  };
}

export function hasChosenShield(player: Player): boolean {
  return player.dealt.length === 0;
}

/** Blind shield choice (RULES 3). All players choose at the same time. */
export function chooseShield(state: GameState, playerId: PlayerId, cardIndex: number): Result {
  if (state.phase !== 'choosingShields') throw new IllegalMoveError('Shields are already chosen');
  if (hasChosenShield(getPlayer(state, playerId))) throw new IllegalMoveError('Shield already chosen');
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= CARDS_DEALT) {
    throw new IllegalMoveError(`Card index must be between 0 and ${CARDS_DEALT - 1}`);
  }

  const next = cloneState(state);
  const player = getPlayer(next, playerId);
  player.shield = player.dealt[cardIndex]!;
  player.life = player.dealt.filter((_, i) => i !== cardIndex);
  player.dealt = [];
  const events: GameEvent[] = [{ type: 'shieldChosen', player: playerId }];

  if (next.players.every(hasChosenShield)) {
    const first = firstPlayer(next);
    next.phase = 'playing';
    next.turn = { player: first, drawn: null, drawnVisible: false, isHunter: false, resumeAfter: first };
    events.push({ type: 'gameStarted', firstPlayer: first }, { type: 'turnStarted', player: first });
  }
  return { state: next, events };
}

/** Lowest life, then lowest shield, then random (RULES 3). */
function firstPlayer(state: GameState): PlayerId {
  const tieRank = (id: PlayerId) => state.tieBreakOrder.indexOf(id);
  const sorted = [...state.players].sort(
    (a, b) =>
      sumValues(a.life) - sumValues(b.life) ||
      cardValue(a.shield!) - cardValue(b.shield!) ||
      tieRank(a.id) - tieRank(b.id),
  );
  return sorted[0]!.id;
}
