// The real UI (roadmap step 4): picks the screen from what the server sends.
import { useEffect, useState } from 'preact/hooks';
import { clearError, useConnection } from './connection.ts';
import { LANGUAGES, type Language, getLanguage, setLanguage, t } from './i18n/index.ts';
import { Lobby } from './lobby/Lobby.tsx';
import { GameLog } from './log/GameLog.tsx';
import { Table } from './table/Table.tsx';

const ERROR_SHOWN_MS = 5_000;

export function App() {
  const { connected, room, log, chat, error } = useConnection();
  // `t` changes with the language: keeping it in state re-renders every screen.
  const [language, setShownLanguage] = useState(getLanguage());
  const [logOpen, setLogOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(clearError, ERROR_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [error]);

  const switchLanguage = (next: Language) => {
    setLanguage(next);
    setShownLanguage(next);
  };

  let screen;
  if (!room) screen = <p class="screen-message caption">{t.app.connecting}</p>;
  else if (room.game) screen = <Table room={room} log={log} />;
  else screen = <Lobby room={room} chat={chat} />;
  const game = room?.game;
  const nameOf = (id: string) => game?.players.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      <header class={room?.game ? 'topbar over-table' : 'topbar'}>
        <span class="wordmark">AttaqueDéfense</span>
        <div class="topbar-actions">
          {game && (
            <button type="button" class="btn btn-small" aria-pressed={logOpen} onClick={() => setLogOpen(!logOpen)}>
              {t.app.gameLog}
            </button>
          )}
          <div class="seg" role="group" aria-label={t.app.language}>
            {LANGUAGES.map((option) => (
              <button key={option} type="button" aria-pressed={option === language} onClick={() => switchLanguage(option)}>
                {option.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>
      {screen}
      {game && logOpen && <GameLog log={log} nameOf={nameOf} />}
      {error && (
        <div class="toast" role="alert">
          {t.errors[error.code]}
          {import.meta.env.DEV && error.detail ? ` (${error.detail})` : ''}
        </div>
      )}
      {room && !connected && <div class="toast">{t.app.connecting}</div>}
    </>
  );
}
