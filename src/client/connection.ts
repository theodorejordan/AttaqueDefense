// The link to the server, shared by every screen: Socket.IO, the seat token, and the latest state the server sent.
// Components read it with `useConnection()` and act with `send()`. See docs/DECISIONS.md > Lobby and server.
import { useEffect, useState } from 'preact/hooks';
import { type Socket, io } from 'socket.io-client';
import type { GameEvent } from '../engine/state.ts';
import type {
  ChatMessage,
  ClientToServerEvents,
  ErrorCode,
  Request,
  RoomView,
  ServerToClientEvents,
  Update,
} from '../shared/protocol.ts';

export interface ConnectionState {
  connected: boolean;
  /** Null until the first update. */
  room: RoomView | null;
  log: GameEvent[];
  chat: ChatMessage[];
  /** The last refused request, as a code: each screen translates it. */
  error: { code: ErrorCode; detail?: string } | null;
}

// In dev mode each tab is a separate player (docs/DECISIONS.md > Lobby and server).
const storage = import.meta.env.DEV ? sessionStorage : localStorage;
const TOKEN_KEY = 'attaque-defense-token';
const CHAT_KEPT = 100;

let state: ConnectionState = { connected: false, room: null, log: [], chat: [], error: null };
const listeners = new Set<() => void>();
const updateListeners = new Set<(update: Update) => void>();

function update(patch: Partial<ConnectionState>) {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  // A function, so each reconnection sends the latest token.
  auth: (send) => send({ token: storage.getItem(TOKEN_KEY) ?? undefined }),
});

socket.on('connect', () => update({ connected: true }));
socket.on('disconnect', () => update({ connected: false }));
socket.on('update', (message) => {
  update({
    room: message.room,
    log: message.log ?? [...state.log, ...message.events],
    chat: message.chat ?? state.chat,
  });
  updateListeners.forEach((listener) => listener(message));
});
socket.on('chat', (message) => update({ chat: [...state.chat, message].slice(-CHAT_KEPT) }));

/** Sends a request. Resolves to true if the server accepted it; otherwise the error is kept in the state. */
export function send(request: Request): Promise<boolean> {
  return new Promise((resolve) => {
    socket.emit('request', request, (reply) => {
      if (reply.ok) {
        if (reply.token) storage.setItem(TOKEN_KEY, reply.token);
        if (request.type === 'leave' || request.type === 'leaveGame') storage.removeItem(TOKEN_KEY);
        update({ error: null });
      } else {
        update({ error: { code: reply.error, detail: reply.detail } });
      }
      resolve(reply.ok);
    });
  });
}

export function clearError() {
  update({ error: null });
}

/** Re-renders the calling component whenever the server sends something. */
export function useConnection(): ConnectionState {
  const [, setVersion] = useState(0);
  useEffect(() => {
    const listener = () => setVersion((version) => version + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return state;
}

/**
 * Calls `listener` with each update from the server, in order: the table plays them back (table/playback.ts).
 * `events` only holds new events: the log sent on (re)connection is never replayed. Returns the function that stops listening.
 */
export function onUpdate(listener: (update: Update) => void): () => void {
  updateListeners.add(listener);
  return () => {
    updateListeners.delete(listener);
  };
}
