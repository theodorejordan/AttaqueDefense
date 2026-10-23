// One player at the table (docs/DECISIONS.md > UI > Visual style): life cards with the defence turned 90° over them on the
// centre side, munitions stacked beside them, the name below and upright. The whole seat is turned to face the centre.
import type { Card as CardData } from '../../engine/cards.ts';
import { CARDS_DEALT } from '../../engine/setup.ts';
import type { PlayerSummary } from '../../engine/view.ts';
import type { Member } from '../../shared/protocol.ts';
import { Card } from '../cards/Card.tsx';
import { t } from '../i18n/index.ts';
import { type SeatPlace, outward } from './layout.ts';

/** Whose turn it is: a grey outline, or a brown one for a hunter's turn. */
export type TurnMark = 'turn' | 'hunter' | null;

interface SeatProps {
  player: PlayerSummary;
  member: Member | undefined;
  place: SeatPlace;
  cardWidth: number;
  isYou: boolean;
  turn: TurnMark;
  /** The active player is looking at this player: a black outline, over the turn outline (RULES 10). */
  looked: boolean;
  /** The cards of an attack on this player, shown face-up over their defence for a few seconds. */
  attack: CardData[] | null;
  /** Their latest chat message, for a few seconds, on the side of the name facing the centre. */
  bubble: string | null;
  bubbleSide: 'left' | 'right';
  /** The setup phase: a player who has not chosen yet shows 4 face-down cards (RULES 3). */
  choosing: boolean;
  /** Set when you can look at this player (your turn, card drawn). */
  onPick?: () => void;
  /** Set on your own seat while you pick your defence. */
  onChooseDefence?: (cardIndex: number) => void;
}

export function Seat(props: SeatProps) {
  const { player, member, place, cardWidth, isYou, turn, looked, attack, bubble, bubbleSide, choosing, onPick, onChooseDefence } = props;
  const cards = <SeatCards player={player} width={cardWidth} choosing={choosing} onChooseDefence={onChooseDefence} />;
  const away = point(outward(place.rotation));
  const tags = [
    member?.isBot && t.lobby.bot,
    member && !member.connected && t.lobby.away,
    turn === 'hunter' && t.table.hunter,
    turn === 'turn' && (isYou ? t.table.yourTurnTag : t.table.playing),
  ].filter((tag) => typeof tag === 'string');
  const outline = looked ? 'look' : turn;

  return (
    <div
      class={bubble ? 'seat has-bubble' : 'seat'}
      style={{
        '--w': `${cardWidth}px`,
        left: `${place.x}px`,
        top: `${place.y}px`,
        transform: `translate(-50%, -50%) rotate(${place.rotation}deg)`,
      }}
    >
      {onChooseDefence ? (
        <div class={outline ? `seat-cards outline-${outline}` : 'seat-cards'}>{cards}</div>
      ) : (
        <button
          type="button"
          class={outline ? `seat-cards outline-${outline}` : 'seat-cards'}
          aria-label={player.name}
          aria-pressed={looked}
          disabled={!onPick}
          onClick={(event) => {
            event.stopPropagation();
            onPick?.();
          }}
        >
          {cards}
        </button>
      )}
      {attack && (
        <div class="attack-cards" role="img" aria-label={attack.map((card) => t.cards.name(card.rank, card.suit)).join(', ')}>
          {attack.map((card, i) => (
            <Card key={i} card={card} width={cardWidth} />
          ))}
        </div>
      )}
      {/* A point under the cards, turned back upright; the name hangs from it on the side away from the centre. */}
      <div class="seat-name-anchor" style={{ transform: `rotate(${-place.rotation}deg)` }}>
        <div class="seat-name" style={{ transform: `translate(calc(-50% + ${away.x}%), calc(-50% + ${away.y}%))` }}>
          <span class="avatar" aria-hidden="true">
            {player.name.charAt(0).toUpperCase()}
          </span>
          <span class={isYou ? 'seat-player you' : 'seat-player'}>{player.name}</span>
          {tags.map((tag) => (
            <span key={tag} class="tag">
              {tag}
            </span>
          ))}
          {bubble && <span class={`bubble ${bubbleSide}`}>{bubble}</span>}
        </div>
      </div>
    </div>
  );
}

/** Half the name's size, in % of itself, along the outward direction: its edge then touches the anchor. */
function point({ x, y }: { x: number; y: number }) {
  return { x: Math.round(x * 50), y: Math.round(y * 50) };
}

interface SeatCardsProps {
  player: PlayerSummary;
  width: number;
  choosing: boolean;
  onChooseDefence?: (cardIndex: number) => void;
}

function SeatCards({ player, width, choosing, onChooseDefence }: SeatCardsProps) {
  // Nobody sees the dealt cards (RULES 3). Once a player has chosen, their cards show at once.
  if (choosing && !player.hasChosenShield) {
    return (
      <div class="hand">
        <div class="life">
          {Array.from({ length: CARDS_DEALT }, (_, i) =>
            onChooseDefence ? (
              <button key={i} type="button" class="dealt-card" aria-label={t.table.dealtCard(i + 1)} onClick={() => onChooseDefence(i)}>
                <Card card={null} width={width} />
              </button>
            ) : (
              <Card key={i} card={null} width={width} />
            ),
          )}
        </div>
      </div>
    );
  }
  return (
    <>
      <div class="hand">
        {player.shield && (
          <div class="defence">
            <Card card={player.shield} width={width} sideways />
          </div>
        )}
        <div class="life">
          {player.life.map((card, i) => (
            <Card key={i} card={card} width={width} />
          ))}
        </div>
      </div>
      {player.munitionCount > 0 && (
        <div class="munitions" style={{ '--count': player.munitionCount }}>
          {Array.from({ length: player.munitionCount }, (_, i) => (
            <div key={i} style={{ left: `calc(var(--w) * ${0.12 * i})` }}>
              <Card card={null} width={width} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
