import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { type PlayerView, createRng, randomBot } from '../engine/index.ts';
import type { ChatMessage, Update } from '../shared/protocol.ts';
import { Room, type RoomOptions } from './room.ts';

const MINUTE = 60_000;

/** A room that records what each client receives. Timers are fake: `vi.advanceTimersByTime` moves the clock. */
function setup(options: Partial<RoomOptions> = {}) {
  const sent = new Map<string, Update[]>();
  const chats = new Map<string, ChatMessage[]>();
  const room = new Room({
    send: (clientId, update) => sent.set(clientId, [...(sent.get(clientId) ?? []), update]),
    sendChat: (clientId, message) => chats.set(clientId, [...(chats.get(clientId) ?? []), message]),
    rng: createRng(1),
    ...options,
  });
  rooms.push(room);
  const last = (clientId: string) => sent.get(clientId)!.at(-1)!;
  const view = (clientId: string) => last(clientId).room;
  const join = (clientId: string, name: string) => {
    room.connect(clientId, undefined);
    return room.request(clientId, { type: 'join', name }).token!;
  };
  return { room, sent, chats, last, view, join };
}

const rooms: Room[] = [];
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  rooms.splice(0).forEach((room) => room.close());
  vi.useRealTimers();
});

/** Three humans who have chosen their shields: the game is waiting for the first player. */
function threeHumansPlaying() {
  const ctx = setup();
  const tokens = Object.fromEntries(['A', 'B', 'C'].map((name) => [name, ctx.join(name, name)]));
  ctx.room.request('A', { type: 'start' });
  ['A', 'B', 'C'].forEach((c) => ctx.room.request(c, { type: 'game', command: { type: 'chooseShield', cardIndex: 0 } }));
  const game = () => ctx.view('A').game!;
  const clientOf = (playerId: string) => ['A', 'B', 'C'].find((c) => ctx.view(c).you === playerId)!;
  return { ...ctx, tokens, game, clientOf };
}

describe('lobby', () => {
  it('makes the first human the host and shows visitors the lobby without a seat', () => {
    const { room, view, join } = setup();
    join('a', 'Alice');
    join('b', 'Bob');
    room.connect('v', undefined);
    expect(view('v').you).toBeNull();
    expect(view('v').hostId).toBe(view('a').you);
    expect(view('v').members.map((m) => m.name)).toEqual(['Alice', 'Bob']);
  });

  it('lets only the host change settings, manage bots and start', () => {
    const { room, view, join } = setup();
    join('a', 'Alice');
    join('b', 'Bob');
    expect(() => room.request('b', { type: 'addBot' })).toThrow('notHost');
    expect(() => room.request('b', { type: 'start' })).toThrow('notHost');
    expect(() => room.request('b', { type: 'setSettings', settings: { hunters: 2 } })).toThrow('notHost');

    room.request('a', { type: 'addBot' });
    room.request('a', { type: 'setSettings', settings: { hunters: 2, maxMunitions: 3 } });
    const bot = view('b').members.find((m) => m.isBot)!;
    expect(bot).toMatchObject({ name: 'Ada', connected: true });
    expect(view('b').settings).toEqual({ hunters: 2, maxMunitions: 3, deckCount: 1 });

    room.request('a', { type: 'removeBot', botId: bot.id });
    expect(view('b').members).toHaveLength(2);
  });

  it('checks names, the 10-seat limit and the 3-player minimum', () => {
    const { room, join } = setup();
    join('a', '  Alice ');
    expect(() => join('b', 'alice')).toThrow('nameTaken');
    expect(() => join('c', '   ')).toThrow('invalidName');
    expect(() => room.request('a', { type: 'start' })).toThrow('notEnoughPlayers');
    for (let i = 0; i < 9; i++) room.request('a', { type: 'addBot' });
    expect(() => room.request('a', { type: 'addBot' })).toThrow('gameFull');
    expect(() => join('d', 'Dan')).toThrow('gameFull');
  });

  it('checks setting limits, and falls back to the default deck count when players leave (RULES 2)', () => {
    const { room, view, join } = setup();
    join('a', 'Alice');
    expect(() => room.request('a', { type: 'setSettings', settings: { hunters: 4 } })).toThrow('invalidSettings');
    expect(() => room.request('a', { type: 'setSettings', settings: { deckCount: 2 } })).toThrow('invalidSettings');
    for (let i = 0; i < 5; i++) room.request('a', { type: 'addBot' });
    room.request('a', { type: 'setSettings', settings: { deckCount: 2 } });
    expect(view('a').settings.deckCount).toBe(2);
    room.request('a', { type: 'removeBot', botId: view('a').members.at(-1)!.id });
    expect(view('a').settings.deckCount).toBe(1);
  });

  it('passes the host role to the next connected human', () => {
    const { room, view, join } = setup();
    join('a', 'Alice');
    join('b', 'Bob');
    room.request('a', { type: 'leave' });
    expect(view('a').you).toBeNull();
    expect(view('a').hostId).toBe(view('b').you);
  });

  it('frees the seat of a human disconnected for 1 minute, unless they come back', () => {
    const { room, view, join } = setup();
    const aliceToken = join('a', 'Alice');
    join('b', 'Bob');
    room.disconnect('b');
    room.disconnect('a');
    vi.advanceTimersByTime(MINUTE - 1);
    room.connect('a2', aliceToken);
    vi.advanceTimersByTime(1);
    expect(view('a2').members.map((m) => m.name)).toEqual(['Alice']);
  });
});

describe('game', () => {
  it('plays a whole game with bots, then everyone goes back to the lobby', () => {
    const { room, view, last, sent, join } = setup();
    const token = join('h', 'Human');
    for (let i = 0; i < 3; i++) room.request('h', { type: 'addBot' });
    room.connect('s', undefined); // a spectator
    room.request('h', { type: 'start' });
    expect(last('h').log).toEqual([]);

    const rng = createRng(2);
    for (let step = 0; step < 5000 && view('h').game!.phase !== 'finished'; step++) {
      const command = randomBot(view('h').game as PlayerView, rng);
      if (command) room.request('h', { type: 'game', command });
      else vi.advanceTimersByTime(4_000);
    }
    expect(view('h').game!.phase).toBe('finished');
    expect(last('h').events.at(-1)?.type).toBe('gameOver');
    expect(() => room.request('s', { type: 'join', name: 'Late' })).toThrow('gameInProgress');

    // What each client received: its own view only, the spectator public information only, never a token.
    for (const update of sent.get('h')!) {
      if (update.room.game) expect(update.room.game).toMatchObject({ you: update.room.you });
    }
    for (const { room: spectated } of sent.get('s')!) {
      if (!spectated.game) continue;
      expect(spectated.game).not.toHaveProperty('you');
      expect(spectated.game.turn?.drawnCard ?? null).toBeNull();
    }
    expect(JSON.stringify([...sent.values()])).not.toContain(token);

    room.request('h', { type: 'backToLobby' });
    expect(view('s').game).toBeNull();
    expect(last('s').log).toEqual([]);
    expect(view('s').members).toHaveLength(4);
    room.request('s', { type: 'join', name: 'Late' });
    expect(view('s').members).toHaveLength(5);
  });

  it('gives the seat back after a reconnection, with the whole log and the drawn card', () => {
    const { room, view, last, tokens, game, clientOf } = threeHumansPlaying();
    const active = game().turn!.player;
    const client = clientOf(active);
    room.request(client, { type: 'game', command: { type: 'draw' } });
    room.disconnect(client);
    expect(view('A' === client ? 'B' : 'A').members.find((m) => m.id === active)?.connected).toBe(false);

    room.connect('back', tokens[client]);
    expect(view('back').you).toBe(active);
    expect(view('back').game!.turn).toMatchObject({ player: active, hasDrawn: true });
    expect(last('back').log!.map((e) => e.type)).toContain('drew');
    room.request('back', { type: 'game', command: { type: 'play', play: { type: 'defense', target: active } } });
    expect(game().turn!.player).not.toBe(active);
  });

  it('lets one player use several tabs', () => {
    const { room, view, tokens } = threeHumansPlaying();
    room.connect('A2', tokens.A);
    expect(view('A2').you).toBe(view('A').you);
  });

  it('rejects moves out of turn and from spectators', () => {
    const { room, game, clientOf } = threeHumansPlaying();
    const other = ['A', 'B', 'C'].find((c) => c !== clientOf(game().turn!.player))!;
    expect(() => room.request(other, { type: 'game', command: { type: 'draw' } })).toThrow('Not your turn');
    room.connect('s', undefined);
    expect(() => room.request('s', { type: 'game', command: { type: 'draw' } })).toThrow('notSeated');
  });
});

describe('disconnections (RULES 10)', () => {
  it('eliminates a disconnected player after the game waited 1 minute for them', () => {
    const { room, view, last, game, clientOf } = threeHumansPlaying();
    const active = game().turn!.player;
    const client = clientOf(active);
    room.request(client, { type: 'game', command: { type: 'draw' } });
    room.disconnect(client);
    const watcher = ['A', 'B', 'C'].find((c) => c !== client)!;

    vi.advanceTimersByTime(MINUTE - 1);
    expect(game().players.find((p) => p.id === active)!.eliminated).toBe(false);
    vi.advanceTimersByTime(1);
    expect(view(watcher).game!.players.find((p) => p.id === active)!.eliminated).toBe(true);
    expect(last(watcher).events[0]).toEqual({ type: 'timedOut', player: active });
    expect(view(watcher).game!.turn?.isHunter).toBe(false);
  });

  it('does not eliminate a player the game is not waiting for, or a connected player', () => {
    const { room, game, clientOf } = threeHumansPlaying();
    const active = clientOf(game().turn!.player);
    const other = ['A', 'B', 'C'].find((c) => c !== active)!;
    room.disconnect(other);
    vi.advanceTimersByTime(10 * MINUTE);
    expect(game().players.every((p) => !p.eliminated)).toBe(true);
  });

  it('cancels the timer when the player comes back', () => {
    const ctx = setup();
    const tokens = ['A', 'B', 'C'].map((name) => ctx.join(name, name));
    ctx.room.request('A', { type: 'start' });
    ctx.room.disconnect('C'); // before choosing a shield
    vi.advanceTimersByTime(MINUTE - 1);
    ctx.room.connect('C2', tokens[2]);
    vi.advanceTimersByTime(MINUTE);
    expect(ctx.view('C2').game!.players.every((p) => !p.eliminated)).toBe(true);
    expect(ctx.last('C2').log).toEqual([]);
  });

  it('can eliminate a player during the shield choice, and the game starts without them', () => {
    const ctx = setup();
    ['A', 'B', 'C', 'D'].forEach((name) => ctx.join(name, name));
    ctx.room.request('A', { type: 'start' });
    ctx.room.disconnect('D');
    vi.advanceTimersByTime(MINUTE);
    ['A', 'B', 'C'].forEach((c) => ctx.room.request(c, { type: 'game', command: { type: 'chooseShield', cardIndex: 0 } }));
    const game = ctx.view('A').game!;
    expect(game.phase).toBe('playing');
    expect(game.players.filter((p) => p.eliminated)).toHaveLength(1);
  });
});

describe('looking at a player (RULES 10)', () => {
  it('shows everyone who the active player looks at, until the move is played', () => {
    const { room, view, game, clientOf } = threeHumansPlaying();
    const active = game().turn!.player;
    const client = clientOf(active);
    const other = game().players.find((p) => p.id !== active)!.id;
    expect(() => room.request(client, { type: 'look', target: other })).toThrow('illegalMove');

    room.request(client, { type: 'game', command: { type: 'draw' } });
    room.request(client, { type: 'look', target: other });
    expect(['A', 'B', 'C'].map((c) => view(c).lookingAt)).toEqual([other, other, other]);
    room.request(client, { type: 'look', target: null });
    expect(view('A').lookingAt).toBeNull();

    room.request(client, { type: 'look', target: other });
    room.request(client, { type: 'game', command: { type: 'play', play: { type: 'defense', target: other } } });
    expect(view('A').lookingAt).toBeNull();
  });

  it('refuses other players, spectators and unknown or eliminated targets', () => {
    const { room, game, clientOf } = threeHumansPlaying();
    const active = game().turn!.player;
    const client = clientOf(active);
    room.request(client, { type: 'game', command: { type: 'draw' } });
    const other = ['A', 'B', 'C'].find((c) => c !== client)!;
    expect(() => room.request(other, { type: 'look', target: active })).toThrow('illegalMove');
    room.connect('s', undefined);
    expect(() => room.request('s', { type: 'look', target: active })).toThrow('notSeated');
    expect(() => room.request(client, { type: 'look', target: 'nobody' })).toThrow('illegalMove');
  });

  it('makes a bot look at its target before playing', () => {
    const { room, sent, view, join } = setup();
    join('h', 'Human');
    for (let i = 0; i < 3; i++) room.request('h', { type: 'addBot' });
    room.request('h', { type: 'start' });
    const rng = createRng(3);
    for (let step = 0; step < 200 && view('h').game!.phase !== 'finished'; step++) {
      const command = randomBot(view('h').game as PlayerView, rng);
      if (command) room.request('h', { type: 'game', command });
      else vi.advanceTimersByTime(4_000);
    }
    const bots = sent.get('h')!.at(-1)!.room.members.filter((m) => m.isBot).map((m) => m.id);
    const looks = sent.get('h')!.filter((u) => u.room.lookingAt !== null && bots.includes(u.room.game!.turn!.player));
    expect(looks.length).toBeGreaterThan(0);
    for (const update of looks) expect(update.room.game!.turn!.hasDrawn).toBe(true);
  });
});

describe('chat', () => {
  it('lets players and spectators chat, in the lobby and during a game', () => {
    const { room, chats, join } = setup();
    join('a', 'Alice');
    room.connect('v', undefined); // a visitor without a seat
    room.request('a', { type: 'chat', text: '  hello  ' });
    room.request('v', { type: 'chat', text: 'hi from the side' });
    expect(chats.get('v')).toEqual([
      { id: 1, from: 'p1', name: 'Alice', text: 'hello' },
      { id: 2, from: null, name: null, text: 'hi from the side' },
    ]);
    expect(chats.get('a')).toEqual(chats.get('v'));
  });

  it('sends the history to a client that connects, and checks length and rate', () => {
    const { room, last, join } = setup();
    join('a', 'Alice');
    room.request('a', { type: 'chat', text: 'first' });
    room.connect('late', undefined);
    expect(last('late').chat!.map((m) => m.text)).toEqual(['first']);

    expect(() => room.request('a', { type: 'chat', text: '   ' })).toThrow('invalidMessage');
    expect(() => room.request('a', { type: 'chat', text: 'x'.repeat(301) })).toThrow('invalidMessage');
    room.request('a', { type: 'chat', text: 'x'.repeat(300) });
    for (let i = 0; i < 3; i++) room.request('a', { type: 'chat', text: `spam ${i}` });
    expect(() => room.request('a', { type: 'chat', text: 'too fast' })).toThrow('chatTooFast');
    vi.advanceTimersByTime(10_000);
    room.request('a', { type: 'chat', text: 'calm again' });
  });
});
