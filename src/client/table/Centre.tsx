// The middle of the table (docs/DECISIONS.md > UI > Turn flow): deck and side pot side by side, the drawn card lifted
// on the active player's side, the centre text, and the action buttons once you have picked a player.
import type { Card as CardData } from '../../engine/cards.ts';
import type { ActionType, PlayerId } from '../../engine/state.ts';
import type { PlayerSummary } from '../../engine/view.ts';
import { Card } from '../cards/Card.tsx';
import { t } from '../i18n/index.ts';
import { PILE_CARD_WIDTH, type Point } from './layout.ts';
import type { Prompt } from './prompt.ts';

/** Under the top card of the side pot, the previous ones show a little on each side (mockup round 1). */
const SIDE_POT_PEEK = [
  { shift: -0.2, angle: -11 },
  { shift: 0.2, angle: 10 },
];
/** At most this many backs drawn for the deck: it only has to look like a pile. */
const DECK_THICKNESS = 3;

interface CentreProps {
  prompt: Prompt;
  /** The latest move, in grey above the centre text. */
  lastAction: string | null;
  nameOf: (id: PlayerId) => string;
  you: PlayerId | null;
  scale: number;
  drawDeckCount: number;
  sidePot: CardData[];
  /** Where the drawn card lifts, from the middle of the piles, and how it turns. Null: no card drawn. */
  drawn: { offset: Point; rotation: number; card: CardData | null } | null;
  onDraw?: () => void;
  onFlip?: () => void;
  /** The player you are looking at, with the actions allowed on them. */
  target: { player: PlayerSummary; legal: ActionType[] } | null;
  onAction: (type: ActionType) => void;
  onBackToLobby?: () => void;
}

export function Centre(props: CentreProps) {
  const { prompt, scale, drawDeckCount, sidePot, drawn, onDraw, onFlip, target, onAction, onBackToLobby } = props;
  const width = Math.round(PILE_CARD_WIDTH * scale);
  const { main, sub } = promptText(prompt, props.nameOf, props.you);
  const deck = Array.from({ length: Math.min(drawDeckCount, DECK_THICKNESS) }, (_, i) => i);
  const [top, ...under] = [...sidePot].reverse().slice(0, 1 + SIDE_POT_PEEK.length);

  return (
    <div class="centre" style={{ '--pile-w': `${width}px` }}>
      <div class="piles">
        <button type="button" class="pile" aria-label={t.table.drawDeck} disabled={!onDraw} onClick={onDraw}>
          {deck.length === 0 && <div class="pile-empty" />}
          {deck.map((i) => (
            <div key={i} class="pile-card" style={{ transform: `translate(${(deck.length - 1 - i) * 2}px, ${(deck.length - 1 - i) * 2}px)` }}>
              <Card card={null} width={width} />
            </div>
          ))}
        </button>
        <button type="button" class="pile" aria-label={t.table.sidePot} disabled={!onFlip} onClick={onFlip}>
          {!top && <div class="pile-empty" />}
          {under.map((card, i) => (
            <div
              key={i}
              class="pile-card"
              style={{ transform: `translateX(${SIDE_POT_PEEK[i]!.shift * width}px) rotate(${SIDE_POT_PEEK[i]!.angle}deg)` }}
            >
              <Card card={card} width={width} />
            </div>
          ))}
          {top && (
            <div class="pile-card" style={{ transform: 'rotate(-1deg)' }}>
              <Card card={top} width={width} />
            </div>
          )}
        </button>
        {drawn && (
          <div
            class="drawn"
            aria-label={t.table.drawnCard}
            style={{
              transform: `translate(calc(-50% + ${drawn.offset.x}px), calc(-50% + ${drawn.offset.y}px)) rotate(${drawn.rotation}deg) scale(1.06)`,
            }}
          >
            <div class="drawn-float">
              <Card card={drawn.card} width={width} />
            </div>
          </div>
        )}
      </div>

      <p class="last-action">{props.lastAction}</p>
      <p class="prompt" aria-live="polite">
        <span class="prompt-main">{main}</span>
        {sub && <span class="prompt-sub"> · {sub}</span>}
      </p>

      <div class="actions">
        {target && (
          <>
            <ActionButton type="attack" label={t.table.attack} target={target} onAction={onAction} />
            <ActionButton
              type="defense"
              label={target.player.shield ? t.table.changeDefence : t.table.giveDefence}
              target={target}
              onAction={onAction}
            />
            <ActionButton type="munition" label={t.table.munition} target={target} onAction={onAction} />
          </>
        )}
        {onBackToLobby && (
          <button type="button" class="btn" onClick={onBackToLobby}>
            {t.table.backToLobby}
          </button>
        )}
      </div>
    </div>
  );
}

interface ActionButtonProps {
  type: ActionType;
  label: string;
  target: { legal: ActionType[] };
  onAction: (type: ActionType) => void;
}

function ActionButton({ type, label, target, onAction }: ActionButtonProps) {
  return (
    <button type="button" class="btn action" disabled={!target.legal.includes(type)} onClick={() => onAction(type)}>
      {label}
    </button>
  );
}

function promptText(prompt: Prompt, nameOf: (id: PlayerId) => string, you: PlayerId | null): { main: string; sub: string | null } {
  switch (prompt.type) {
    case 'pickDefence':
      return { main: t.table.pickDefence, sub: null };
    case 'waitingForDefences':
      return { main: t.table.waitingForDefences, sub: null };
    case 'over':
      return { main: prompt.winner ? t.table.winner(nameOf(prompt.winner)) : t.table.outOfCards, sub: null };
    case 'turn': {
      const { player, hunter, step, lookingAt } = prompt;
      if (prompt.yours) {
        const main = hunter ? t.table.yourHunterTurn : t.table.yourTurn;
        if (step === 'flip') return { main, sub: t.table.flip };
        if (step === 'draw') return { main, sub: t.table.draw };
        if (lookingAt === null) return { main, sub: t.table.pickPlayer };
        return { main, sub: t.table.pickAction(lookingAt === you ? t.table.yourself : nameOf(lookingAt)) };
      }
      const name = nameOf(player);
      const main = hunter ? t.table.hunterTurnOf(name) : t.table.turnOf(name);
      if (step !== 'pick') return { main, sub: null };
      if (lookingAt === null) return { main, sub: t.table.choosing };
      if (lookingAt === player) return { main, sub: t.table.lookingAtOwn(name) };
      if (lookingAt === you) return { main, sub: t.table.lookingAtYours(name) };
      return { main, sub: t.table.lookingAt(name, nameOf(lookingAt)) };
    }
  }
}
