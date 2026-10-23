import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../../engine/state.ts';
import { ranking } from './ranking.ts';

const out = (player: string): GameEvent => ({ type: 'eliminated', player });

describe('ranking', () => {
  it('fills the places from the bottom as players are eliminated', () => {
    expect(ranking(4, [out('C'), out('A')], new Set(['A', 'C']), null)).toEqual([null, null, 'A', 'C']);
  });

  it('waits until the table shows a player out', () => {
    expect(ranking(3, [out('C')], new Set(), null)).toEqual([null, null, null]);
  });

  it('puts the winner first at the end', () => {
    expect(ranking(3, [out('C'), out('A')], new Set(['A', 'C']), 'B')).toEqual(['B', 'A', 'C']);
  });
});
