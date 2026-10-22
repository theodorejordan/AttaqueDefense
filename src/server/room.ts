// The single game room: lobby, game, bots and disconnections. No network code: index.ts wires it to Socket.IO.
// See docs/DECISIONS.md > Lobby and server, and docs/RULES.md section 10.
import { randomUUID } from 'node:crypto';
import {
  type Command,
  DEFAULT_HUNTERS,
  DEFAULT_MAX_MUNITIONS,
  type GameEvent,
  type GameOptions,
  type GameState,
  HUNTER_LIMITS,
  MAX_PLAYERS,
  MIN_PLAYERS,
  MUNITION_LIMITS,
  OutOfCardsError,
  type PlayerId,
  type Result,
  type Rng,
  type Settings,
  allowedDeckCounts,
  applyCommand,
  createGame,
  eliminateAfterTimeout,
  getPlayer,
  hasChosenShield,
  randomBot,
  spectatorView,
  viewFor,
} from '../engine/index.ts';
import {
  type ChatMessage,
  MAX_CHAT_LENGTH,
  MAX_NAME_LENGTH,
  type Request,
  type RoomView,
  type Update,
} from '../shared/protocol.ts';
import { RoomError } from './validate.ts';

export const BOT_NAMES = ['Ada', 'Basile', 'Capucine', 'Dorian', 'Elsa', 'Firmin', 'Gaïa', 'Hector', 'Iris', 'Jules'];
/** Anti-spam: at most CHAT_LIMIT messages per client in CHAT_WINDOW_MS. */
const CHAT_LIMIT = 5;
const CHAT_WINDOW_MS = 10_000;
const CHAT_HISTORY = 100;

interface Seat {
  id: PlayerId;
  name: string;
  isBot: boolean;
  /** Secret given to a human when joining, to get the seat back after a reconnection. Never sent to other clients. */
  token: string | null;
  /** Connected browser tabs. */
  clients: Set<string>;
}

export interface RoomOptions {
  send: (clientId: string, update: Update) => void;
  sendChat: (clientId: string, message: ChatMessage) => void;
  rng: Rng;
  /** How long the room waits for a disconnected human (RULES 10, and lobby seats). */
  timeoutMs?: number;
  botDelayMs?: number;
  /** Longer, so humans can follow the attack animation. */
  botAttackDelayMs?: number;
}

type Timer = ReturnType<typeof setTimeout>;

export class Room {
  #send: RoomOptions['send'];
  #sendChat: RoomOptions['sendChat'];
  #rng: Rng;
  #timeoutMs: number;
  #botDelayMs: number;
  #botAttackDelayMs: number;

  /** Joining order. */
  #seats: Seat[] = [];
  /** Every connected client, with its seat, or null for a visitor (lobby) or a spectator (game). */
  #clients = new Map<string, PlayerId | null>();
  #settings: GameOptions = {};
  #game: GameState | null = null;
  #log: GameEvent[] = [];
  #outOfCards = false;
  #nextId = 1;
  #timeouts = new Map<PlayerId, Timer>();
  #botTimer: Timer | null = null;
  /** A bot's play, chosen while it looks at its target. */
  #botPlan: { botId: PlayerId; command: Command } | null = null;
  #lookingAt: PlayerId | null = null;
  #chat: ChatMessage[] = [];
  #nextChatId = 1;
  /** When each client sent its recent messages, for the anti-spam limit. */
  #chatTimes = new Map<string, number[]>();

  constructor(options: RoomOptions) {
    this.#send = options.send;
    this.#sendChat = options.sendChat;
    this.#rng = options.rng;
    this.#timeoutMs = options.timeoutMs ?? 60_000;
    this.#botDelayMs = options.botDelayMs ?? 1_500;
    this.#botAttackDelayMs = options.botAttackDelayMs ?? 4_000;
  }

  /** A new browser tab. A known token gets its seat back. */
  connect(clientId: string, token: string | undefined) {
    const seat = token ? this.#seats.find((s) => s.token === token) : undefined;
    seat?.clients.add(clientId);
    this.#clients.set(clientId, seat?.id ?? null);
    this.#changed([], clientId);
  }

  disconnect(clientId: string) {
    const seatId = this.#clients.get(clientId);
    this.#clients.delete(clientId);
    this.#chatTimes.delete(clientId);
    if (seatId) this.#seats.find((s) => s.id === seatId)?.clients.delete(clientId);
    this.#changed([]);
  }

  /** Throws a RoomError or an IllegalMoveError, to be sent back to that client only. */
  request(clientId: string, request: Request): { token?: string } {
    switch (request.type) {
      case 'join':
        return { token: this.#join(clientId, request.name) };
      case 'leave':
        this.#leave(clientId);
        break;
      case 'setSettings':
        this.#setSettings(clientId, request.settings);
        break;
      case 'addBot':
        this.#addBot(clientId);
        break;
      case 'removeBot':
        this.#removeBot(clientId, request.botId);
        break;
      case 'start':
        this.#start(clientId);
        break;
      case 'game':
        this.#play(clientId, request.command);
        break;
      case 'backToLobby':
        this.#backToLobby(clientId);
        break;
      case 'look':
        this.#look(clientId, request.target);
        break;
      case 'chat':
        this.#postChat(clientId, request.text);
        break;
    }
    return {};
  }

  /** Stops the timers (tests, server shutdown). */
  close() {
    this.#timeouts.forEach(clearTimeout);
    this.#timeouts.clear();
    if (this.#botTimer) clearTimeout(this.#botTimer);
    this.#botTimer = null;
  }

  // Lobby

  #join(clientId: string, rawName: string): string {
    this.#requireLobby();
    if (this.#clients.get(clientId)) throw new RoomError('alreadySeated');
    if (this.#seats.length >= MAX_PLAYERS) throw new RoomError('gameFull');
    const name = rawName.trim();
    if (!name || name.length > MAX_NAME_LENGTH) throw new RoomError('invalidName', `Names have 1 to ${MAX_NAME_LENGTH} characters`);
    if (this.#isNameTaken(name)) throw new RoomError('nameTaken');

    const token = randomUUID();
    const seat: Seat = { id: this.#newId(), name, isBot: false, token, clients: new Set([clientId]) };
    this.#seats.push(seat);
    this.#clients.set(clientId, seat.id);
    this.#changed([]);
    return token;
  }

  #leave(clientId: string) {
    this.#requireLobby();
    this.#removeSeat(this.#requireSeat(clientId));
    this.#changed([]);
  }

  #setSettings(clientId: string, settings: GameOptions) {
    this.#requireHost(clientId);
    this.#requireLobby();
    const { hunters, maxMunitions, deckCount } = settings;
    if (hunters !== undefined && (hunters < HUNTER_LIMITS.min || hunters > HUNTER_LIMITS.max)) {
      throw new RoomError('invalidSettings', `Hunters must be between ${HUNTER_LIMITS.min} and ${HUNTER_LIMITS.max}`);
    }
    if (maxMunitions !== undefined && (maxMunitions < MUNITION_LIMITS.min || maxMunitions > MUNITION_LIMITS.max)) {
      throw new RoomError('invalidSettings', `Max munitions must be between ${MUNITION_LIMITS.min} and ${MUNITION_LIMITS.max}`);
    }
    if (deckCount !== undefined && !allowedDeckCounts(this.#seats.length).includes(deckCount)) {
      throw new RoomError('invalidSettings', `${this.#seats.length} players cannot play with ${deckCount} deck(s)`);
    }
    this.#settings = { ...this.#settings, ...settings };
    this.#changed([]);
  }

  #addBot(clientId: string) {
    this.#requireHost(clientId);
    this.#requireLobby();
    if (this.#seats.length >= MAX_PLAYERS) throw new RoomError('gameFull');
    const name = BOT_NAMES.find((n) => !this.#isNameTaken(n)) ?? `Bot ${this.#nextId}`;
    this.#seats.push({ id: this.#newId(), name, isBot: true, token: null, clients: new Set() });
    this.#changed([]);
  }

  #removeBot(clientId: string, botId: PlayerId) {
    this.#requireHost(clientId);
    this.#requireLobby();
    const bot = this.#seats.find((s) => s.id === botId && s.isBot);
    if (!bot) throw new RoomError('unknownBot');
    this.#removeSeat(bot);
    this.#changed([]);
  }

  #start(clientId: string) {
    this.#requireHost(clientId);
    this.#requireLobby();
    if (this.#seats.length < MIN_PLAYERS) throw new RoomError('notEnoughPlayers', `A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`);
    const players = this.#seats.map(({ id, name }) => ({ id, name }));
    this.#game = createGame(players, this.#resolvedSettings(), this.#rng);
    this.#log = [];
    this.#outOfCards = false;
    this.#lookingAt = null;
    this.#botPlan = null;
    this.#changed([], 'all');
  }

  #backToLobby(clientId: string) {
    this.#requireHost(clientId);
    if (!this.#game) throw new RoomError('noGame');
    if (!this.#isOver()) throw new RoomError('gameNotOver');
    this.#game = null;
    this.#log = [];
    this.#outOfCards = false;
    this.#lookingAt = null;
    this.#botPlan = null;
    this.#changed([], 'all');
  }

  // Chat and "looking at"

  /** Public, and only while the active player chooses an action (RULES 10). Cleared by the next game event. */
  #look(clientId: string, target: PlayerId | null) {
    const seat = this.#requireSeat(clientId);
    const game = this.#game;
    if (!game) throw new RoomError('noGame');
    if (this.#isOver()) throw new RoomError('gameOver');
    if (game.turn?.player !== seat.id || !game.turn.drawn) throw new RoomError('illegalMove', 'Draw a card first, on your turn');
    if (target !== null && !game.players.some((p) => p.id === target && !p.eliminated)) {
      throw new RoomError('illegalMove', `Cannot look at ${target}`);
    }
    this.#lookingAt = target;
    this.#changed([]);
  }

  /** Players and spectators, in the lobby and during a game. */
  #postChat(clientId: string, rawText: string) {
    const text = rawText.trim();
    if (!text || text.length > MAX_CHAT_LENGTH) {
      throw new RoomError('invalidMessage', `Messages have 1 to ${MAX_CHAT_LENGTH} characters`);
    }
    const now = Date.now();
    const recent = (this.#chatTimes.get(clientId) ?? []).filter((time) => now - time < CHAT_WINDOW_MS);
    if (recent.length >= CHAT_LIMIT) throw new RoomError('chatTooFast');
    this.#chatTimes.set(clientId, [...recent, now]);

    const seat = this.#seats.find((s) => s.id === this.#clients.get(clientId));
    const message: ChatMessage = { id: this.#nextChatId++, from: seat?.id ?? null, name: seat?.name ?? null, text };
    this.#chat = [...this.#chat.slice(-(CHAT_HISTORY - 1)), message];
    for (const id of this.#clients.keys()) this.#sendChat(id, message);
  }

  // Game

  #play(clientId: string, command: Command) {
    const seat = this.#requireSeat(clientId);
    if (!this.#game) throw new RoomError('noGame');
    if (this.#isOver()) throw new RoomError('gameOver');
    const game = this.#game;
    this.#apply(() => applyCommand(game, seat.id, command));
  }

  /** Runs an engine function and sends the result to everyone. */
  #apply(run: () => Result) {
    let result: Result;
    try {
      result = run();
    } catch (error) {
      // Rare and accepted by the owner: the game just ends (RULES clarifications log).
      if (!(error instanceof OutOfCardsError)) throw error;
      this.#outOfCards = true;
      this.#changed([]);
      return;
    }
    this.#game = result.state;
    this.#log.push(...result.events);
    if (result.events.length > 0) this.#lookingAt = null;
    this.#changed(result.events);
  }

  #isOver(): boolean {
    return this.#game?.phase === 'finished' || this.#outOfCards;
  }

  // After each change

  /** `withLog`: a client that needs the whole log (just connected), or 'all' (a game started or ended). */
  #changed(events: GameEvent[], withLog: string | 'all' | null = null) {
    this.#refreshTimeouts();
    for (const [clientId, seatId] of this.#clients) {
      const update: Update = { room: this.#roomView(seatId), events };
      if (withLog === 'all' || withLog === clientId) update.log = [...this.#log];
      if (withLog === clientId) update.chat = [...this.#chat];
      this.#send(clientId, update);
    }
    this.#scheduleBot(events);
  }

  #roomView(seatId: PlayerId | null): RoomView {
    const game = this.#game;
    const isPlaying = seatId !== null && game !== null && game.players.some((p) => p.id === seatId);
    return {
      you: seatId,
      hostId: this.#hostId(),
      members: this.#seats.map((s) => ({
        id: s.id,
        name: s.name,
        isBot: s.isBot,
        connected: s.isBot || s.clients.size > 0,
      })),
      settings: this.#resolvedSettings(),
      deckCounts: allowedDeckCounts(this.#seats.length),
      game: game && (isPlaying ? viewFor(game, seatId!) : spectatorView(game)),
      outOfCards: this.#outOfCards,
      spectatorCount: [...this.#clients.values()].filter((seat) => seat === null).length,
      lookingAt: this.#lookingAt,
    };
  }

  /** Starts or cancels the timer of each disconnected human. */
  #refreshTimeouts() {
    for (const seat of this.#seats) {
      const timer = this.#timeouts.get(seat.id);
      const isHoldingUp = !seat.isBot && seat.clients.size === 0 && this.#needs(seat.id);
      if (isHoldingUp && !timer) {
        this.#timeouts.set(seat.id, setTimeout(() => this.#safely(() => this.#timedOut(seat.id)), this.#timeoutMs));
      } else if (!isHoldingUp && timer) {
        clearTimeout(timer);
        this.#timeouts.delete(seat.id);
      }
    }
  }

  /** True if the room cannot go on without this player: any lobby seat, or a game waiting for them (RULES 10). */
  #needs(id: PlayerId): boolean {
    const game = this.#game;
    if (!game) return true;
    if (this.#outOfCards) return false;
    if (game.phase === 'choosingShields') return !hasChosenShield(getPlayer(game, id));
    return game.phase === 'playing' && game.turn?.player === id;
  }

  #timedOut(id: PlayerId) {
    this.#timeouts.delete(id);
    const seat = this.#seats.find((s) => s.id === id);
    if (!seat) return;
    if (this.#game) {
      const game = this.#game;
      this.#apply(() => eliminateAfterTimeout(game, id));
    } else {
      this.#removeSeat(seat);
      this.#changed([]);
    }
  }

  /** One bot move at a time, after a delay so humans can follow. */
  #scheduleBot(events: GameEvent[]) {
    if (this.#botTimer || !this.#nextBotMove()) return;
    const delay = events.some((e) => e.type === 'attacked') ? this.#botAttackDelayMs : this.#botDelayMs;
    this.#botTimer = setTimeout(() => {
      this.#botTimer = null;
      // The game may have changed during the delay: pick the move now.
      this.#safely(() => {
        const move = this.#nextBotMove();
        if (!move) return;
        // Like a human, a bot first looks at its target, then plays (RULES 10).
        if (move.command.type === 'play' && this.#botPlan?.botId !== move.botId) {
          this.#botPlan = move;
          this.#lookingAt = move.command.play.target;
          this.#changed([]);
          return;
        }
        const command = this.#botPlan?.botId === move.botId ? this.#botPlan.command : move.command;
        this.#botPlan = null;
        this.#apply(() => applyCommand(this.#game!, move.botId, command));
      });
    }, delay);
  }

  #nextBotMove(): { botId: PlayerId; command: Command } | null {
    const game = this.#game;
    if (!game || this.#isOver()) return null;
    for (const seat of this.#seats) {
      if (!seat.isBot) continue;
      // Bots get the same filtered view as humans: they never cheat.
      const command = randomBot(viewFor(game, seat.id), this.#rng);
      if (command) return { botId: seat.id, command };
    }
    return null;
  }

  /** A timer callback must never crash the server. */
  #safely(run: () => void) {
    try {
      run();
    } catch (error) {
      console.error(error);
    }
  }

  // Helpers

  #requireLobby() {
    if (this.#game) throw new RoomError('gameInProgress');
  }

  #requireSeat(clientId: string): Seat {
    const seatId = this.#clients.get(clientId);
    const seat = this.#seats.find((s) => s.id === seatId);
    if (!seat) throw new RoomError('notSeated');
    return seat;
  }

  #requireHost(clientId: string) {
    if (this.#clients.get(clientId) !== this.#hostId() || this.#hostId() === null) {
      throw new RoomError('notHost');
    }
  }

  /** The first connected human, in joining order: the host is always someone present. */
  #hostId(): PlayerId | null {
    return this.#seats.find((s) => !s.isBot && s.clients.size > 0)?.id ?? null;
  }

  #removeSeat(seat: Seat) {
    for (const clientId of seat.clients) this.#clients.set(clientId, null);
    this.#seats = this.#seats.filter((s) => s !== seat);
    const timer = this.#timeouts.get(seat.id);
    if (timer) clearTimeout(timer);
    this.#timeouts.delete(seat.id);
  }

  #resolvedSettings(): Settings {
    const allowed = allowedDeckCounts(this.#seats.length);
    const { hunters, maxMunitions, deckCount } = this.#settings;
    return {
      hunters: hunters ?? DEFAULT_HUNTERS,
      maxMunitions: maxMunitions ?? DEFAULT_MAX_MUNITIONS,
      // A deck count chosen for more players falls back to the default (RULES 2).
      deckCount: deckCount !== undefined && allowed.includes(deckCount) ? deckCount : allowed[0]!,
    };
  }

  #isNameTaken(name: string): boolean {
    return this.#seats.some((s) => s.name.toLowerCase() === name.toLowerCase());
  }

  #newId(): PlayerId {
    return `p${this.#nextId++}`;
  }
}
