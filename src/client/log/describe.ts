// One sentence per game event, for the last-action line above the centre text and the game log.
// Cards are written with their suit symbol (7♥).
import type { Card } from '../../engine/cards.ts';
import type { GameEvent, PlayerId } from '../../engine/state.ts';
import { t } from '../i18n/index.ts';

const SUITS = { hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠' } as const;

export const cardText = (card: Card) => `${t.ranks[card.rank]}${SUITS[card.suit]}`;
const cardsText = (cards: readonly Card[]) => cards.map(cardText).join(' ') || '—';

/** "7♥", or "7♥ + 3♠ = 10" with munitions. */
function attackText(cards: readonly Card[], total: number): string {
  return cards.length > 1 ? `${cards.map(cardText).join(' + ')} = ${total}` : cardsText(cards);
}

export function describeEvent(e: GameEvent, nameOf: (id: PlayerId) => string): string {
  switch (e.type) {
    case 'shieldChosen':
      return t.log.defenceChosen(nameOf(e.player));
    case 'gameStarted':
      return t.log.gameStarted(nameOf(e.firstPlayer));
    case 'turnStarted':
      return t.log.turnStarted(nameOf(e.player));
    case 'hunterTurn':
      return t.log.hunterTurn(nameOf(e.player));
    case 'deckFlipped':
      return t.log.deckFlipped(nameOf(e.player), e.cardCount);
    case 'drew':
      return t.log.drew(nameOf(e.player));
    case 'attacked':
      return t.log.attacked(
        nameOf(e.attacker),
        nameOf(e.target),
        attackText(e.cards, e.total),
        e.shield && cardText(e.shield),
        e.shieldDestroyed,
        e.damage,
      );
    case 'damaged':
      return t.log.damaged(nameOf(e.player), e.damage, cardsText(e.before), cardsText(e.after));
    case 'munitionsLost':
      return t.log.munitionsLost(nameOf(e.player), cardsText(e.cards));
    case 'eliminated':
      return t.log.eliminated(nameOf(e.player));
    case 'timedOut':
      return t.log.timedOut(nameOf(e.player));
    case 'shieldPlaced':
      return t.log.defencePlaced(nameOf(e.by), nameOf(e.target), cardText(e.card), e.replaced && cardText(e.replaced));
    case 'munitionGiven':
      return t.log.munitionGiven(nameOf(e.by), nameOf(e.target));
    case 'gameOver':
      return e.winner ? t.table.winner(nameOf(e.winner)) : t.table.outOfCards;
  }
}

/** The events the last-action line can show: a move, or something that changed the table. */
const MOVES: ReadonlySet<GameEvent['type']> = new Set([
  'gameStarted',
  'deckFlipped',
  'attacked',
  'shieldPlaced',
  'munitionGiven',
  'timedOut',
]);

export interface LastAction {
  move: GameEvent;
  /** Players eliminated by that move (or by a hunter turn it set off, until the next move). */
  eliminated: PlayerId[];
}

export function lastAction(log: readonly GameEvent[]): LastAction | null {
  for (let i = log.length - 1; i >= 0; i--) {
    const move = log[i]!;
    if (!MOVES.has(move.type)) continue;
    const eliminated = log.slice(i + 1).flatMap((e) => (e.type === 'eliminated' ? [e.player] : []));
    return { move, eliminated };
  }
  return null;
}

/** "Basile attacked Ada: 7♥ + 3♠ = 10, defence 8♦ destroyed, 2 damage · Ada is eliminated". */
export function describeLastAction(action: LastAction, nameOf: (id: PlayerId) => string): string {
  return [describeEvent(action.move, nameOf), ...action.eliminated.map((id) => t.log.eliminated(nameOf(id)))].join(' · ');
}
