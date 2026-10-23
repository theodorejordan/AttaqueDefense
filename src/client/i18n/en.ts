// English texts. `fr.ts` must have exactly the same keys: TypeScript checks it.
// Vocabulary: docs/DECISIONS.md > UI > Vocabulary and Languages.
import type { Rank, Suit } from '../../engine/cards.ts';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../engine/setup.ts';
import type { DamagePreference } from '../../engine/state.ts';
import { type ErrorCode, MAX_CHAT_LENGTH, MAX_NAME_LENGTH } from '../../shared/protocol.ts';
import { plural } from './plural.ts';

const ranks: Record<Rank, string> = {
  A: 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', '10': '10', J: 'J', Q: 'Q', K: 'K',
};

const rankNames: Record<Rank, string> = {
  A: 'Ace', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', '10': '10', J: 'Jack', Q: 'Queen', K: 'King',
};

const suitNames: Record<Suit, string> = { hearts: 'hearts', diamonds: 'diamonds', clubs: 'clubs', spades: 'spades' };

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules/PluralRules#type
const ordinals = new Intl.PluralRules('en', { type: 'ordinal' });
const ORDINAL_SUFFIXES: Record<Intl.LDMLPluralRule, string> = { zero: 'th', one: 'st', two: 'nd', few: 'rd', many: 'th', other: 'th' };

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
  invalidMessage: `Messages have 1 to ${MAX_CHAT_LENGTH} characters`,
  chatTooFast: 'You are sending messages too fast',
  serverError: 'Server error',
};

export const en = {
  ranks,
  /** Read by screen readers. */
  cards: {
    name: (rank: Rank, suit: Suit) => `${rankNames[rank]} of ${suitNames[suit]}`,
    faceDown: 'Face-down card',
  },
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
    maxMunitions: 'Max munitions per player',
    addBot: 'Add bot',
    start: 'Start game',
    players: 'Players',
    seats: (count: number) => `${count} / ${MAX_PLAYERS} seats`,
    spectators: (count: number) =>
      count === 0 ? 'No spectators' : `${plural('en', count, { one: 'spectator', other: 'spectators' })} watching`,
    settings: 'Game settings',
    /** Index = number of hunters (RULES 8.2). */
    hunterOptions: ['Off', 'First out', 'First two', 'First three'],
    huntersHelp: 'The first players eliminated play one last turn.',
    deckOption: (count: number) => plural('en', count, { one: 'deck', other: 'decks' }),
    decksHelp: 'Two decks possible from 6 players, required from 9.',
    fewerMunitions: 'Fewer munitions',
    moreMunitions: 'More munitions',
    youAreHost: 'You are the host: start when everyone is in.',
    waitingFor: (host: string) => `Waiting for ${host} to start the game.`,
    takeASeat: 'Type a name and join to play.',
  },
  chat: {
    title: 'Chat',
    placeholder: 'Say something…',
    send: 'Send',
    spectator: 'Spectator',
    empty: 'No messages yet.',
  },
  app: {
    connecting: 'Connecting…',
    language: 'Language',
    gameLog: 'Game log',
    menu: 'Menu',
  },
  table: {
    pickDefence: 'Pick your defence',
    waitingForDefences: 'Everyone picks a defence',
    yourTurn: 'Your turn',
    yourHunterTurn: 'Your hunter turn',
    turnOf: (who: string) => `${who}'s turn`,
    hunterTurnOf: (who: string) => `${who}'s hunter turn`,
    flip: 'Flip the side pot',
    draw: 'Draw a card',
    pickPlayer: 'Pick a player',
    pickAction: (who: string) => `Pick an action for ${who}`,
    yourself: 'yourself',
    choosing: 'Choosing a player',
    lookingAt: (who: string, target: string) => `${who} is looking at ${target}'s game`,
    lookingAtOwn: (who: string) => `${who} is looking at their own game`,
    lookingAtYours: (who: string) => `${who} is looking at your game`,
    winner: (who: string) => `${who} wins`,
    outOfCards: 'No cards left: the game is over',
    attack: 'Attack',
    changeDefence: 'Change defence',
    giveDefence: 'Give a defence',
    munition: 'Munition',
    backToLobby: 'Back to lobby',
    /** Tags next to a name. */
    playing: 'playing',
    yourTurnTag: 'your turn',
    hunter: 'Hunter',
    /** Read by screen readers. */
    drawDeck: 'Draw deck',
    sidePot: 'Side pot',
    drawnCard: 'Drawn card',
    dealtCard: (n: number) => `Face-down card ${n}`,
  },
  menu: {
    preference: 'Damage preference',
    preferenceIntro: 'When you take damage, the game picks which life cards to change. Only you see this choice.',
    preferenceHelp: {
      normal: 'No preference: the replacement card found first.',
      fewestCards: 'Keep as few life cards as possible.',
      lowestMax: 'Keep your highest life card as low as possible.',
    } satisfies Record<DamagePreference, string>,
    howToPlay: 'How to play',
    back: 'Back',
    leave: 'Leave the game',
    leaveConfirm: 'Leave the game? You are eliminated at once, without a hunter turn. You can keep watching.',
    leaveYes: 'Leave',
    cancel: 'Cancel',
    /** A short version of docs/RULES.md. */
    rules: [
      { title: 'Goal', text: 'Be the last player standing. Your life points are the sum of your life cards (A = 1, J = 11, Q = 12, K = 13).' },
      {
        title: 'Setup',
        text: 'You get 4 face-down cards and pick one as your defence, without seeing them. The other 3 are your life cards. The lowest life total starts.',
      },
      {
        title: 'Your turn',
        text: 'Draw a card, pick a player, then an action: Attack another player; give the card as their Defence (the old one is discarded); or give it face-down as a Munition (yourself included, up to the maximum). Nobody sees munitions.',
      },
      {
        title: 'Attacks',
        text: 'An attack is the drawn card plus all your munitions. Below the defence: nothing happens. Equal: the defence is destroyed. Above: the defence is destroyed and the difference is damage. No defence: the whole attack is damage.',
      },
      {
        title: 'Damage',
        text: 'You remove life cards worth at least the damage and get one card back for the difference. Losing your defence or life points also costs you all your munitions.',
      },
      { title: 'Ace defence', text: 'If your defence is an Ace, you see the card you draw before playing it.' },
      {
        title: 'Hunters',
        text: 'Depending on the settings, the first players eliminated play one last turn at once. They cannot give themselves a defence or a munition.',
      },
      { title: 'Empty deck', text: 'When the deck is empty, flip the side pot over: it becomes the new deck.' },
    ],
  },
  ranking: {
    title: 'Ranking',
    place: (n: number) => `${n}${ORDINAL_SUFFIXES[ordinals.select(n)]}`,
  },
  log: {
    title: 'Log',
    left: (who: string) => `${who} left the game`,
    empty: 'Nothing has happened yet.',
    defenceChosen: (who: string) => `${who} chose a defence`,
    gameStarted: (first: string) => `Defences revealed. ${first} starts`,
    turnStarted: (who: string) => `${who}'s turn`,
    hunterTurn: (who: string) => `${who} plays as hunter`,
    deckFlipped: (who: string, count: number) =>
      `${who} flipped the side pot into a new draw deck (${plural('en', count, { one: 'card', other: 'cards' })})`,
    drew: (who: string) => `${who} drew`,
    /** `attack`: "7♥", or "7♥ + 3♠ = 10" with munitions. */
    attacked: (attacker: string, target: string, attack: string, defence: string | null, destroyed: boolean, damage: number) =>
      `${attacker} attacked ${target}: ${attack}` +
      (defence ? `, defence ${defence} ${destroyed ? 'destroyed' : 'holds'}` : '') +
      (damage > 0 ? `, ${damage} damage` : ''),
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
