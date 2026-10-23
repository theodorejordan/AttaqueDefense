// The game screen (roadmap step 4d): the players around an oval, the deck and side pot in the middle.
// Geometry: layout.ts. Centre text: prompt.ts. "Looking at" lives on the server, so every screen shows the same outline.
import { useEffect, useRef, useState } from 'preact/hooks';
import { playsFor } from '../../engine/actions.ts';
import type { ActionType, Command, PlayerId } from '../../engine/state.ts';
import type { RoomView } from '../../shared/protocol.ts';
import { send } from '../connection.ts';
import { Centre } from './Centre.tsx';
import { drawnCardOffset, seatingOrder, tableLayout } from './layout.ts';
import { promptFor } from './prompt.ts';
import { Seat } from './Seat.tsx';
import './table.css';

const play = (command: Command) => send({ type: 'game', command });
const look = (target: PlayerId | null) => send({ type: 'look', target });

export function Table({ room }: { room: RoomView }) {
  const game = room.game!;
  const box = useRef<HTMLElement>(null);
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver
  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(box.current!);
    return () => observer.disconnect();
  }, []);

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
  const layout = tableLayout(seatingOrder(game.players, you, turn?.isHunter ? turn.player : null), size);
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
  const isYourTurn = prompt.type === 'turn' && prompt.yours;

  return (
    <main
      class="table"
      ref={box}
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
          nameOf={nameOf}
          you={you}
          scale={layout.scale}
          drawDeckCount={game.drawDeckCount}
          sidePot={game.sidePot}
          drawn={drawn}
          onDraw={isYourTurn && prompt.step === 'draw' ? () => play({ type: 'draw' }) : undefined}
          onFlip={isYourTurn && prompt.step === 'flip' ? () => play({ type: 'flipSidePot' }) : undefined}
          target={target}
          onAction={onAction}
          onBackToLobby={prompt.type === 'over' && you !== null && you === room.hostId ? () => send({ type: 'backToLobby' }) : undefined}
        />
      </div>
    </main>
  );
}
