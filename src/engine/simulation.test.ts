// Plays many random-bot games and checks invariants after every command.
import { describe, expect, it } from 'vitest';
import { applyCommand } from './actions.ts';
import { randomBot } from './bots/random.ts';
import { type Card, cardKey, sumValues } from './cards.ts';
import { MAX_LIFE_CARDS } from './damage.ts';
import { createRng, pick } from './rng.ts';
import { createGame, hasChosenShield } from './setup.ts';
import { type DamagePreference, type GameState, type HunterRule, OutOfCardsError, type PlayerId } from './state.ts';
import { viewFor } from './view.ts';

const GAMES = 200;
const MAX_COMMANDS = 5000;
const PREFERENCES: DamagePreference[] = ['fewestCards', 'lowestMax', 'normal'];
const HUNTER_RULES: HunterRule[] = ['off', 'firstOnly', 'all'];
const CARD_IN_JSON = /"rank":"[^"]+","suit":"[^"]+"/g;

function allCards(state: GameState): Card[] {
  return [
    ...state.players.flatMap((p) => [...p.dealt, ...p.life, ...(p.shield ? [p.shield] : []), ...p.munitions]),
    ...state.drawDeck,
    ...state.sidePot,
    ...(state.turn?.drawn ? [state.turn.drawn] : []),
  ];
}

function hiddenCardsFor(state: GameState, viewer: PlayerId): Card[] {
  const drawn = state.turn?.drawn;
  const drawnVisible = state.turn?.player === viewer && state.turn.drawnVisible;
  return [
    ...state.players.flatMap((p) => [...p.dealt, ...p.munitions]),
    ...state.drawDeck,
    ...(drawn && !drawnVisible ? [drawn] : []),
  ];
}

/** Plain checks instead of expect(): this runs hundreds of thousands of times. */
function checkInvariants(state: GameState, previous: GameState, seed: number) {
  const fail = (message: string) => {
    throw new Error(`Invariant broken (seed ${seed}): ${message}`);
  };

  const keys = allCards(state).map(cardKey);
  if (keys.length !== 52 || new Set(keys).size !== 52) fail(`${keys.length} cards, ${new Set(keys).size} unique`);

  for (const p of state.players) {
    if (p.life.length > MAX_LIFE_CARDS) fail(`${p.id} has ${p.life.length} life cards`);
    if (p.eliminated && (p.life.length || p.munitions.length || p.shield)) fail(`eliminated ${p.id} still has cards`);
    if (!p.eliminated && state.phase !== 'choosingShields' && p.life.length === 0) fail(`${p.id} alive without life`);
    const before = previous.players.find((q) => q.id === p.id)!;
    if (previous.phase !== 'choosingShields' && sumValues(p.life) > sumValues(before.life)) {
      fail(`${p.id} gained life points`);
    }
  }

  // Scans the serialized view, so a hidden card leaking through any field is caught.
  for (const p of state.players) {
    const json = JSON.stringify(viewFor(state, p.id));
    const visible = new Set(json.match(CARD_IN_JSON));
    for (const hidden of hiddenCardsFor(state, p.id)) {
      if (visible.has(JSON.stringify(hidden).slice(1, -1))) fail(`${cardKey(hidden)} leaked to ${p.id}`);
    }
  }
}

/** During the shield choice anyone may act; then only the active player. */
function nextActor(state: GameState): PlayerId {
  if (state.phase === 'choosingShields') return state.players.find((p) => !hasChosenShield(p))!.id;
  return state.turn!.player;
}

/** Returns null if the game ran out of cards (rule not decided yet). */
function runGame(seed: number): GameState | null {
  const rng = createRng(seed);
  const playerCount = 3 + (seed % 8);
  const players = Array.from({ length: playerCount }, (_, i) => ({ id: `p${i}`, name: `Bot ${i}` }));
  let state = createGame(players, { hunterRule: pick(HUNTER_RULES, rng) }, rng);
  for (const p of players) {
    state = applyCommand(state, p.id, { type: 'setPreference', preference: pick(PREFERENCES, rng) }).state;
  }

  let commands = 0;
  while (state.phase !== 'finished') {
    if (++commands > MAX_COMMANDS) throw new Error(`Game with seed ${seed} did not end`);
    const actor = nextActor(state);
    const command = randomBot(viewFor(state, actor), rng);
    if (!command) throw new Error(`Bot ${actor} had nothing to do (seed ${seed})`);
    const previous = state;
    try {
      state = applyCommand(state, actor, command).state;
    } catch (error) {
      if (error instanceof OutOfCardsError) return null;
      throw error;
    }
    checkInvariants(state, previous, seed);
  }
  return state;
}

describe(`simulation: ${GAMES} random-bot games`, () => {
  it('always ends with a winner and never breaks an invariant', () => {
    let outOfCards = 0;
    for (let seed = 1; seed <= GAMES; seed++) {
      const final = runGame(seed);
      if (final === null) outOfCards++;
      else expect(final.winner, `seed ${seed}`).not.toBeNull();
    }
    // Rare with random bots (about 0.4% of games with 8-10 players).
    expect(outOfCards).toBeLessThan(GAMES / 50);
  }, 20_000);

  it.todo('out of cards (draw deck and side pot empty): rule to decide');
});
