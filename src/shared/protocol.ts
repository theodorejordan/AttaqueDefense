// Messages between the browsers and the server (Socket.IO). See docs/DECISIONS.md > Lobby and server.
import type { Command, GameEvent, GameOptions, PlayerId, PlayerView, Settings, SpectatorView } from '../engine/index.ts';

export interface Member {
  id: PlayerId;
  name: string;
  isBot: boolean;
  /** Bots are always connected. */
  connected: boolean;
}

/** Everything one client may see about the room. */
export interface RoomView {
  /** Your seat, or null if you are only watching. */
  you: PlayerId | null;
  /** The first connected human, in joining order. */
  hostId: PlayerId | null;
  /** Joining order. The game shuffles the seating. */
  members: Member[];
  /** Settings for the next game, defaults filled in. */
  settings: Settings;
  /** Deck counts allowed for the current number of members (RULES 2). */
  deckCounts: number[];
  /** The current or last game, null in the lobby. A spectator gets public information only. */
  game: PlayerView | SpectatorView | null;
  /** The game stopped because no cards were left (RULES clarifications log). */
  outOfCards: boolean;
}

export interface Update {
  room: RoomView;
  /** New public events since the last update, in order. */
  events: GameEvent[];
  /** The whole log of the current game: only sent on (re)connection and when a game starts or ends. */
  log?: GameEvent[];
}

/** Single entry point for everything a client asks, like `applyCommand` in the engine. */
export type Request =
  | { type: 'join'; name: string }
  | { type: 'leave' }
  | { type: 'setSettings'; settings: GameOptions }
  | { type: 'addBot' }
  | { type: 'removeBot'; botId: PlayerId }
  | { type: 'start' }
  | { type: 'game'; command: Command }
  | { type: 'backToLobby' };

/**
 * The server never sends text: each client translates the code into its player's language (docs/DECISIONS.md > Languages).
 * `illegalMove` covers engine errors, which the UI prevents. `detail` is English, for debugging only.
 */
export type ErrorCode =
  | 'invalidRequest'
  | 'invalidName'
  | 'nameTaken'
  | 'gameFull'
  | 'alreadySeated'
  | 'notSeated'
  | 'notHost'
  | 'notEnoughPlayers'
  | 'invalidSettings'
  | 'unknownBot'
  | 'gameInProgress'
  | 'noGame'
  | 'gameNotOver'
  | 'gameOver'
  | 'illegalMove'
  | 'serverError';

/** `token` is only set after joining: the client keeps it to get its seat back after a reconnection. */
export type Reply = { ok: true; token?: string } | { ok: false; error: ErrorCode; detail?: string };

/** Typed Socket.IO events: https://socket.io/docs/v4/typescript/ */
export interface ServerToClientEvents {
  update: (update: Update) => void;
}

export interface ClientToServerEvents {
  request: (request: Request, reply: (reply: Reply) => void) => void;
}

/** Sent in the Socket.IO handshake: https://socket.io/docs/v4/middlewares/#sending-credentials */
export interface HandshakeAuth {
  token?: string;
}

export const MAX_NAME_LENGTH = 20;
