import type { Card } from './cards.ts';

export type PlayerId = string;
export type DamagePreference = 'fewestCards' | 'lowestMax' | 'normal';
export type HunterRule = 'off' | 'firstOnly' | 'all';
export type ActionType = 'attack' | 'defense' | 'munition';

/** Game settings, resolved when the game is created. */
export interface Settings {
  hunterRule: HunterRule;
  /** 1 or 2, depending on the number of players (RULES 2). */
  deckCount: number;
  /** Most munitions a player can hold (RULES 5.3). */
  maxMunitions: number;
}

/** What the host chooses when creating a game. Anything left out gets its default. */
export type GameOptions = Partial<Settings>;

export interface Player {
  id: PlayerId;
  name: string;
  /** The 4 face-down cards dealt at setup. Empty once the shield is chosen. */
  dealt: Card[];
  life: Card[];
  shield: Card | null;
  munitions: Card[];
  preference: DamagePreference;
  eliminated: boolean;
}

export interface Turn {
  player: PlayerId;
  /** The card drawn this turn, waiting to be played. */
  drawn: Card | null;
  /** True if the player sees the drawn card (Ace shield when drawing, RULES 5.4). */
  drawnVisible: boolean;
  isHunter: boolean;
  /** The player whose regular turn it is. Play resumes clockwise after them (RULES 4, 8.2). */
  resumeAfter: PlayerId;
}

export interface GameState {
  settings: Settings;
  phase: 'choosingShields' | 'playing' | 'finished';
  /** Seating order = clockwise playing order. */
  players: Player[];
  /** Face-down. Index 0 is the top. */
  drawDeck: Card[];
  /** Face-up. The last element is the top. */
  sidePot: Card[];
  turn: Turn | null;
  /** Random order used when the first-player rule ends in a tie (RULES 3). */
  tieBreakOrder: PlayerId[];
  firstEliminationDone: boolean;
  winner: PlayerId | null;
}

export interface Play {
  type: ActionType;
  target: PlayerId;
}

export type Command =
  | { type: 'chooseShield'; cardIndex: number }
  | { type: 'draw' }
  | { type: 'play'; play: Play }
  | { type: 'setPreference'; preference: DamagePreference };

/** Public events: they never contain a hidden card. */
export type GameEvent =
  | { type: 'shieldChosen'; player: PlayerId }
  | { type: 'gameStarted'; firstPlayer: PlayerId }
  | { type: 'turnStarted'; player: PlayerId }
  | { type: 'hunterTurn'; player: PlayerId }
  | { type: 'deckFlipped'; cardCount: number }
  | { type: 'drew'; player: PlayerId }
  | {
      type: 'attacked';
      attacker: PlayerId;
      target: PlayerId;
      cards: Card[];
      total: number;
      shield: Card | null;
      shieldDestroyed: boolean;
      damage: number;
    }
  | { type: 'damaged'; player: PlayerId; damage: number; before: Card[]; after: Card[] }
  | { type: 'munitionsLost'; player: PlayerId; cards: Card[] }
  | { type: 'eliminated'; player: PlayerId }
  | { type: 'shieldPlaced'; by: PlayerId; target: PlayerId; card: Card; replaced: Card | null }
  | { type: 'munitionGiven'; by: PlayerId; target: PlayerId }
  | { type: 'gameOver'; winner: PlayerId | null };

export interface Result {
  state: GameState;
  events: GameEvent[];
}

export class IllegalMoveError extends Error {
  override name = 'IllegalMoveError';
}

/**
 * The draw deck and the side pot are both empty. The rules make this impossible in practice
 * (enough decks for the number of players, at most 5 munitions each, RULES 2 and 5.3), so it signals a bug.
 */
export class OutOfCardsError extends Error {
  override name = 'OutOfCardsError';
}

/** Cards are immutable, so only arrays and player objects need copying. */
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    settings: { ...state.settings },
    players: state.players.map((p) => ({
      ...p,
      dealt: [...p.dealt],
      life: [...p.life],
      munitions: [...p.munitions],
    })),
    drawDeck: [...state.drawDeck],
    sidePot: [...state.sidePot],
    turn: state.turn && { ...state.turn },
    tieBreakOrder: [...state.tieBreakOrder],
  };
}

export function getPlayer(state: GameState, id: PlayerId): Player {
  const player = state.players.find((p) => p.id === id);
  if (!player) throw new IllegalMoveError(`Unknown player: ${id}`);
  return player;
}
