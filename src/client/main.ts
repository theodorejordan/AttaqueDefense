// Throwaway debug page for roadmap step 3: raw buttons and state as text. The real UI comes in step 4.
import { type Socket, io } from 'socket.io-client';
import { CARDS_DEALT } from '../engine/setup.ts';
import { playsFor } from '../engine/actions.ts';
import type { Card } from '../engine/cards.ts';
import type { ActionType, DamagePreference, GameEvent, PlayerId } from '../engine/state.ts';
import type { ClientToServerEvents, ErrorCode, Request, RoomView, ServerToClientEvents } from '../shared/protocol.ts';
import { LANGUAGES, getLanguage, setLanguage, t } from './i18n/index.ts';

// In dev mode each tab is a separate player (docs/DECISIONS.md > Lobby and server).
const storage = import.meta.env.DEV ? sessionStorage : localStorage;
const TOKEN_KEY = 'attaque-defense-token';

const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io({
  // A function, so each reconnection sends the latest token.
  auth: (send) => send({ token: storage.getItem(TOKEN_KEY) ?? undefined }),
});

let room: RoomView | null = null;
let log: GameEvent[] = [];
/** Kept as a code, so it is translated again when the language changes. */
let error: { code: ErrorCode; detail?: string } | null = null;
let target: PlayerId | null = null;

socket.on('update', (update) => {
  room = update.room;
  log = update.log ?? [...log, ...update.events];
  if (update.events.some((e) => e.type === 'turnStarted' || e.type === 'hunterTurn')) target = null;
  render();
});

function send(request: Request) {
  socket.emit('request', request, (reply) => {
    error = reply.ok ? null : { code: reply.error, detail: reply.detail };
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
const cardText = (card: Card) => `${t.ranks[card.rank]}${SUITS[card.suit]}`;
const cardsText = (cards: Card[]) => cards.map(cardText).join(' ') || '—';
const nameOf = (id: PlayerId | null) => room?.members.find((m) => m.id === id)?.name ?? id ?? t.nobody;

function render() {
  document.documentElement.lang = getLanguage();
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.replaceChildren(
    h('p', {}, ...LANGUAGES.map((l) => button(l.toUpperCase(), () => (setLanguage(l), render()), l === getLanguage()))),
    h('h1', {}, t.title),
    h('p', { className: 'error' }, error ? `${t.errors[error.code]}${import.meta.env.DEV && error.detail ? ` (${error.detail})` : ''}` : ''),
    ...[room && (room.game ? renderGame(room) : renderLobby(room)), room?.game ? renderLog() : null].filter((el) => el !== null),
  );
}

function renderLobby(room: RoomView) {
  const isHost = room.you !== null && room.you === room.hostId;
  const tag = (label: string) => ` (${label})`;
  const members = h(
    'ul',
    {},
    ...room.members.map((m) =>
      h(
        'li',
        {},
        `${m.name}${m.isBot ? tag(t.lobby.bot) : ''}${m.id === room.hostId ? tag(t.lobby.host) : ''}${m.connected ? '' : tag(t.lobby.away)}${m.id === room.you ? ` ← ${t.lobby.you}` : ''} `,
        isHost && m.isBot && button(t.lobby.remove, () => send({ type: 'removeBot', botId: m.id })),
      ),
    ),
  );
  const name = h('input', { placeholder: t.lobby.namePlaceholder, maxLength: 20 }) as HTMLInputElement;
  const seat =
    room.you === null
      ? h('p', {}, name, button(t.lobby.join, () => send({ type: 'join', name: name.value })))
      : h('p', {}, button(t.lobby.leave, () => send({ type: 'leave' })));

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
      h('p', {}, `${t.lobby.hunters}: `, select([0, 1, 2, 3], settings.hunters, (hunters) => send({ type: 'setSettings', settings: { hunters } }))),
      h('p', {}, `${t.lobby.decks}: `, select(room.deckCounts, settings.deckCount, (deckCount) => send({ type: 'setSettings', settings: { deckCount } }))),
      h(
        'p',
        {},
        `${t.lobby.maxMunitions}: `,
        select([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], settings.maxMunitions, (maxMunitions) =>
          send({ type: 'setSettings', settings: { maxMunitions } }),
        ),
      ),
      h('p', {}, button(t.lobby.addBot, () => send({ type: 'addBot' })), ' ', button(t.lobby.start, () => send({ type: 'start' }))),
    );
  return h('div', {}, h('h2', {}, t.lobby.title), members, seat, hostControls || h('p', {}, t.lobby.summary(settings)));
}

function renderGame(room: RoomView) {
  const game = room.game!;
  const you = 'you' in game ? game.you : null;
  const me = game.players.find((p) => p.id === you);
  const turn = game.turn;
  const isMyTurn = turn?.player === you && you !== null;

  let status: string;
  if (room.outOfCards) status = t.game.outOfCards;
  else if (game.phase === 'finished') status = t.game.over(nameOf(game.winner));
  else if (game.phase === 'choosingShields') status = t.game.choosing;
  else status = t.game.turn(nameOf(turn!.player), turn!.isHunter, turn!.hasDrawn);

  const players = h(
    'table',
    {},
    h('tr', {}, ...['', t.game.player, t.game.life, t.game.defence, t.game.munitions, ''].map((label) => h('th', {}, label))),
    ...game.players.map((p) =>
      h(
        'tr',
        { className: [p.id === turn?.player && 'active', p.eliminated && 'out'].filter(Boolean).join(' ') },
        h('td', {}, p.id === turn?.player ? '▶' : ''),
        h('td', {}, `${p.name}${p.id === you ? ` ${t.game.you}` : ''}${p.eliminated ? ' ✗' : ''}`),
        h('td', {}, game.phase === 'choosingShields' ? (p.hasChosenShield ? t.game.ready : t.game.choosingShort) : cardsText(p.life)),
        h('td', {}, p.shield ? cardText(p.shield) : '—'),
        h('td', {}, String(p.munitionCount)),
        h('td', {}, isMyTurn && turn.hasDrawn && !p.eliminated && button(p.id === target ? t.game.selected : t.game.select, () => ((target = p.id), render()), p.id === target)),
      ),
    ),
  );

  const controls: (Node | null | false)[] = [];
  if (me && game.phase === 'choosingShields' && !me.hasChosenShield) {
    controls.push(
      h('p', {}, t.game.pickDefence, ...Array.from({ length: CARDS_DEALT }, (_, i) =>
        button(t.game.card(i + 1), () => send({ type: 'game', command: { type: 'chooseShield', cardIndex: i } })),
      )),
    );
  }
  if (isMyTurn && !turn.hasDrawn) {
    const command = game.drawDeckCount === 0 ? ({ type: 'flipSidePot' } as const) : ({ type: 'draw' } as const);
    controls.push(h('p', {}, button(command.type === 'draw' ? t.game.draw : t.game.flip, () => send({ type: 'game', command }))));
  }
  if (isMyTurn && turn.hasDrawn) {
    const legal = playsFor(you!, game.players, game.settings.maxMunitions);
    const who = target ? nameOf(target) : '…';
    const hasDefence = game.players.some((p) => p.id === target && p.shield);
    const action = (type: ActionType, label: string) =>
      button(label, () => send({ type: 'game', command: { type: 'play', play: { type, target: target! } } }),
        !legal.some((p) => p.type === type && p.target === target));
    controls.push(
      h('p', {}, t.game.drawn(turn.drawnCard && cardText(turn.drawnCard))),
      h('p', {}, action('attack', t.game.attack(who)), ' ',
        action('defense', hasDefence ? t.game.changeDefence(who) : t.game.giveDefence(who)), ' ',
        action('munition', t.game.munition(who))),
    );
  }
  if (me && 'yourPreference' in game) {
    const preferences: DamagePreference[] = ['normal', 'fewestCards', 'lowestMax'];
    controls.push(
      h('p', {}, t.game.preference, h(
        'select',
        { onchange: (e: Event) => send({ type: 'game', command: { type: 'setPreference', preference: (e.target as HTMLSelectElement).value as DamagePreference } }) },
        ...preferences.map((p) => h('option', { value: p, selected: p === game.yourPreference }, t.preferences[p])),
      )),
    );
  }
  const isOver = game.phase === 'finished' || room.outOfCards;
  if (isOver && room.you === room.hostId) controls.push(h('p', {}, button(t.game.backToLobby, () => send({ type: 'backToLobby' }))));

  return h(
    'div',
    {},
    h('h2', {}, me ? t.game.title : t.game.spectating),
    h('p', { className: 'status' }, status),
    players,
    h('p', {}, t.game.piles(game.drawDeckCount, cardsText([...game.sidePot].reverse().slice(0, 8)))),
    ...controls,
  );
}

function renderLog() {
  return h('div', {}, h('h2', {}, t.log.title), h('ol', { reversed: true }, ...[...log].reverse().map((e) => h('li', {}, describeEvent(e)))));
}

function describeEvent(e: GameEvent): string {
  switch (e.type) {
    case 'shieldChosen':
      return t.log.defenceChosen(nameOf(e.player));
    case 'gameStarted':
      return t.log.gameStarted(nameOf(e.firstPlayer));
    case 'turnStarted':
      return t.log.turnStarted(nameOf(e.player));
    case 'hunterTurn':
      return t.log.hunterTurn(nameOf(e.player));
    case 'deckFlipped':
      return t.log.deckFlipped(e.cardCount);
    case 'drew':
      return t.log.drew(nameOf(e.player));
    case 'attacked':
      return t.log.attacked(
        nameOf(e.attacker), nameOf(e.target), cardsText(e.cards), e.total,
        e.shield && cardText(e.shield), e.shieldDestroyed, e.damage,
      );
    case 'damaged':
      return t.log.damaged(nameOf(e.player), e.damage, cardsText(e.before), cardsText(e.after));
    case 'munitionsLost':
      return t.log.munitionsLost(nameOf(e.player), cardsText(e.cards));
    case 'eliminated':
      return t.log.eliminated(nameOf(e.player));
    case 'timedOut':
      return t.log.timedOut(nameOf(e.player));
    case 'shieldPlaced':
      return t.log.defencePlaced(nameOf(e.by), nameOf(e.target), cardText(e.card), e.replaced && cardText(e.replaced));
    case 'munitionGiven':
      return t.log.munitionGiven(nameOf(e.by), nameOf(e.target));
    case 'gameOver':
      return t.game.over(nameOf(e.winner));
  }
}

render();
