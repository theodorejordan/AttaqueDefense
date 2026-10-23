// The real UI (roadmap step 4): picks the screen from what the server sends.
import { useEffect, useState } from 'preact/hooks';
import { clearError, useConnection } from './connection.ts';
import { LANGUAGES, type Language, getLanguage, setLanguage, t } from './i18n/index.ts';
import { Lobby } from './lobby/Lobby.tsx';
import { GameLog } from './log/GameLog.tsx';
import { Menu } from './menu/Menu.tsx';
import { Table } from './table/Table.tsx';

const ERROR_SHOWN_MS = 5_000;

export function App() {
  const { connected, room, log, chat, error } = useConnection();
  // `t` changes with the language: keeping it in state re-renders every screen.
  const [language, setShownLanguage] = useState(getLanguage());
  /** The panel open under the top bar, one at a time. */
  const [panel, setPanel] = useState<'log' | 'menu' | null>(null);
  const toggle = (next: 'log' | 'menu') => setPanel(panel === next ? null : next);

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
  else if (room.game) screen = <Table room={room} log={log} chat={chat} />;
  else screen = <Lobby room={room} chat={chat} />;
  const game = room?.game;
  const nameOf = (id: string) => game?.players.find((p) => p.id === id)?.name ?? id;

  return (
    <>
      <header class={room?.game ? 'topbar over-table' : 'topbar'}>
        <span class="wordmark">AttaqueDéfense</span>
        <div class="topbar-actions">
          {game && (
            <>
              <button type="button" class="btn btn-small" aria-pressed={panel === 'log'} onClick={() => toggle('log')}>
                {t.app.gameLog}
              </button>
              <button type="button" class="btn btn-small" aria-pressed={panel === 'menu'} onClick={() => toggle('menu')}>
                {t.app.menu}
              </button>
            </>
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
      {game && panel === 'log' && <GameLog log={log} nameOf={nameOf} />}
      {room && game && panel === 'menu' && <Menu room={room} onClose={() => setPanel(null)} />}
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
