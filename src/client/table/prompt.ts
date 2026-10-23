// The centre text (docs/DECISIONS.md > UI > Main info text and Turn flow), as data: Centre.tsx translates it.
import type { PlayerId } from '../../engine/state.ts';
import type { SpectatorView } from '../../engine/view.ts';

/** flip: the deck is empty, the side pot must be flipped first (RULES 7). pick: drawn, choosing a player and an action. */
export type Step = 'flip' | 'draw' | 'pick';

export type Prompt =
  | { type: 'pickDefence' }
  | { type: 'waitingForDefences' }
  | { type: 'turn'; player: PlayerId; yours: boolean; hunter: boolean; step: Step; lookingAt: PlayerId | null }
  /** No winner: the game stopped because no cards were left. */
  | { type: 'over'; winner: PlayerId | null };

export function promptFor(game: SpectatorView, you: PlayerId | null, lookingAt: PlayerId | null, outOfCards: boolean): Prompt {
  if (outOfCards) return { type: 'over', winner: null };
  if (game.phase === 'finished') return { type: 'over', winner: game.winner };
  if (game.phase === 'choosingShields') {
    const me = game.players.find((p) => p.id === you);
    return me && !me.hasChosenShield ? { type: 'pickDefence' } : { type: 'waitingForDefences' };
  }
  const turn = game.turn!;
  let step: Step = 'pick';
  if (!turn.hasDrawn) step = game.drawDeckCount === 0 ? 'flip' : 'draw';
  return { type: 'turn', player: turn.player, yours: turn.player === you, hunter: turn.isHunter, step, lookingAt };
}
