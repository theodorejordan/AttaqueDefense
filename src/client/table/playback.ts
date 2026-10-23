// The table plays the game back instead of jumping to the server's latest state (docs/DECISIONS.md > UI > Animations,
// "the wait is client-side"). Each update becomes frames shown one after the other; updates arriving meanwhile wait.
// An attack: it lands on the target while the table still shows the state before it, then the life cards change.
// Pure functions here; the hook that runs them on a timer is usePlayback.ts.
import { cardKey } from '../../engine/cards.ts';
import type { GameEvent } from '../../engine/state.ts';
import type { RoomView, Update } from '../../shared/protocol.ts';
import { ATTACK_HOLD_MS, ATTACK_PAUSE_MS } from '../../shared/timing.ts';

export type Attack = Extract<GameEvent, { type: 'attacked' }>;

export interface Frame {
  room: RoomView;
  /** The attack lying on its target, if one is being shown. */
  attack: Attack | null;
  /** How long this frame stays before the next one. 0: replaced at once if another one is waiting. */
  ms: number;
}

/** The frames that show one update, starting from the room as it was before. */
export function framesFor(before: RoomView, update: Pick<Update, 'room' | 'events'>): Frame[] {
  const attack = update.events.find((e): e is Attack => e.type === 'attacked');
  const after = { room: update.room, attack: null, ms: 0 };
  if (!attack || !before.game) return [after];
  return [
    { room: landed(before, attack), attack, ms: ATTACK_PAUSE_MS },
    { ...resolved(update.room, attack), ms: ATTACK_HOLD_MS },
    after,
  ];
}

/**
 * The room after the attack, while its cards still lie on the target: they are not in the side pot yet (owner, 2026-10-23).
 * An attack card taken as the target's new life card (RULES 6.1) leaves the pile on the defence.
 */
function resolved(after: RoomView, attack: Attack): Pick<Frame, 'room' | 'attack'> {
  const game = after.game!;
  const onTable = new Set(attack.cards.map(cardKey));
  const stillOnDefence = new Set(game.sidePot.filter((card) => onTable.has(cardKey(card))).map(cardKey));
  return {
    room: { ...after, game: { ...game, sidePot: game.sidePot.filter((card) => !stillOnDefence.has(cardKey(card))) } },
    attack: { ...attack, cards: attack.cards.filter((card) => stillOnDefence.has(cardKey(card))) },
  };
}

/** The room before an attack, once its cards have left the attacker: no drawn card, no munitions. Nothing else has changed yet. */
function landed(before: RoomView, attack: Attack): RoomView {
  const game = before.game!;
  return {
    ...before,
    lookingAt: null,
    game: {
      ...game,
      players: game.players.map((p) => (p.id === attack.attacker ? { ...p, munitionCount: 0 } : p)),
      turn: game.turn && { ...game.turn, hasDrawn: false, drawnCard: null },
    },
  };
}
