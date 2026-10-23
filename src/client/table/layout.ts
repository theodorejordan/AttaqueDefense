// Where everything sits on the table (docs/DECISIONS.md > UI > Visual style, mockup rounds 2 and 3): the players on a
// slightly wide oval, you at the bottom, the others clockwise, every player's cards facing the centre.
// Pure functions, so they are tested without a browser.
import type { PlayerId } from '../../engine/state.ts';

/** The mockups were drawn for a 1440 × 900 screen: the table scales from there, up to twice as big on a large screen. */
const REFERENCE = { width: 1440, height: 900 };
const MAX_SCALE = 2;
/** Width of the deck, side pot and drawn card at full size, whatever the number of players. */
export const PILE_CARD_WIDTH = 80;
/** Size of the name under a player's cards (a long name with its tags), and the space kept around the table. */
const NAME_HEIGHT = 30;
const NAME_WIDTH = 140;
const MARGIN = 16;
/** Horizontal radius / vertical radius of the oval below 7 players. From 7, the oval uses the whole width. */
const OVAL_RATIO = 1.45;
/** How far the drawn card lifts from the deck and side pot towards the active player, vertically and horizontally. */
const DRAWN_OFFSET = { vertical: 72, horizontal: 150 };

/** Card width at full size, by number of players at the table (mockup round 3). */
export function cardWidth(players: number): number {
  if (players <= 4) return 100;
  if (players === 5) return 80;
  if (players === 6) return 66;
  if (players <= 8) return 56;
  return 50;
}

/**
 * The players at the table, clockwise from the bottom seat: you, or the next player still in the game after you
 * (spectators start from the first seat). Eliminated players leave the table, except those in `kept`:
 * a hunter during their hunter turn, a player while the attack that eliminated them is shown.
 */
export function seatingOrder(
  players: readonly { id: PlayerId; eliminated: boolean }[],
  you: PlayerId | null,
  kept: readonly PlayerId[],
): PlayerId[] {
  const start = Math.max(0, players.findIndex((p) => p.id === you));
  return [...players.slice(start), ...players.slice(0, start)]
    .filter((p) => !p.eliminated || kept.includes(p.id))
    .map((p) => p.id);
}

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface SeatPlace extends Point {
  id: PlayerId;
  /** Degrees, clockwise: 0 for the bottom seat, 180 for the seat opposite. The cards' top faces the centre. */
  rotation: number;
}

export interface TableLayout {
  /** 1 on a screen as big as the mockups', less on a smaller one, up to 2 on a large one. */
  scale: number;
  /** Width of the players' cards, in px. */
  cardWidth: number;
  centre: Point;
  seats: SeatPlace[];
}

/** Places the seats (centre of each player's cards) on an oval around the centre of a table of the given size. */
export function tableLayout(order: readonly PlayerId[], size: Size): TableLayout {
  const scale = Math.min(MAX_SCALE, size.width / REFERENCE.width, size.height / REFERENCE.height);
  const w = cardWidth(order.length) * scale;
  // A seat before rotation: the defence over the life cards, the munitions beside them, the name below.
  const cardsHeight = w * (0.65 + 1.4);
  const seatWidth = w * 4.9;
  const centre = { x: size.width / 2, y: size.height / 2 };
  const radiusY = Math.max(0, size.height / 2 - MARGIN - cardsHeight / 2 - NAME_HEIGHT * scale);
  // A seat on the far left or right is turned sideways: its upright name hangs outside its cards.
  const sideExtent = Math.max(seatWidth / 2, cardsHeight / 2 + NAME_WIDTH * scale);
  const maxRadiusX = Math.max(0, size.width / 2 - MARGIN - sideExtent);
  const radiusX = order.length >= 7 ? maxRadiusX : Math.min(maxRadiusX, radiusY * OVAL_RATIO);

  const seats = order.map((id, k) => {
    // Angles grow clockwise on screen (y points down): the bottom seat first, then to its left.
    const angle = Math.PI / 2 + (2 * Math.PI * k) / order.length;
    const x = centre.x + radiusX * Math.cos(angle);
    const y = centre.y + radiusY * Math.sin(angle);
    // Turn the cards so their top points at the centre (the oval is wider than tall, so this is not just the angle).
    const rotation = (Math.atan2(centre.x - x, y - centre.y) * 180) / Math.PI;
    return { id, x, y, rotation };
  });
  return { scale, cardWidth: Math.round(w), centre, seats };
}

/**
 * Where the drawn card lifts, from the middle of the deck and side pot: on the active player's side,
 * further sideways than up or down because the deck and side pot sit side by side.
 */
export function drawnCardOffset(centre: Point, seat: Point, scale: number): Point {
  const dx = seat.x - centre.x;
  const dy = seat.y - centre.y;
  const length = Math.hypot(dx, dy) || 1;
  const [ux, uy] = [dx / length, dy / length];
  const distance = (DRAWN_OFFSET.vertical * Math.abs(uy) + DRAWN_OFFSET.horizontal * Math.abs(ux)) * scale;
  return { x: ux * distance, y: uy * distance };
}

/** The direction from a seat away from the centre, on screen. The upright name hangs on that side of the cards. */
export function outward(rotation: number): Point {
  const radians = (rotation * Math.PI) / 180;
  return { x: -Math.sin(radians), y: Math.cos(radians) };
}
