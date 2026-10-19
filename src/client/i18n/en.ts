// English texts. `fr.ts` must have exactly the same keys: TypeScript checks it.
// Vocabulary: docs/DECISIONS.md > UI > Vocabulary and Languages.
import type { Rank } from '../../engine/cards.ts';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../engine/setup.ts';
import type { DamagePreference, Settings } from '../../engine/state.ts';
import { type ErrorCode, MAX_NAME_LENGTH } from '../../shared/protocol.ts';
import { plural } from './plural.ts';

const ranks: Record<Rank, string> = {
  A: 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', '10': '10', J: 'J', Q: 'Q', K: 'K',
};

const preferences: Record<DamagePreference, string> = {
  normal: 'Normal',
  fewestCards: 'Fewest cards',
  lowestMax: 'Lowest max',
};

const errors: Record<ErrorCode, string> = {
  invalidRequest: 'Invalid request',
  invalidName: `Names have 1 to ${MAX_NAME_LENGTH} characters`,
  nameTaken: 'That name is taken',
  gameFull: 'The game is full',
  alreadySeated: 'You already have a seat',
  notSeated: 'Join the game first',
  notHost: 'Only the host can do that',
  notEnoughPlayers: `A game needs ${MIN_PLAYERS} to ${MAX_PLAYERS} players`,
  invalidSettings: 'Invalid settings',
  unknownBot: 'Unknown bot',
  gameInProgress: 'A game is in progress: you can join once it is over',
  noGame: 'No game in progress',
  gameNotOver: 'The game is not over',
  gameOver: 'The game is over',
  illegalMove: 'This move is not allowed',
  serverError: 'Server error',
};

export const en = {
  title: 'AttaqueDéfense (debug)',
  nobody: 'nobody',
  ranks,
  preferences,
  errors,
  lobby: {
    title: 'Lobby',
    bot: 'bot',
    host: 'host',
    away: 'away',
    you: 'you',
    remove: 'Remove',
    namePlaceholder: 'Your name',
    join: 'Join',
    leave: 'Leave',
    hunters: 'Hunters',
    decks: 'Decks',
    maxMunitions: 'Max munitions',
    addBot: 'Add bot',
    start: 'Start',
    summary: (s: Settings) => `Hunters ${s.hunters}, decks ${s.deckCount}, max munitions ${s.maxMunitions}`,
  },
  game: {
    title: 'Game',
    spectating: 'Game (spectating)',
    outOfCards: 'No cards left: the game is over.',
    over: (winner: string) => `Game over. Winner: ${winner}`,
    choosing: 'Everyone chooses a defence, blind.',
    turn: (who: string, isHunter: boolean, hasDrawn: boolean) =>
      `${who}'s turn${isHunter ? ' (hunter)' : ''}${hasDrawn ? ', card drawn' : ''}`,
    player: 'Player',
    life: 'Life',
    defence: 'Defence',
    munitions: 'Munitions',
    you: '(you)',
    ready: 'ready',
    choosingShort: 'choosing…',
    select: 'Select',
    selected: 'Selected',
    pickDefence: 'Pick your defence: ',
    card: (n: number) => `Card ${n}`,
    draw: 'Draw',
    drawn: (card: string | null) =>
      `Drawn card: ${card ? `${card} (Ace peek)` : 'face-down'}. Select a player, then: `,
    attack: (who: string) => `Attack ${who}`,
    changeDefence: (who: string) => `Change ${who}'s defence`,
    giveDefence: (who: string) => `Give ${who} a defence`,
    munition: (who: string) => `Munition ${who}`,
    preference: 'Damage preference: ',
    backToLobby: 'Back to lobby',
    piles: (drawDeck: number, sidePot: string) =>
      `Draw deck: ${plural('en', drawDeck, { one: 'card', other: 'cards' })}. Side pot (top first): ${sidePot}`,
  },
  log: {
    title: 'Log',
    defenceChosen: (who: string) => `${who} chose a defence`,
    gameStarted: (first: string) => `Defences revealed. ${first} starts`,
    turnStarted: (who: string) => `${who}'s turn`,
    hunterTurn: (who: string) => `${who} plays as hunter`,
    deckFlipped: (count: number) =>
      `Side pot flipped into a new draw deck (${plural('en', count, { one: 'card', other: 'cards' })})`,
    drew: (who: string) => `${who} drew`,
    attacked: (attacker: string, target: string, cards: string, total: number, defence: string | null, destroyed: boolean, damage: number) =>
      `${attacker} attacked ${target} with ${cards} = ${total}` +
      (defence ? `, defence ${defence} ${destroyed ? 'destroyed' : 'holds'}` : '') +
      `, ${damage} damage`,
    damaged: (who: string, damage: number, before: string, after: string) => `${who} took ${damage}: ${before} → ${after}`,
    munitionsLost: (who: string, cards: string) => `${who} lost their munitions: ${cards}`,
    eliminated: (who: string) => `${who} is eliminated`,
    timedOut: (who: string) => `${who} was away for too long`,
    defencePlaced: (by: string, target: string, card: string, replaced: string | null) =>
      `${by} gave ${target} a ${card} defence${replaced ? ` (replacing ${replaced})` : ''}`,
    munitionGiven: (by: string, target: string) => `${by} gave ${target} a munition`,
  },
};

export type Messages = typeof en;
