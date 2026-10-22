// French texts, same keys as `en.ts` (checked by TypeScript).
// Vocabulary confirmed by the owner: docs/DECISIONS.md > UI > Languages. Face cards: R, D, V.
import type { Rank, Suit } from '../../engine/cards.ts';
import { MAX_PLAYERS, MIN_PLAYERS } from '../../engine/setup.ts';
import { MAX_CHAT_LENGTH, MAX_NAME_LENGTH } from '../../shared/protocol.ts';
import type { Messages } from './en.ts';
import { plural } from './plural.ts';

const rankNames: Record<Rank, string> = {
  A: 'As', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
  '8': '8', '9': '9', '10': '10', J: 'Valet', Q: 'Dame', K: 'Roi',
};

const suitNames: Record<Suit, string> = { hearts: 'cœur', diamonds: 'carreau', clubs: 'trèfle', spades: 'pique' };

export const fr: Messages = {
  title: 'AttaqueDéfense (debug)',
  nobody: 'personne',
  ranks: {
    A: 'A', '2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7',
    '8': '8', '9': '9', '10': '10', J: 'V', Q: 'D', K: 'R',
  },
  cards: {
    name: (rank, suit) => `${rankNames[rank]} de ${suitNames[suit]}`,
    faceDown: 'Carte face cachée',
  },
  preferences: {
    normal: 'Normale',
    fewestCards: 'Moins de cartes',
    lowestMax: 'Plus petit maximum',
  },
  errors: {
    invalidRequest: 'Requête invalide',
    invalidName: `Le nom doit faire entre 1 et ${MAX_NAME_LENGTH} caractères`,
    nameTaken: 'Ce nom est déjà pris',
    gameFull: 'La partie est complète',
    alreadySeated: 'Tu as déjà une place',
    notSeated: "Rejoins d'abord la partie",
    notHost: "Seul l'hôte peut faire ça",
    notEnoughPlayers: `Il faut entre ${MIN_PLAYERS} et ${MAX_PLAYERS} joueurs`,
    invalidSettings: 'Réglages invalides',
    unknownBot: 'Bot inconnu',
    gameInProgress: 'Une partie est en cours : tu pourras rejoindre à la fin',
    noGame: 'Aucune partie en cours',
    gameNotOver: "La partie n'est pas terminée",
    gameOver: 'La partie est terminée',
    illegalMove: "Ce coup n'est pas autorisé",
    invalidMessage: `Un message fait entre 1 et ${MAX_CHAT_LENGTH} caractères`,
    chatTooFast: 'Tu envoies des messages trop vite',
    serverError: 'Erreur du serveur',
  },
  lobby: {
    title: 'Salon',
    bot: 'bot',
    host: 'hôte',
    away: 'absent',
    you: 'toi',
    remove: 'Retirer',
    namePlaceholder: 'Ton nom',
    join: 'Rejoindre',
    leave: 'Quitter',
    hunters: 'Chasseurs',
    decks: 'Paquets',
    maxMunitions: 'Munitions max',
    addBot: 'Ajouter un bot',
    start: 'Lancer la partie',
    summary: (s) => `Chasseurs ${s.hunters}, paquets ${s.deckCount}, munitions max ${s.maxMunitions}`,
  },
  game: {
    title: 'Partie',
    spectating: 'Partie (spectateur)',
    outOfCards: 'Plus de cartes : la partie est terminée.',
    over: (winner) => `Partie terminée. Gagnant : ${winner}`,
    choosing: 'Chacun choisit sa défense, à l’aveugle.',
    turn: (who, isHunter, hasDrawn) =>
      `Au tour de ${who}${isHunter ? ' (chasseur)' : ''}${hasDrawn ? ', carte piochée' : ''}`,
    player: 'Joueur',
    life: 'Vie',
    defence: 'Défense',
    munitions: 'Munitions',
    you: '(toi)',
    ready: 'prêt',
    choosingShort: 'choisit…',
    select: 'Choisir',
    selected: 'Choisi',
    pickDefence: 'Choisis ta défense : ',
    card: (n) => `Carte ${n}`,
    flip: 'Retourner la défausse',
    draw: 'Piocher',
    drawn: (card) =>
      `Carte piochée : ${card ? `${card} (vue grâce à l’As)` : 'face cachée'}. Choisis un joueur, puis : `,
    attack: (who) => `Attaquer ${who}`,
    changeDefence: (who) => `Changer la défense de ${who}`,
    giveDefence: (who) => `Donner une défense à ${who}`,
    munition: (who) => `Munition à ${who}`,
    preference: 'Préférence de dégâts : ',
    backToLobby: 'Retour au salon',
    piles: (drawDeck, sidePot) =>
      `Pioche : ${plural('fr', drawDeck, { one: 'carte', other: 'cartes' })}. Défausse (dessus en premier) : ${sidePot}`,
  },
  log: {
    title: 'Historique',
    defenceChosen: (who) => `${who} a choisi sa défense`,
    gameStarted: (first) => `Défenses révélées. ${first} commence`,
    turnStarted: (who) => `Au tour de ${who}`,
    hunterTurn: (who) => `${who} joue en chasseur`,
    deckFlipped: (count) =>
      `La défausse est retournée et devient la pioche (${plural('fr', count, { one: 'carte', other: 'cartes' })})`,
    drew: (who) => `${who} a pioché`,
    attacked: (attacker, target, cards, total, defence, destroyed, damage) =>
      `${attacker} a attaqué ${target} avec ${cards} = ${total}` +
      (defence ? `, défense ${defence} ${destroyed ? 'détruite' : 'tient'}` : '') +
      `, ${plural('fr', damage, { one: 'dégât', other: 'dégâts' })}`,
    damaged: (who, damage, before, after) => `${who} perd ${damage} : ${before} → ${after}`,
    munitionsLost: (who, cards) => `${who} a perdu ses munitions : ${cards}`,
    eliminated: (who) => `${who} est éliminé`,
    timedOut: (who) => `${who} est resté absent trop longtemps`,
    defencePlaced: (by, target, card, replaced) =>
      `${by} a donné une défense ${card} à ${target}${replaced ? ` (à la place de ${replaced})` : ''}`,
    munitionGiven: (by, target) => `${by} a donné une munition à ${target}`,
  },
};
