// The Menu, opened from the top bar during a game (docs/DECISIONS.md > UI > Step 4e): damage preference,
// how to play, and leaving the game. Spectators and eliminated players only get the rules.
import { useState } from 'preact/hooks';
import type { DamagePreference } from '../../engine/state.ts';
import type { RoomView } from '../../shared/protocol.ts';
import { send } from '../connection.ts';
import { t } from '../i18n/index.ts';
import './menu.css';

const PREFERENCES: DamagePreference[] = ['normal', 'fewestCards', 'lowestMax'];

export function Menu({ room, onClose }: { room: RoomView; onClose: () => void }) {
  const [page, setPage] = useState<'main' | 'rules' | 'leave'>('main');
  const game = room.game!;
  const me = game.players.find((p) => p.id === room.you);
  const isPlaying = me !== undefined && !me.eliminated && game.phase !== 'finished' && !room.outOfCards;
  const preference = 'yourPreference' in game ? game.yourPreference : null;

  if (page === 'rules') {
    return (
      <section class="side-panel menu" aria-labelledby="rules-title">
        <button type="button" class="btn-link back" onClick={() => setPage('main')}>
          ← {t.menu.back}
        </button>
        <h2 id="rules-title">{t.menu.howToPlay}</h2>
        {t.menu.rules.map((rule) => (
          <div key={rule.title} class="rule">
            <h3>{rule.title}</h3>
            <p>{rule.text}</p>
          </div>
        ))}
      </section>
    );
  }

  if (page === 'leave') {
    return (
      <section class="side-panel menu" role="alertdialog" aria-labelledby="leave-text">
        <p id="leave-text">{t.menu.leaveConfirm}</p>
        <div class="menu-row">
          <button
            type="button"
            class="btn"
            onClick={async () => {
              if (await send({ type: 'leaveGame' })) onClose();
            }}
          >
            {t.menu.leaveYes}
          </button>
          <button type="button" class="btn-link" onClick={() => setPage('main')}>
            {t.menu.cancel}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section class="side-panel menu" aria-label={t.app.menu}>
      {isPlaying && preference && (
        <div class="menu-block">
          <h2 id="preference-title">{t.menu.preference}</h2>
          <p class="caption">{t.menu.preferenceIntro}</p>
          <div class="preference-options" role="group" aria-labelledby="preference-title">
            {PREFERENCES.map((option) => (
              <button
                key={option}
                type="button"
                class="preference-option"
                aria-pressed={option === preference}
                onClick={() => send({ type: 'game', command: { type: 'setPreference', preference: option } })}
              >
                <span class="preference-name">{t.preferences[option]}</span>
                <span class="caption">{t.menu.preferenceHelp[option]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div class="menu-row">
        <button type="button" class="btn" onClick={() => setPage('rules')}>
          {t.menu.howToPlay}
        </button>
        {isPlaying && (
          <button type="button" class="btn-link" onClick={() => setPage('leave')}>
            {t.menu.leave}
          </button>
        )}
      </div>
    </section>
  );
}
