import { describe, expect, it } from 'vitest';
import { draw } from '../../engine/actions.ts';
import { cards, makePlayer, makeState } from '../../engine/test-helpers.ts';
import { spectatorView } from '../../engine/view.ts';
import { promptFor } from './prompt.ts';

const players = () => ['A', 'B', 'C'].map((id) => makePlayer(id));

describe('promptFor', () => {
  it('asks you to pick your defence, then waits for the others', () => {
    const list = players();
    list[0]!.life = [];
    list[0]!.dealt = cards('2', '3', '4', '5');
    const game = spectatorView(makeState(list, { phase: 'choosingShields', turn: null }));
    expect(promptFor(game, 'A', null, false)).toEqual({ type: 'pickDefence' });
    expect(promptFor(game, 'B', null, false)).toEqual({ type: 'waitingForDefences' });
    expect(promptFor(game, null, null, false)).toEqual({ type: 'waitingForDefences' });
  });

  it('asks the active player to draw, or to flip the side pot when the deck is empty', () => {
    const withDeck = spectatorView(makeState(players(), { drawDeck: cards('7') }));
    expect(promptFor(withDeck, 'A', null, false)).toMatchObject({ type: 'turn', yours: true, step: 'draw' });
    const empty = spectatorView(makeState(players(), { sidePot: cards('7') }));
    expect(promptFor(empty, 'A', null, false)).toMatchObject({ step: 'flip' });
  });

  it('shows the others who is playing and who they are looking at', () => {
    const drawn = spectatorView(draw(makeState(players(), { drawDeck: cards('7') }), 'A').state);
    expect(promptFor(drawn, 'B', 'C', false)).toEqual({
      type: 'turn',
      player: 'A',
      yours: false,
      hunter: false,
      step: 'pick',
      lookingAt: 'C',
    });
  });

  it('asks nothing while an attack is played back', () => {
    const game = spectatorView(makeState(players(), { drawDeck: cards('7') }));
    expect(promptFor(game, 'A', null, false, true)).toMatchObject({ yours: true, step: 'wait' });
  });

  it('marks a hunter turn', () => {
    const state = makeState(players(), { drawDeck: cards('7') });
    state.turn!.isHunter = true;
    expect(promptFor(spectatorView(state), 'A', null, false)).toMatchObject({ hunter: true });
  });

  it('gives the winner, or none when no cards were left', () => {
    const over = spectatorView(makeState(players(), { phase: 'finished', turn: null, winner: 'B' }));
    expect(promptFor(over, 'A', null, false)).toEqual({ type: 'over', winner: 'B' });
    const playing = spectatorView(makeState(players()));
    expect(promptFor(playing, 'A', null, true)).toEqual({ type: 'over', winner: null });
  });
});
