// Builders for hand-made game states in tests.
import { type Card, type Rank, type Suit, cardValue } from './cards.ts';
import type { GameState, Player, Settings } from './state.ts';

export function card(rank: Rank, suit: Suit = 'hearts', deck = 0): Card {
  return { rank, suit, deck };
}

export function cards(...ranks: Rank[]): Card[] {
  return ranks.map((rank) => card(rank));
}

export function values(list: readonly Card[]): number[] {
  return list.map(cardValue);
}

export function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    name: id,
    dealt: [],
    life: cards('5', '5', '5'),
    shield: null,
    munitions: [],
    preference: 'normal',
    eliminated: false,
    ...overrides,
  };
}

export function testSettings(overrides: Partial<Settings> = {}): Settings {
  return { hunters: 1, deckCount: 1, maxMunitions: 5, ...overrides };
}

/** A running game where it is the first player's turn. */
export function makeState(players: Player[], overrides: Partial<GameState> = {}): GameState {
  const first = players[0]!.id;
  return {
    settings: testSettings(),
    phase: 'playing',
    players,
    drawDeck: [],
    sidePot: [],
    turn: { player: first, drawn: null, drawnVisible: false, isHunter: false, resumeAfter: first },
    tieBreakOrder: players.map((p) => p.id),
    eliminationCount: 0,
    winner: null,
    ...overrides,
  };
}
