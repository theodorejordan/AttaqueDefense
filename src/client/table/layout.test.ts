import { describe, expect, it } from 'vitest';
import { cardWidth, drawnCardOffset, outward, seatingOrder, tableLayout } from './layout.ts';

const seat = (id: string, eliminated = false) => ({ id, eliminated });
const SCREEN = { width: 1440, height: 900 };

describe('seatingOrder', () => {
  const players = ['A', 'B', 'C', 'D'].map((id) => seat(id));

  it('starts from you and goes on in playing order', () => {
    expect(seatingOrder(players, 'C', [])).toEqual(['C', 'D', 'A', 'B']);
  });

  it('starts from the first seat for a spectator', () => {
    expect(seatingOrder(players, null, [])).toEqual(['A', 'B', 'C', 'D']);
  });

  it('removes eliminated players, but keeps the ones asked for (a hunter, a player just knocked out)', () => {
    const list = [seat('A'), seat('B', true), seat('C', true), seat('D')];
    expect(seatingOrder(list, 'A', [])).toEqual(['A', 'D']);
    expect(seatingOrder(list, 'A', ['C'])).toEqual(['A', 'C', 'D']);
  });

  it('starts from the next player still in the game once you are eliminated', () => {
    const list = [seat('A'), seat('B', true), seat('C'), seat('D')];
    expect(seatingOrder(list, 'B', [])).toEqual(['C', 'D', 'A']);
  });
});

describe('tableLayout', () => {
  it('puts you at the bottom, upright, and the next player on your left (clockwise)', () => {
    const { seats, centre } = tableLayout(['A', 'B', 'C', 'D'], SCREEN);
    const [me, next, opposite, last] = seats;
    expect(me!.x).toBeCloseTo(centre.x);
    expect(me!.y).toBeGreaterThan(centre.y);
    expect(me!.rotation).toBeCloseTo(0);
    expect(next!.x).toBeLessThan(centre.x);
    expect(next!.rotation).toBeCloseTo(90);
    expect(opposite!.y).toBeLessThan(centre.y);
    expect(Math.abs(opposite!.rotation)).toBeCloseTo(180);
    expect(last!.x).toBeGreaterThan(centre.x);
    expect(last!.rotation).toBeCloseTo(-90);
  });

  it('draws a wide oval that stays on the screen', () => {
    for (let count = 3; count <= 10; count++) {
      const order = Array.from({ length: count }, (_, i) => String(i));
      const { seats, centre } = tableLayout(order, SCREEN);
      const radiusX = Math.max(...seats.map((s) => Math.abs(s.x - centre.x)));
      const radiusY = Math.max(...seats.map((s) => Math.abs(s.y - centre.y)));
      expect(radiusX, `${count} players`).toBeGreaterThan(radiusY);
      for (const s of seats) {
        expect(s.x).toBeGreaterThan(0);
        expect(s.x).toBeLessThan(SCREEN.width);
        expect(s.y).toBeGreaterThan(0);
        expect(s.y).toBeLessThan(SCREEN.height);
      }
    }
  });

  it('uses the mockup card sizes on a mockup-sized screen, smaller or bigger ones otherwise, up to twice as big', () => {
    const six = ['A', 'B', 'C', 'D', 'E', 'F'];
    expect(tableLayout(six, SCREEN)).toMatchObject({ scale: 1, cardWidth: 66 });
    expect(tableLayout(six, { width: 1440, height: 450 })).toMatchObject({ scale: 0.5, cardWidth: 33 });
    expect(tableLayout(six, { width: 2560, height: 1440 })).toMatchObject({ scale: 1.6, cardWidth: 106 });
    expect(tableLayout(six, { width: 5120, height: 2880 })).toMatchObject({ scale: 2, cardWidth: 132 });
  });
});

describe('cardWidth', () => {
  it('gives bigger cards to fewer players', () => {
    expect([3, 4, 5, 6, 7, 8, 9, 10].map(cardWidth)).toEqual([100, 100, 80, 66, 56, 56, 50, 50]);
  });
});

describe('drawnCardOffset', () => {
  it('lifts the card towards the active player', () => {
    const centre = { x: 0, y: 0 };
    expect(drawnCardOffset(centre, { x: 0, y: 300 }, 1)).toEqual({ x: 0, y: 72 });
    expect(drawnCardOffset(centre, { x: -500, y: 0 }, 1)).toEqual({ x: -150, y: 0 });
    expect(drawnCardOffset(centre, { x: 0, y: -300 }, 0.5).y).toBe(-36);
  });
});

describe('outward', () => {
  it('points away from the centre', () => {
    expect(outward(0).y).toBeCloseTo(1);
    expect(outward(90).x).toBeCloseTo(-1);
    expect(outward(180).y).toBeCloseTo(-1);
  });
});
