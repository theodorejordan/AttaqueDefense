// The game log (docs/DECISIONS.md > UI > Game log): the public events of the game, newest first, opened from the top bar.
import type { GameEvent, PlayerId } from '../../engine/state.ts';
import { t } from '../i18n/index.ts';
import { describeEvent } from './describe.ts';
import './log.css';

/** Only actions are listed (owner, 2026-10-23): not whose turn it is, nor the draws and blind defence choices. */
const HIDDEN: ReadonlySet<GameEvent['type']> = new Set(['turnStarted', 'drew', 'shieldChosen']);

export function GameLog({ log, nameOf }: { log: GameEvent[]; nameOf: (id: PlayerId) => string }) {
  const shown = log.filter((e) => !HIDDEN.has(e.type)).reverse();
  return (
    <section class="side-panel game-log" aria-labelledby="game-log-title">
      <h2 id="game-log-title" class="visually-hidden">
        {t.log.title}
      </h2>
      {shown.length === 0 ? (
        <p class="caption">{t.log.empty}</p>
      ) : (
        <ol reversed>
          {shown.map((e, i) => (
            <li key={shown.length - i}>{describeEvent(e, nameOf)}</li>
          ))}
        </ol>
      )}
    </section>
  );
}
