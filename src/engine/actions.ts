// See docs/RULES.md sections 4 to 8.
import { type Card, cardValue, sumValues } from './cards.ts';
import { type CardLocation, chooseDamageOption } from './damage.ts';
import { chooseShield } from './setup.ts';
import {
  type ActionType,
  type Command,
  type DamagePreference,
  type GameEvent,
  type GameState,
  IllegalMoveError,
  OutOfCardsError,
  type Play,
  type Player,
  type PlayerId,
  type Result,
  cloneState,
  getPlayer,
} from './state.ts';

const ACTION_TYPES: readonly ActionType[] = ['attack', 'defense', 'munition'];

/** Single entry point used by the server, bots and simulations. */
export function applyCommand(state: GameState, playerId: PlayerId, command: Command): Result {
  switch (command.type) {
    case 'chooseShield':
      return chooseShield(state, playerId, command.cardIndex);
    case 'draw':
      return draw(state, playerId);
    case 'play':
      return play(state, playerId, command.play);
    case 'setPreference':
      return setPreference(state, playerId, command.preference);
  }
}

export function setPreference(state: GameState, playerId: PlayerId, preference: DamagePreference): Result {
  const next = cloneState(state);
  getPlayer(next, playerId).preference = preference;
  return { state: next, events: [] };
}

function requireActivePlayer(state: GameState, playerId: PlayerId) {
  if (state.phase !== 'playing' || !state.turn) throw new IllegalMoveError('The game is not running');
  if (state.turn.player !== playerId) throw new IllegalMoveError('Not your turn');
  return state.turn;
}

/** RULES 4 step 1. Flips the side pot when the draw deck is empty (RULES 7). */
export function draw(state: GameState, playerId: PlayerId): Result {
  if (requireActivePlayer(state, playerId).drawn) throw new IllegalMoveError('Already drawn');

  const next = cloneState(state);
  const events: GameEvent[] = [];
  if (next.drawDeck.length === 0) {
    if (next.sidePot.length === 0) throw new OutOfCardsError('No cards left to draw');
    // Flipping without shuffling: the oldest card (bottom of the side pot) ends up on top.
    next.drawDeck = next.sidePot;
    next.sidePot = [];
    events.push({ type: 'deckFlipped', cardCount: next.drawDeck.length });
  }

  const turn = next.turn!;
  turn.drawn = next.drawDeck.shift()!;
  turn.drawnVisible = getPlayer(next, playerId).shield?.rank === 'A';
  events.push({ type: 'drew', player: playerId });
  return { state: next, events };
}

/** Every legal play for `actor`, given who is still in the game. */
export function playsFor(actor: PlayerId, alivePlayers: readonly PlayerId[]): Play[] {
  // A hunter is already eliminated, so they are never in `alivePlayers`:
  // this automatically forbids giving themselves a shield or a munition (RULES 8.2).
  return ACTION_TYPES.flatMap((type) =>
    alivePlayers
      .filter((target) => type !== 'attack' || target !== actor)
      .map((target) => ({ type, target })),
  );
}

export function legalPlays(state: GameState, playerId: PlayerId): Play[] {
  if (state.phase !== 'playing' || state.turn?.player !== playerId || !state.turn.drawn) return [];
  return playsFor(playerId, alivePlayerIds(state));
}

function alivePlayerIds(state: GameState): PlayerId[] {
  return state.players.filter((p) => !p.eliminated).map((p) => p.id);
}

/** RULES 4 step 2. */
export function play(state: GameState, playerId: PlayerId, chosen: Play): Result {
  const turn = requireActivePlayer(state, playerId);
  if (!turn.drawn) throw new IllegalMoveError('Draw a card first');
  const isLegal = legalPlays(state, playerId).some(
    (p) => p.type === chosen.type && p.target === chosen.target,
  );
  if (!isLegal) throw new IllegalMoveError(`Illegal play: ${chosen.type} on ${chosen.target}`);

  const next = cloneState(state);
  const events: GameEvent[] = [];
  const card = next.turn!.drawn!;
  next.turn!.drawn = null;
  next.turn!.drawnVisible = false;
  const actor = getPlayer(next, playerId);
  const target = getPlayer(next, chosen.target);

  let eliminated: PlayerId | null = null;
  switch (chosen.type) {
    case 'attack':
      eliminated = attack(next, actor, target, card, events);
      break;
    case 'defense':
      // RULES 5.2: replacing a shield is not destroying it, so munitions are kept.
      if (target.shield) next.sidePot.push(target.shield);
      events.push({ type: 'shieldPlaced', by: actor.id, target: target.id, card, replaced: target.shield });
      target.shield = card;
      break;
    case 'munition':
      target.munitions.push(card);
      events.push({ type: 'munitionGiven', by: actor.id, target: target.id });
      break;
  }

  endTurn(next, eliminated, events);
  return { state: next, events };
}

/** RULES 5.1. Returns the id of the eliminated target, if any. */
function attack(state: GameState, attacker: Player, target: Player, drawn: Card, events: GameEvent[]): PlayerId | null {
  const cards = [drawn, ...attacker.munitions];
  attacker.munitions = [];
  const total = sumValues(cards);
  const shield = target.shield;

  let shieldDestroyed = false;
  let damage = total;
  if (shield) {
    shieldDestroyed = total >= cardValue(shield);
    damage = Math.max(0, total - cardValue(shield));
  }

  // Shield first, then attack cards (RULES 5.1 step 5).
  if (shieldDestroyed) {
    state.sidePot.push(shield!);
    target.shield = null;
  }
  state.sidePot.push(...cards);
  events.push({ type: 'attacked', attacker: attacker.id, target: target.id, cards, total, shield, shieldDestroyed, damage });

  if (damage > 0 && applyDamage(state, target, damage, events)) return target.id;

  // RULES 6.3: munitions are lost after the damage is resolved.
  if ((shieldDestroyed || damage > 0) && target.munitions.length > 0) {
    const lost = target.munitions;
    target.munitions = [];
    state.sidePot.push(...lost);
    events.push({ type: 'munitionsLost', player: target.id, cards: lost });
  }
  return null;
}

/** RULES 6. Returns true if the player is eliminated. */
function applyDamage(state: GameState, player: Player, damage: number, events: GameEvent[]): boolean {
  const option = chooseDamageOption(player.life, damage, state.sidePot, state.drawDeck, player.preference);
  if (!option) {
    eliminate(state, player, events);
    return true;
  }

  const before = [...player.life];
  const replacements = takeCards(state, option.replacements);
  const removed = option.removed.map((i) => player.life[i]!);
  // Replacements take the place of the first removed card, so the column keeps its order.
  const firstRemoved = Math.min(...option.removed);
  player.life = player.life.flatMap((card, i) => {
    if (i === firstRemoved) return replacements;
    return option.removed.includes(i) ? [] : [card];
  });
  // Removed life cards are discarded after the search.
  state.sidePot.push(...removed);
  events.push({ type: 'damaged', player: player.id, damage, before, after: [...player.life] });
  return false;
}

/** Removes cards from their piles, highest index first so the other indices stay valid. */
function takeCards(state: GameState, locations: CardLocation[]): Card[] {
  const cards = locations.map(({ pile, index }) => state[pile][index]!);
  [...locations]
    .sort((a, b) => b.index - a.index)
    .forEach(({ pile, index }) => state[pile].splice(index, 1));
  return cards;
}

/** RULES 8.1. */
function eliminate(state: GameState, player: Player, events: GameEvent[]) {
  state.sidePot.push(...player.life, ...(player.shield ? [player.shield] : []), ...player.munitions);
  player.life = [];
  player.shield = null;
  player.munitions = [];
  player.eliminated = true;
  events.push({ type: 'eliminated', player: player.id });
}

function hunterApplies(state: GameState): boolean {
  switch (state.settings.hunterRule) {
    case 'off':
      return false;
    case 'firstOnly':
      return !state.firstEliminationDone;
    case 'all':
      return true;
  }
}

/** RULES 4 steps 3-4 and 8.2. */
function endTurn(state: GameState, eliminated: PlayerId | null, events: GameEvent[]) {
  const turn = state.turn!;
  const alive = alivePlayerIds(state);
  if (alive.length <= 1) {
    state.phase = 'finished';
    state.winner = alive[0] ?? null;
    state.turn = null;
    events.push({ type: 'gameOver', winner: state.winner });
    return;
  }

  if (eliminated) {
    const isHunter = hunterApplies(state);
    state.firstEliminationDone = true;
    if (isHunter) {
      state.turn = { player: eliminated, drawn: null, drawnVisible: false, isHunter: true, resumeAfter: turn.resumeAfter };
      events.push({ type: 'hunterTurn', player: eliminated });
      return;
    }
  }

  const next = nextAlivePlayer(state, turn.resumeAfter);
  state.turn = { player: next, drawn: null, drawnVisible: false, isHunter: false, resumeAfter: next };
  events.push({ type: 'turnStarted', player: next });
}

function nextAlivePlayer(state: GameState, after: PlayerId): PlayerId {
  const start = state.players.findIndex((p) => p.id === after);
  for (let step = 1; step <= state.players.length; step++) {
    const candidate = state.players[(start + step) % state.players.length]!;
    if (!candidate.eliminated) return candidate.id;
  }
  throw new Error('No player left');
}
