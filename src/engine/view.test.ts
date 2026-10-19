import { describe, expect, it } from 'vitest';
import { draw } from './actions.ts';
import { card, cards, makePlayer, makeState } from './test-helpers.ts';
import { spectatorView, viewFor } from './view.ts';

describe('viewFor (RULES 9)', () => {
  const players = () => ['A', 'B', 'C'].map((id) => makePlayer(id));

  it('shows munition counts but not their values, and only the deck size', () => {
    const list = players();
    list[1]!.munitions = [card('K', 'clubs')];
    const state = makeState(list, { drawDeck: [card('Q', 'diamonds')] });
    const view = viewFor(state, 'A');
    expect(view.players[1]!.munitionCount).toBe(1);
    expect(view.drawDeckCount).toBe(1);
    const json = JSON.stringify(view);
    expect(json).not.toContain('clubs');
    expect(json).not.toContain('diamonds');
  });

  it('shows the drawn card only to its Ace-holding drawer', () => {
    const list = players();
    list[0]!.shield = card('A');
    const state = draw(makeState(list, { drawDeck: cards('7') }), 'A').state;
    expect(viewFor(state, 'A').turn?.drawnCard).toEqual(card('7'));
    expect(viewFor(state, 'B').turn?.drawnCard).toBeNull();
    expect(viewFor(state, 'B').turn?.hasDrawn).toBe(true);
  });

  it('never shows the drawn card to spectators', () => {
    const list = players();
    list[0]!.shield = card('A');
    const state = draw(makeState(list, { drawDeck: cards('7') }), 'A').state;
    const view = spectatorView(state);
    expect(view.turn).toMatchObject({ hasDrawn: true, drawnCard: null });
    expect(view).not.toHaveProperty('you');
  });

  it('hides the drawn card from a drawer without an Ace', () => {
    const state = draw(makeState(players(), { drawDeck: cards('7') }), 'A').state;
    expect(viewFor(state, 'A').turn?.drawnCard).toBeNull();
  });

  it('hides the dealt cards during the shield choice', () => {
    const list = players().map((p) => ({ ...p, life: [], dealt: [card('K', 'clubs')] }));
    const view = viewFor(makeState(list, { phase: 'choosingShields', turn: null }), 'A');
    expect(JSON.stringify(view)).not.toContain('clubs');
    expect(view.players[0]!.hasChosenShield).toBe(false);
  });
});
