// The ranking in the bottom-left corner (docs/DECISIONS.md > UI > Visual style): one slot per player, 1st to last.
import type { GameEvent, PlayerId } from '../../engine/state.ts';

/**
 * Places from 1st to last. Eliminated players fill them from the bottom, in the order they went out; the winner takes 1st.
 * `out`: the players eliminated on the table as shown, so a player appears when they leave it (table/playback.ts).
 */
export function ranking(playerCount: number, log: readonly GameEvent[], out: ReadonlySet<PlayerId>, winner: PlayerId | null) {
  const places: (PlayerId | null)[] = Array.from({ length: playerCount }, () => null);
  const order = log.flatMap((e) => (e.type === 'eliminated' && out.has(e.player) ? [e.player] : []));
  order.forEach((id, i) => {
    places[playerCount - 1 - i] = id;
  });
  if (winner) places[0] = winner;
  return places;
}
