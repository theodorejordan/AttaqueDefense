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
    maxMunitions: 'Munitions max par joueur',
    addBot: 'Ajouter un bot',
    start: 'Lancer la partie',
    players: 'Joueurs',
    seats: (count) => `${count} / ${MAX_PLAYERS} places`,
    spectators: (count) =>
      count === 0
        ? 'Aucun spectateur'
        : `${plural('fr', count, { one: 'spectateur', other: 'spectateurs' })} ${count > 1 ? 'regardent' : 'regarde'}`,
    settings: 'Réglages de la partie',
    hunterOptions: ['Désactivé', 'Premier éliminé', 'Deux premiers', 'Trois premiers'],
    huntersHelp: 'Les premiers éliminés jouent un dernier tour.',
    deckOption: (count) => plural('fr', count, { one: 'paquet', other: 'paquets' }),
    decksHelp: 'Deux paquets possibles dès 6 joueurs, obligatoires dès 9.',
    fewerMunitions: 'Moins de munitions',
    moreMunitions: 'Plus de munitions',
    youAreHost: 'Tu es l’hôte : lance la partie quand tout le monde est là.',
    waitingFor: (host) => `En attente de ${host} pour lancer la partie.`,
    takeASeat: 'Choisis un nom et rejoins la partie pour jouer.',
  },
  chat: {
    title: 'Chat',
    placeholder: 'Écris quelque chose…',
    send: 'Envoyer',
    spectator: 'Spectateur',
    empty: 'Aucun message pour le moment.',
  },
  app: {
    connecting: 'Connexion…',
    language: 'Langue',
    gameLog: 'Historique',
    menu: 'Menu',
  },
  table: {
    pickDefence: 'Choisis ta défense',
    waitingForDefences: 'Chacun choisit sa défense',
    yourTurn: 'À toi de jouer',
    yourHunterTurn: 'Tu joues en chasseur',
    turnOf: (who) => `Au tour de ${who}`,
    hunterTurnOf: (who) => `${who} joue en chasseur`,
    flip: 'Retourne la défausse',
    draw: 'Pioche une carte',
    pickPlayer: 'Choisis un joueur',
    pickAction: (who) => `Choisis une action pour ${who}`,
    yourself: 'toi',
    choosing: 'Choisit un joueur',
    lookingAt: (who, target) => `${who} regarde le jeu de ${target}`,
    lookingAtOwn: (who) => `${who} regarde son propre jeu`,
    lookingAtYours: (who) => `${who} regarde ton jeu`,
    winner: (who) => `${who} gagne`,
    outOfCards: 'Plus de cartes : la partie est terminée',
    attack: 'Attaque',
    changeDefence: 'Changer la défense',
    giveDefence: 'Donner une défense',
    munition: 'Munition',
    backToLobby: 'Retour au salon',
    playing: 'joue',
    yourTurnTag: 'à toi',
    hunter: 'Chasseur',
    drawDeck: 'Pioche',
    sidePot: 'Défausse',
    drawnCard: 'Carte piochée',
    dealtCard: (n) => `Carte face cachée ${n}`,
  },
  menu: {
    preference: 'Préférence de dégâts',
    preferenceIntro: 'Quand tu prends des dégâts, le jeu choisit les cartes de vie à changer. Toi seul vois ce choix.',
    preferenceHelp: {
      normal: 'Aucune préférence : la carte de remplacement trouvée en premier.',
      fewestCards: 'Garder le moins de cartes de vie possible.',
      lowestMax: 'Garder ta plus haute carte de vie la plus basse possible.',
    },
    howToPlay: 'Comment jouer',
    back: 'Retour',
    leave: 'Quitter la partie',
    leaveConfirm: 'Quitter la partie ? Tu es éliminé tout de suite, sans tour de chasseur. Tu peux continuer à regarder.',
    leaveYes: 'Quitter',
    cancel: 'Annuler',
    rules: [
      { title: 'But', text: 'Être le dernier joueur en jeu. Tes points de vie sont la somme de tes cartes de vie (As = 1, V = 11, D = 12, R = 13).' },
      {
        title: 'Mise en place',
        text: 'Tu reçois 4 cartes face cachée et tu en choisis une comme défense, sans les voir. Les 3 autres sont tes cartes de vie. Le plus petit total de vie commence.',
      },
      {
        title: 'Ton tour',
        text: 'Pioche une carte, choisis un joueur, puis une action : Attaquer un autre joueur ; lui donner la carte comme Défense (l’ancienne va à la défausse) ; ou la lui donner face cachée comme Munition (toi compris, jusqu’au maximum). Personne ne voit les munitions.',
      },
      {
        title: 'Attaques',
        text: 'Une attaque, c’est la carte piochée plus toutes tes munitions. En dessous de la défense : rien ne se passe. Égale : la défense est détruite. Au-dessus : la défense est détruite et la différence fait des dégâts. Sans défense : toute l’attaque fait des dégâts.',
      },
      {
        title: 'Dégâts',
        text: 'Tu retires des cartes de vie valant au moins les dégâts et tu récupères une carte pour la différence. Perdre ta défense ou des points de vie te fait aussi perdre toutes tes munitions.',
      },
      { title: 'Défense As', text: 'Si ta défense est un As, tu vois la carte que tu pioches avant de la jouer.' },
      {
        title: 'Chasseurs',
        text: 'Selon les réglages, les premiers éliminés jouent tout de suite un dernier tour. Ils ne peuvent pas se donner de défense ni de munition.',
      },
      { title: 'Pioche vide', text: 'Quand la pioche est vide, retourne la défausse : elle devient la nouvelle pioche.' },
    ],
  },
  ranking: {
    title: 'Classement',
    place: (n) => (n === 1 ? '1er' : `${n}e`),
  },
  log: {
    title: 'Historique',
    left: (who) => `${who} a quitté la partie`,
    empty: 'Rien ne s’est encore passé.',
    defenceChosen: (who) => `${who} a choisi sa défense`,
    gameStarted: (first) => `Défenses révélées. ${first} commence`,
    turnStarted: (who) => `Au tour de ${who}`,
    hunterTurn: (who) => `${who} joue en chasseur`,
    deckFlipped: (who, count) =>
      `${who} a retourné la défausse, qui devient la pioche (${plural('fr', count, { one: 'carte', other: 'cartes' })})`,
    drew: (who) => `${who} a pioché`,
    attacked: (attacker, target, attack, defence, destroyed, damage) =>
      `${attacker} a attaqué ${target} : ${attack}` +
      (defence ? `, défense ${defence} ${destroyed ? 'détruite' : 'tient'}` : '') +
      (damage > 0 ? `, ${plural('fr', damage, { one: 'dégât', other: 'dégâts' })}` : ''),
    damaged: (who, damage, before, after) => `${who} perd ${damage} : ${before} → ${after}`,
    munitionsLost: (who, cards) => `${who} a perdu ses munitions : ${cards}`,
    eliminated: (who) => `${who} est éliminé`,
    timedOut: (who) => `${who} est resté absent trop longtemps`,
    defencePlaced: (by, target, card, replaced) =>
      `${by} a donné une défense ${card} à ${target}${replaced ? ` (à la place de ${replaced})` : ''}`,
    munitionGiven: (by, target) => `${by} a donné une munition à ${target}`,
  },
};
