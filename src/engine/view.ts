// What one player is allowed to see (RULES 9). This is the only game data sent to a client or a bot.
import type { Card } from './cards.ts';
import { hasChosenShield } from './setup.ts';
import type { DamagePreference, GameState, PlayerId, Settings } from './state.ts';

export interface PlayerSummary {
  id: PlayerId;
  name: string;
  life: Card[];
  shield: Card | null;
  munitionCount: number;
  eliminated: boolean;
  hasChosenShield: boolean;
}

export interface PlayerView {
  you: PlayerId;
  phase: GameState['phase'];
  settings: Settings;
  /** Seating order = clockwise playing order. */
  players: PlayerSummary[];
  drawDeckCount: number;
  sidePot: Card[];
  turn: {
    player: PlayerId;
    isHunter: boolean;
    hasDrawn: boolean;
    /** Only set for the active player when their shield is an Ace (RULES 5.4). */
    drawnCard: Card | null;
  } | null;
  yourPreference: DamagePreference;
  winner: PlayerId | null;
}

/** Public information only (RULES 9, "Everyone"), for spectators. */
export type SpectatorView = Omit<PlayerView, 'you' | 'yourPreference'>;

export function spectatorView(state: GameState): SpectatorView {
  const { turn } = state;
  return {
    phase: state.phase,
    settings: { ...state.settings },
    // During the shield choice, `life` and `shield` are still empty: the dealt cards stay hidden.
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      life: [...p.life],
      shield: p.shield,
      munitionCount: p.munitions.length,
      eliminated: p.eliminated,
      hasChosenShield: hasChosenShield(p),
    })),
    drawDeckCount: state.drawDeck.length,
    sidePot: [...state.sidePot],
    turn: turn && { player: turn.player, isHunter: turn.isHunter, hasDrawn: turn.drawn !== null, drawnCard: null },
    winner: state.winner,
  };
}

export function viewFor(state: GameState, you: PlayerId): PlayerView {
  const me = state.players.find((p) => p.id === you);
  if (!me) throw new Error(`Unknown player: ${you}`);
  const { turn } = state;
  const view = spectatorView(state);

  return {
    ...view,
    you,
    turn: view.turn && {
      ...view.turn,
      drawnCard: turn!.player === you && turn!.drawnVisible ? turn!.drawn : null,
    },
    yourPreference: me.preference,
  };
}
