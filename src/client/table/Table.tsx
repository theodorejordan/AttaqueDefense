// The game screen (roadmap step 4d): the players around an oval, the deck and side pot in the middle.
// Geometry: layout.ts. Centre text: prompt.ts. "Looking at" lives on the server, so every screen shows the same outline.
import { useEffect, useRef, useState } from 'preact/hooks';
import { playsFor } from '../../engine/actions.ts';
import type { ActionType, Command, GameEvent, PlayerId } from '../../engine/state.ts';
import type { RoomView } from '../../shared/protocol.ts';
import { onEvents, send } from '../connection.ts';
import { describeLastAction, lastAction } from '../log/describe.ts';
import { Centre } from './Centre.tsx';
import { drawnCardOffset, seatingOrder, tableLayout } from './layout.ts';
import { promptFor } from './prompt.ts';
import { Seat } from './Seat.tsx';
import './table.css';

const play = (command: Command) => send({ type: 'game', command });
const look = (target: PlayerId | null) => send({ type: 'look', target });

/** How long the attack cards stay on their target (docs/DECISIONS.md > UI > Animations). The server waits as long before a bot plays. */
const ATTACK_SHOWN_MS = 4_000;
type Attack = Extract<GameEvent, { type: 'attacked' }>;

export function Table({ room, log }: { room: RoomView; log: GameEvent[] }) {
  const game = room.game!;
  const box = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [attack, setAttack] = useState<Attack | null>(null);

  // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(box.current!);
    return () => observer.disconnect();
  }, []);

  // An attack is shown on its target for a few seconds; a new one replaces it.
  useEffect(
    () =>
      onEvents((events) => {
        const latest = events.filter((e): e is Attack => e.type === 'attacked').at(-1);
        if (latest) setAttack(latest);
      }),
    [],
  );
  useEffect(() => {
    if (!attack) return;
    const timer = setTimeout(() => setAttack(null), ATTACK_SHOWN_MS);
    return () => clearTimeout(timer);
  }, [attack]);

  const { you, lookingAt } = room;
  const prompt = promptFor(game, you, lookingAt, room.outOfCards);
  const picking = prompt.type === 'turn' && prompt.yours && prompt.step === 'pick';

  // Esc stops looking at a player, like a click on an empty part of the table (docs/DECISIONS.md > UI > Turn flow).
  useEffect(() => {
    if (!picking || lookingAt === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') look(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [picking, lookingAt]);

  const turn = prompt.type === 'turn' ? game.turn : null;
  // A hunter stays seated for their hunter turn, a knocked-out player while the attack is shown.
  const kept = [turn?.isHunter ? turn.player : null, attack?.target ?? null].filter((id) => id !== null);
  const layout = tableLayout(seatingOrder(game.players, you, kept), size);
  const players = new Map(game.players.map((p) => [p.id, p]));
  const nameOf = (id: PlayerId) => players.get(id)?.name ?? id;
  const choosing = game.phase === 'choosingShields';

  const activeSeat = layout.seats.find((s) => s.id === turn?.player);
  const drawn =
    turn?.hasDrawn && activeSeat
      ? { offset: drawnCardOffset(layout.centre, activeSeat, layout.scale), rotation: activeSeat.rotation, card: turn.drawnCard }
      : null;

  const looked = picking && lookingAt !== null ? players.get(lookingAt) : undefined;
  const target = looked
    ? {
        player: looked,
        legal: playsFor(you!, game.players, game.settings.maxMunitions)
          .filter((p) => p.target === looked.id)
          .map((p) => p.type),
      }
    : null;
  const onAction = (type: ActionType) => looked && play({ type: 'play', play: { type, target: looked.id } });
  // The wait is client-side: your deck stays disabled while an attack is shown (docs/DECISIONS.md > UI > Animations).
  const canDraw = prompt.type === 'turn' && prompt.yours && attack === null;
  const last = lastAction(log);

  return (
    <main
      class="table"
      ref={box}
      // Text grows with the table on a large screen, but never shrinks below its normal size.
      style={{ '--text-scale': Math.max(1, layout.scale) }}
      onClick={(event) => {
        if (picking && lookingAt !== null && event.target === event.currentTarget) look(null);
      }}
    >
      {layout.seats.map((place) => {
        const player = players.get(place.id)!;
        const isTurn = turn?.player === place.id;
        return (
          <Seat
            key={place.id}
            player={player}
            member={room.members.find((m) => m.id === place.id)}
            place={place}
            cardWidth={layout.cardWidth}
            isYou={place.id === you}
            turn={isTurn ? (turn.isHunter ? 'hunter' : 'turn') : null}
            looked={place.id === lookingAt}
            attack={attack?.target === place.id ? attack.cards : null}
            choosing={choosing}
            onPick={picking && !player.eliminated ? () => look(place.id === lookingAt ? null : place.id) : undefined}
            onChooseDefence={
              choosing && place.id === you && !player.hasChosenShield
                ? (cardIndex) => play({ type: 'chooseShield', cardIndex })
                : undefined
            }
          />
        );
      })}
      <div class="centre-anchor" style={{ left: `${layout.centre.x}px`, top: `${layout.centre.y}px` }}>
        <Centre
          prompt={prompt}
          lastAction={last && describeLastAction(last, nameOf)}
          nameOf={nameOf}
          you={you}
          scale={layout.scale}
          drawDeckCount={game.drawDeckCount}
          sidePot={game.sidePot}
          drawn={drawn}
          onDraw={canDraw && prompt.step === 'draw' ? () => play({ type: 'draw' }) : undefined}
          onFlip={canDraw && prompt.step === 'flip' ? () => play({ type: 'flipSidePot' }) : undefined}
          target={target}
          onAction={onAction}
          onBackToLobby={prompt.type === 'over' && you !== null && you === room.hostId ? () => send({ type: 'backToLobby' }) : undefined}
        />
      </div>
    </main>
  );
}
