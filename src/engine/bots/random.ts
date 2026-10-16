// Picks a random legal command. Used for testing and automated simulations.
import { playsFor } from '../actions.ts';
import { CARDS_DEALT } from '../setup.ts';
import { type Rng, pick, randomInt } from '../rng.ts';
import type { Command } from '../state.ts';
import type { PlayerView } from '../view.ts';

/** Returns null when the bot has nothing to do right now. */
export function randomBot(view: PlayerView, rng: Rng): Command | null {
  const me = view.players.find((p) => p.id === view.you)!;

  if (view.phase === 'choosingShields') {
    return me.hasChosenShield ? null : { type: 'chooseShield', cardIndex: randomInt(CARDS_DEALT, rng) };
  }
  if (view.phase !== 'playing' || view.turn?.player !== view.you) return null;
  if (!view.turn.hasDrawn) return { type: 'draw' };

  const alive = view.players.filter((p) => !p.eliminated).map((p) => p.id);
  return { type: 'play', play: pick(playsFor(view.you, alive), rng) };
}
