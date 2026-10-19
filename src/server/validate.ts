// Clients are untrusted: every payload is checked before it reaches the room or the engine.
// Only the shape is checked here. Game rules (whose turn, legal targets, setting limits) are checked by the room and the engine.
import type { ActionType, Command, DamagePreference, GameOptions } from '../engine/index.ts';
import type { ErrorCode, Request } from '../shared/protocol.ts';

export class RoomError extends Error {
  override name = 'RoomError';
  code: ErrorCode;

  /** The message starts with the code, so tests can match it. */
  constructor(code: ErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.code = code;
  }
}

const ACTION_TYPES: readonly ActionType[] = ['attack', 'defense', 'munition'];
const PREFERENCES: readonly DamagePreference[] = ['fewestCards', 'lowestMax', 'normal'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function string(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new RoomError('invalidRequest', `Invalid ${field}`);
  return value;
}

function integer(value: unknown, field: string): number {
  if (!Number.isInteger(value)) throw new RoomError('invalidRequest', `Invalid ${field}`);
  return value as number;
}

function optionalInteger(value: unknown, field: string): number | undefined {
  return value === undefined ? undefined : integer(value, field);
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (!allowed.includes(value as T)) throw new RoomError('invalidRequest', `Invalid ${field}`);
  return value as T;
}

export function parseRequest(value: unknown): Request {
  if (!isObject(value)) throw new RoomError('invalidRequest');
  switch (value.type) {
    case 'join':
      return { type: 'join', name: string(value.name, 'name') };
    case 'leave':
    case 'addBot':
    case 'start':
    case 'backToLobby':
      return { type: value.type };
    case 'setSettings':
      return { type: 'setSettings', settings: parseSettings(value.settings) };
    case 'removeBot':
      return { type: 'removeBot', botId: string(value.botId, 'bot') };
    case 'game':
      return { type: 'game', command: parseCommand(value.command) };
    default:
      throw new RoomError('invalidRequest');
  }
}

function parseSettings(value: unknown): GameOptions {
  if (!isObject(value)) throw new RoomError('invalidRequest', 'Invalid settings');
  const settings: GameOptions = {};
  const hunters = optionalInteger(value.hunters, 'hunters');
  const deckCount = optionalInteger(value.deckCount, 'deck count');
  const maxMunitions = optionalInteger(value.maxMunitions, 'max munitions');
  if (hunters !== undefined) settings.hunters = hunters;
  if (deckCount !== undefined) settings.deckCount = deckCount;
  if (maxMunitions !== undefined) settings.maxMunitions = maxMunitions;
  return settings;
}

function parseCommand(value: unknown): Command {
  if (!isObject(value)) throw new RoomError('invalidRequest', 'Invalid command');
  switch (value.type) {
    case 'chooseShield':
      return { type: 'chooseShield', cardIndex: integer(value.cardIndex, 'card') };
    case 'draw':
      return { type: 'draw' };
    case 'play': {
      if (!isObject(value.play)) throw new RoomError('invalidRequest', 'Invalid play');
      const { type, target } = value.play;
      return { type: 'play', play: { type: oneOf(type, ACTION_TYPES, 'action'), target: string(target, 'target') } };
    }
    case 'setPreference':
      return { type: 'setPreference', preference: oneOf(value.preference, PREFERENCES, 'preference') };
    default:
      throw new RoomError('invalidRequest', 'Invalid command');
  }
}
