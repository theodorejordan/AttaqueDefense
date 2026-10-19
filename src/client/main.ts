// Throwaway debug page for roadmap step 3: raw buttons and state as text. The real UI comes in step 4.
import { type Socket, io } from 'socket.io-client';
import { CARDS_DEALT } from '../engine/setup.ts';
import { playsFor } from '../engine/actions.ts';
import type { Card } from '../engine/cards.ts';
import type { ActionType, DamagePreference, GameEvent, PlayerId } from '../engine/state.ts';
import type { ClientToServerEvents, Request, RoomView, ServerToClientEvents } from '../shared/protocol.ts';

// In dev mode each tab is a separate player (docs/DECISIONS.md > Lobby and server).
const storage = import.meta.env.DEV ? sessionStorage : localStorage;
const TOKEN_KEY = 'attaque-defense-token';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  // A function, so each reconnection sends the latest token.
  auth: (send) => send({ token: storage.getItem(TOKEN_KEY) ?? undefined }),
});

let room: RoomView | null = null;
let log: GameEvent[] = [];
let error = '';
let target: PlayerId | null = null;

socket.on('update', (update) => {
  room = update.room;
  log = update.log ?? [...log, ...update.events];
  if (update.events.some((e) => e.type === 'turnStarted' || e.type === 'hunterTurn')) target = null;
  render();
});

function send(request: Request) {
  socket.emit('request', request, (reply) => {
    error = reply.ok ? '' : (reply.detail ?? reply.error);
    if (reply.ok && reply.token) storage.setItem(TOKEN_KEY, reply.token);
    if (reply.ok && request.type === 'leave') storage.removeItem(TOKEN_KEY);
    render();
  });
}

/** Builds an element. Text always goes through text nodes, never innerHTML: names come from other players. */
function h(tag: string, props: Record<string, unknown> = {}, ...children: (Node | string | null | false)[]) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith('on')) el.addEventListener(key.slice(2), value as EventListener);
    else (el as unknown as Record<string, unknown>)[key] = value;
  }
  for (const child of children) if (child) el.append(child);
  return el;
}

const button = (label: string, onclick: () => void, disabled = false) => h('button', { onclick, disabled }, label);
const SUITS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' };
const cardText = (card: Card) => `${card.rank}${SUITS[card.suit]}`;
const cardsText = (cards: Card[]) => cards.map(cardText).join(' ') || '—';
const nameOf = (id: PlayerId | null) => room?.members.find((m) => m.id === id)?.name ?? id ?? 'nobody';

function render() {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.replaceChildren(
    h('h1', {}, 'AttaqueDéfense (debug)'),
    h('p', { className: 'error' }, error),
    ...[room && (room.game ? renderGame(room) : renderLobby(room)), room?.game ? renderLog() : null].filter((el) => el !== null),
  );
}

function renderLobby(room: RoomView) {
  const isHost = room.you !== null && room.you === room.hostId;
  const members = h(
    'ul',
    {},
    ...room.members.map((m) =>
      h(
        'li',
        {},
        `${m.name}${m.isBot ? ' (bot)' : ''}${m.id === room.hostId ? ' (host)' : ''}${m.connected ? '' : ' (away)'}${m.id === room.you ? ' ← you' : ''} `,
        isHost && m.isBot && button('Remove', () => send({ type: 'removeBot', botId: m.id })),
      ),
    ),
  );
  const name = h('input', { placeholder: 'Your name', maxLength: 20 }) as HTMLInputElement;
  const seat =
    room.you === null
      ? h('p', {}, name, button('Join', () => send({ type: 'join', name: name.value })))
      : h('p', {}, button('Leave', () => send({ type: 'leave' })));

  const select = (values: number[], current: number, onchange: (value: number) => void) =>
    h(
      'select',
      { onchange: (e: Event) => onchange(Number((e.target as HTMLSelectElement).value)) },
      ...values.map((v) => h('option', { value: String(v), selected: v === current }, String(v))),
    );
  const { settings } = room;
  const hostControls =
    isHost &&
    h(
      'div',
      {},
      h('p', {}, 'Hunters: ', select([0, 1, 2, 3], settings.hunters, (hunters) => send({ type: 'setSettings', settings: { hunters } }))),
      h('p', {}, 'Decks: ', select(room.deckCounts, settings.deckCount, (deckCount) => send({ type: 'setSettings', settings: { deckCount } }))),
      h(
        'p',
        {},
        'Max munitions: ',
        select([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], settings.maxMunitions, (maxMunitions) =>
          send({ type: 'setSettings', settings: { maxMunitions } }),
        ),
      ),
      h('p', {}, button('Add bot', () => send({ type: 'addBot' })), ' ', button('Start', () => send({ type: 'start' }))),
    );
  return h(
    'div',
    {},
    h('h2', {}, 'Lobby'),
    members,
    seat,
    hostControls || h('p', {}, `Hunters ${settings.hunters}, decks ${settings.deckCount}, max munitions ${settings.maxMunitions}`),
  );
}

function renderGame(room: RoomView) {
  const game = room.game!;
  const you = 'you' in game ? game.you : null;
  const me = game.players.find((p) => p.id === you);
  const turn = game.turn;
  const isMyTurn = turn?.player === you && you !== null;

  let status: string;
  if (room.outOfCards) status = 'No cards left: the game is over.';
  else if (game.phase === 'finished') status = `Game over. Winner: ${nameOf(game.winner)}`;
  else if (game.phase === 'choosingShields') status = 'Everyone chooses a defence, blind.';
  else status = `${nameOf(turn!.player)}'s turn${turn!.isHunter ? ' (hunter)' : ''}${turn!.hasDrawn ? ', card drawn' : ''}`;

  const players = h(
    'table',
    {},
    h('tr', {}, ...['', 'Player', 'Life', 'Defence', 'Munitions', ''].map((t) => h('th', {}, t))),
    ...game.players.map((p) =>
      h(
        'tr',
        { className: [p.id === turn?.player && 'active', p.eliminated && 'out'].filter(Boolean).join(' ') },
        h('td', {}, p.id === turn?.player ? '▶' : ''),
        h('td', {}, `${p.name}${p.id === you ? ' (you)' : ''}${p.eliminated ? ' ✗' : ''}`),
        h('td', {}, game.phase === 'choosingShields' ? (p.hasChosenShield ? 'ready' : 'choosing…') : cardsText(p.life)),
        h('td', {}, p.shield ? cardText(p.shield) : '—'),
        h('td', {}, String(p.munitionCount)),
        h('td', {}, isMyTurn && turn.hasDrawn && !p.eliminated && button(p.id === target ? 'Selected' : 'Select', () => ((target = p.id), render()), p.id === target)),
      ),
    ),
  );

  const controls: (Node | null | false)[] = [];
  if (me && game.phase === 'choosingShields' && !me.hasChosenShield) {
    controls.push(
      h('p', {}, 'Pick your defence: ', ...Array.from({ length: CARDS_DEALT }, (_, i) =>
        button(`Card ${i + 1}`, () => send({ type: 'game', command: { type: 'chooseShield', cardIndex: i } })),
      )),
    );
  }
  if (isMyTurn && !turn.hasDrawn) controls.push(h('p', {}, button('Draw', () => send({ type: 'game', command: { type: 'draw' } }))));
  if (isMyTurn && turn.hasDrawn) {
    const legal = playsFor(you!, game.players, game.settings.maxMunitions);
    const who = target ? nameOf(target) : '…';
    const hasDefence = game.players.some((p) => p.id === target && p.shield);
    const action = (type: ActionType, label: string) =>
      button(label, () => send({ type: 'game', command: { type: 'play', play: { type, target: target! } } }),
        !legal.some((p) => p.type === type && p.target === target));
    controls.push(
      h('p', {}, `Drawn card: ${turn.drawnCard ? `${cardText(turn.drawnCard)} (Ace peek)` : 'face-down'}. Select a player, then: `),
      h('p', {}, action('attack', `Attack ${who}`), ' ',
        action('defense', hasDefence ? `Change ${who}'s defence` : `Give ${who} a defence`), ' ',
        action('munition', `Munition ${who}`)),
    );
  }
  if (me && 'yourPreference' in game) {
    const preferences: DamagePreference[] = ['normal', 'fewestCards', 'lowestMax'];
    controls.push(
      h('p', {}, 'Damage preference: ', h(
        'select',
        { onchange: (e: Event) => send({ type: 'game', command: { type: 'setPreference', preference: (e.target as HTMLSelectElement).value as DamagePreference } }) },
        ...preferences.map((p) => h('option', { value: p, selected: p === game.yourPreference }, p)),
      )),
    );
  }
  const isOver = game.phase === 'finished' || room.outOfCards;
  if (isOver && room.you === room.hostId) controls.push(h('p', {}, button('Back to lobby', () => send({ type: 'backToLobby' }))));

  return h(
    'div',
    {},
    h('h2', {}, me ? 'Game' : 'Game (spectating)'),
    h('p', { className: 'status' }, status),
    players,
    h('p', {}, `Draw deck: ${game.drawDeckCount} cards. Side pot (top first): ${cardsText([...game.sidePot].reverse().slice(0, 8))}`),
    ...controls,
  );
}

function renderLog() {
  return h('div', {}, h('h2', {}, 'Log'), h('ol', { reversed: true }, ...[...log].reverse().map((e) => h('li', {}, describeEvent(e)))));
}

function describeEvent(e: GameEvent): string {
  switch (e.type) {
    case 'shieldChosen':
      return `${nameOf(e.player)} chose a defence`;
    case 'gameStarted':
      return `Defences revealed. ${nameOf(e.firstPlayer)} starts`;
    case 'turnStarted':
      return `${nameOf(e.player)}'s turn`;
    case 'hunterTurn':
      return `${nameOf(e.player)} plays as hunter`;
    case 'deckFlipped':
      return `Side pot flipped into a new draw deck (${e.cardCount} cards)`;
    case 'drew':
      return `${nameOf(e.player)} drew`;
    case 'attacked': {
      const defence = e.shield ? `, defence ${cardText(e.shield)} ${e.shieldDestroyed ? 'destroyed' : 'holds'}` : '';
      return `${nameOf(e.attacker)} attacked ${nameOf(e.target)} with ${cardsText(e.cards)} = ${e.total}${defence}, ${e.damage} damage`;
    }
    case 'damaged':
      return `${nameOf(e.player)} took ${e.damage}: ${cardsText(e.before)} → ${cardsText(e.after)}`;
    case 'munitionsLost':
      return `${nameOf(e.player)} lost their munitions: ${cardsText(e.cards)}`;
    case 'eliminated':
      return `${nameOf(e.player)} is eliminated`;
    case 'timedOut':
      return `${nameOf(e.player)} was away for too long`;
    case 'shieldPlaced':
      return `${nameOf(e.by)} gave ${nameOf(e.target)} a ${cardText(e.card)} defence${e.replaced ? ` (replacing ${cardText(e.replaced)})` : ''}`;
    case 'munitionGiven':
      return `${nameOf(e.by)} gave ${nameOf(e.target)} a munition`;
    case 'gameOver':
      return `Game over. Winner: ${nameOf(e.winner)}`;
  }
}

render();
