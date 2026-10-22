// The lobby (docs/DECISIONS.md > UI > Lobby and end of game): players on the left, settings and chat on the right.
// Only the host changes settings, manages bots and starts; the server checks it anyway.
import { useState } from 'preact/hooks';
import { MAX_PLAYERS, MIN_PLAYERS, MUNITION_LIMITS } from '../../engine/setup.ts';
import type { GameOptions } from '../../engine/state.ts';
import { type ChatMessage, MAX_NAME_LENGTH, type Member, type RoomView } from '../../shared/protocol.ts';
import { Card } from '../cards/Card.tsx';
import { ChatPanel } from '../chat/ChatPanel.tsx';
import { send } from '../connection.ts';
import { t } from '../i18n/index.ts';
import './lobby.css';

const DECK_COUNTS = [1, 2];
const FAN = [
  { card: { rank: 'A', suit: 'spades', deck: 0 }, left: 60, angle: -14 },
  { card: { rank: 'K', suit: 'hearts', deck: 0 }, left: 122, angle: -2 },
  { card: { rank: '7', suit: 'diamonds', deck: 0 }, left: 184, angle: 11 },
] as const;

export function Lobby({ room, chat }: { room: RoomView; chat: ChatMessage[] }) {
  const isHost = room.you !== null && room.you === room.hostId;
  const host = room.members.find((m) => m.id === room.hostId);
  let status = '';
  if (isHost) status = t.lobby.youAreHost;
  else if (room.you === null) status = t.lobby.takeASeat;
  else if (host) status = t.lobby.waitingFor(host.name);

  return (
    <main class="lobby">
      <header class="lobby-header">
        <h1>{t.lobby.title}</h1>
        <p class="caption">{status}</p>
        <div class="lobby-fan" aria-hidden="true">
          {FAN.map(({ card, left, angle }) => (
            <div key={card.rank} style={{ left: `${left}px`, transform: `rotate(${angle}deg)` }}>
              <Card card={card} width={84} />
            </div>
          ))}
        </div>
      </header>

      <section class="lobby-section" aria-labelledby="players-title">
        <div class="section-title">
          <h2 id="players-title">{t.lobby.players}</h2>
          <span class="caption">{t.lobby.seats(room.members.length)}</span>
        </div>
        {room.you === null && <JoinForm />}
        <ul class="player-list">
          {room.members.map((member) => (
            <PlayerRow key={member.id} member={member} room={room} isHost={isHost} />
          ))}
        </ul>
        <div class="lobby-actions">
          {isHost && (
            <button type="button" class="btn" disabled={room.members.length >= MAX_PLAYERS} onClick={() => send({ type: 'addBot' })}>
              {t.lobby.addBot}
            </button>
          )}
          {room.you !== null && (
            <button type="button" class="btn-link" onClick={() => send({ type: 'leave' })}>
              {t.lobby.leave}
            </button>
          )}
          <span class="caption">{t.lobby.spectators(room.spectatorCount)}</span>
        </div>
      </section>

      <div class="lobby-side">
        <Settings room={room} isHost={isHost} />
        {isHost && (
          <div class="start-row">
            <button
              type="button"
              class="btn btn-primary"
              disabled={room.members.length < MIN_PLAYERS}
              onClick={() => send({ type: 'start' })}
            >
              {t.lobby.start}
            </button>
          </div>
        )}
        <ChatPanel messages={chat} />
      </div>
    </main>
  );
}

/** Temporary, until accounts give everyone a name (docs/DECISIONS.md > Accounts). */
function JoinForm() {
  const [name, setName] = useState('');
  const submit = async (event: Event) => {
    event.preventDefault();
    if (await send({ type: 'join', name })) setName('');
  };
  return (
    <form class="join-form" onSubmit={submit}>
      <label class="visually-hidden" for="join-name">
        {t.lobby.namePlaceholder}
      </label>
      <input
        id="join-name"
        class="text-input"
        value={name}
        onInput={(event) => setName((event.target as HTMLInputElement).value)}
        maxLength={MAX_NAME_LENGTH}
        placeholder={t.lobby.namePlaceholder}
        autocomplete="nickname"
      />
      <button class="btn" type="submit">
        {t.lobby.join}
      </button>
    </form>
  );
}

function PlayerRow({ member, room, isHost }: { member: Member; room: RoomView; isHost: boolean }) {
  const isYou = member.id === room.you;
  const tags = [
    isYou && t.lobby.you,
    member.id === room.hostId && t.lobby.host,
    member.isBot && t.lobby.bot,
    !member.connected && t.lobby.away,
  ].filter((tag) => tag !== false);
  return (
    <li>
      <span class="avatar" aria-hidden="true">
        {member.name.charAt(0).toUpperCase()}
      </span>
      <span class={isYou ? 'player-name you' : 'player-name'}>{member.name}</span>
      {tags.map((tag) => (
        <span key={tag} class="tag">
          {tag}
        </span>
      ))}
      <span class="spacer" />
      {isHost && member.isBot && (
        <button type="button" class="btn-link" onClick={() => send({ type: 'removeBot', botId: member.id })}>
          {t.lobby.remove}
        </button>
      )}
    </li>
  );
}

/** Editable by the host, read-only for everyone else. */
function Settings({ room, isHost }: { room: RoomView; isHost: boolean }) {
  const { settings } = room;
  const set = (changes: GameOptions) => send({ type: 'setSettings', settings: changes });
  return (
    <section class="lobby-section" aria-labelledby="settings-title">
      <h2 id="settings-title">{t.lobby.settings}</h2>

      <div class="setting">
        <span class="setting-label" id="hunters-label">
          {t.lobby.hunters}
        </span>
        <div class="seg" role="group" aria-labelledby="hunters-label">
          {t.lobby.hunterOptions.map((label, hunters) => (
            <button
              key={label}
              type="button"
              aria-pressed={settings.hunters === hunters}
              disabled={!isHost}
              onClick={() => set({ hunters })}
            >
              {label}
            </button>
          ))}
        </div>
        <p class="caption">{t.lobby.huntersHelp}</p>
      </div>

      <div class="setting">
        <span class="setting-label" id="decks-label">
          {t.lobby.decks}
        </span>
        <div class="seg" role="group" aria-labelledby="decks-label">
          {DECK_COUNTS.map((deckCount) => (
            <button
              key={deckCount}
              type="button"
              aria-pressed={settings.deckCount === deckCount}
              disabled={!isHost || !room.deckCounts.includes(deckCount)}
              onClick={() => set({ deckCount })}
            >
              {t.lobby.deckOption(deckCount)}
            </button>
          ))}
        </div>
        <p class="caption">{t.lobby.decksHelp}</p>
      </div>

      <div class="setting">
        <span class="setting-label">{t.lobby.maxMunitions}</span>
        <div class="stepper">
          <button
            type="button"
            class="btn"
            aria-label={t.lobby.fewerMunitions}
            disabled={!isHost || settings.maxMunitions <= MUNITION_LIMITS.min}
            onClick={() => set({ maxMunitions: settings.maxMunitions - 1 })}
          >
            −
          </button>
          <span class="stepper-value">{settings.maxMunitions}</span>
          <button
            type="button"
            class="btn"
            aria-label={t.lobby.moreMunitions}
            disabled={!isHost || settings.maxMunitions >= MUNITION_LIMITS.max}
            onClick={() => set({ maxMunitions: settings.maxMunitions + 1 })}
          >
            +
          </button>
        </div>
      </div>
    </section>
  );
}
