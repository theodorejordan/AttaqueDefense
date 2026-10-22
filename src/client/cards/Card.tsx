// One playing card, face-up or face-down, upright or turned 90° (a defence). Drawing: faces.ts and card.css.
import type { Card as CardData, Suit } from '../../engine/cards.ts';
import { t } from '../i18n/index.ts';
import { COURT_PATTERNS, SUIT_PATHS, isRed, pipLayout } from './faces.ts';
import './card.css';

/** Height / width of a card. */
export const CARD_RATIO = 1.4;

interface CardProps {
  /** null: face-down, the back is shown. */
  card: CardData | null;
  /** Width in px, the height follows CARD_RATIO. */
  width: number;
  /** Turned 90°, as a defence lies on the table. The whole card turns, corner values included. */
  sideways?: boolean;
}

export function Card({ card, width, sideways = false }: CardProps) {
  const height = Math.round(width * CARD_RATIO);
  const [boxWidth, boxHeight] = sideways ? [height, width] : [width, height];
  return (
    <div
      class="card"
      role="img"
      aria-label={card ? t.cards.name(card.rank, card.suit) : t.cards.faceDown}
      style={{ '--w': `${width}px`, width: `${boxWidth}px`, height: `${boxHeight}px` }}
    >
      <div
        class="card-turn"
        style={{
          width: `${width}px`,
          height: `${height}px`,
          left: `${(boxWidth - width) / 2}px`,
          top: `${(boxHeight - height) / 2}px`,
          transform: sideways ? 'rotate(90deg)' : undefined,
        }}
      >
        {card ? <Face card={card} /> : <div class="card-back" />}
      </div>
    </div>
  );
}

function Face({ card }: { card: CardData }) {
  const path = SUIT_PATHS[card.suit];
  const court = COURT_PATTERNS[card.rank];
  return (
    <div class={isRed(card.suit) ? 'card-face red' : 'card-face'}>
      {card.rank === 'A' ? (
        <>
          <Pip path={path} x={0.5} y={0.5} variant="ace-outer" />
          <Pip path={path} x={0.5} y={0.5} variant="ace-middle" />
          <Pip path={path} x={0.5} y={0.5} variant="ace-inner" />
        </>
      ) : (
        pipLayout(card.rank).map((pip, i) => <Pip key={i} path={path} x={pip.x} y={pip.y} flipped={pip.flipped} />)
      )}
      {court && <Court pattern={court} suit={card.suit} />}
      <Index label={t.ranks[card.rank]} path={path} corner="top" />
      <Index label={t.ranks[card.rank]} path={path} corner="bottom" />
    </div>
  );
}

interface PipProps {
  path: string;
  x: number;
  y: number;
  flipped?: boolean;
  variant?: 'ace-outer' | 'ace-middle' | 'ace-inner';
}

function Pip({ path, x, y, flipped = false, variant }: PipProps) {
  return (
    <svg
      class={variant ? `pip ${variant}` : 'pip'}
      viewBox="0 0 24 24"
      aria-hidden="true"
      style={{ left: `${x * 100}%`, top: `${y * 100}%`, transform: `translate(-50%, -50%)${flipped ? ' rotate(180deg)' : ''}` }}
    >
      <path d={path} />
    </svg>
  );
}

function Court({ pattern, suit }: { pattern: string; suit: Suit }) {
  return (
    <svg class="court" viewBox="0 0 60 100" aria-hidden="true">
      <rect x="1" y="1" width="58" height="98" rx="2" />
      <path d={pattern} />
      <path d={pattern} transform="rotate(180 30 50)" />
      <path class="court-suit" d={SUIT_PATHS[suit]} transform="translate(18 38)" />
    </svg>
  );
}

function Index({ label, path, corner }: { label: string; path: string; corner: 'top' | 'bottom' }) {
  return (
    <div class={`index ${corner}`} aria-hidden="true">
      <span>{label}</span>
      <svg viewBox="0 0 24 24">
        <path d={path} />
      </svg>
    </div>
  );
}
