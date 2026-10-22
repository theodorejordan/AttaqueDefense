# Decisions

Log of technical and design decisions. Newest entries at the bottom of each section.
Rule clarifications go in `RULES.md`, not here.

## Context

- Multiplayer card game designed by the repo owner. Rules: see `RULES.md`.
- 3 to 10 players, each on their own device (phone or computer).
- No shared "table" screen: every device shows the player's own hand and the public game state.

## Architecture (2026-10-16)

- **Server-authoritative**: a Node.js server holds the real game state and validates every move.
  Clients only send intentions ("play this card") and render what the server sends.
- **Hidden information**: the server sends each player a filtered view (their own hand, public info only).
  The full state never reaches a browser.
- **Stack**: Node.js + [Socket.IO](https://socket.io/docs/v4/) for real-time communication,
  [Vite](https://vite.dev/guide/) + TypeScript for the frontend. No UI framework at first; React may be added if the UI grows.
- **Reconnection**: each player gets a token stored in `localStorage`. The server keeps their seat
  for a while after a disconnect (phones lock, tabs get suspended).

- **One game at a time per server** (2026-10-16): whoever opens the link joins the single lobby. No room codes.
- **Pure game engine** (2026-10-16): the rules live in `src/engine/` as pure functions (state + action → new state),
  with no network or UI code, tested with [Vitest](https://vitest.dev/guide/). The server only routes messages and filters views.
- **Bots** (2026-10-16): a bot is a seat controlled by the server, which picks among the legal actions using the same
  filtered view as a human. Random bot first (also used for automated game simulations), heuristic bot later.
  The owner has requirements for bots: discuss them before implementing.
  - Long-term goal: run bot-vs-bot simulations to find the best moves depending on the game state
    ([Monte Carlo](https://en.wikipedia.org/wiki/Monte_Carlo_method)). The engine must stay fast, headless and reproducible (seeded RNG).
  - Difficulty levels: random, beginner, confirmed, expert, godlike. All bots share one interface
    (filtered view in → action out), so levels plug in without engine changes.
    **No bot ever cheats**: "godlike" is just very strong, using only its filtered view.
  - Bots have names. Faces from photos: postponed (privacy in a public repo, weight on mobile data).
  - **Monte Carlo before machine learning** (2026-10-19, owner): first a Monte Carlo bot with determinization
    ([ISMCTS](https://ieeexplore.ieee.org/document/6203567)): for each move, sample hidden-card layouts consistent with
    what the bot knows, play them out, keep the best win rate. It is the baseline any learned bot must beat, it produces
    training data (state → win rate per move), and it can power an endgame analyzer. Deep learning comes after.
    Not now: later, with roadmap step 7. A bot's knowledge = its view + the public log + its own memories (e.g. an Ace peek).
  - **Levels scaled by rating** (2026-10-22, owner): like [Stockfish](https://stockfishchess.org/)'s strength levels in chess,
    each level should feel like a rating step, roughly 800 / 1200 / 1600 / 2000 Elo (beginner / confirmed / expert / godlike).
    Strength can be tuned with the number of Monte Carlo simulations per move and some deliberate mistakes; ratings measured
    with bot-vs-bot tournaments (a multiplayer rating system, since games have 3 to 10 players). Details at step 7.
  - **Timing** (2026-10-22, owner): smarter bots come **after** `v0.1.0`, not urgent.
  - **Owner background** (2026-10-22): no ML or Python yet, keen to learn through this project. Explain from the basics.
- **Turn in two engine steps** (2026-10-16): `draw`, then `play(action, target)`. The drawn card stays pending in between
  (also covers a disconnect mid-turn). Matches the owner's UI flow: card shown beside the deck → choose action → choose player.
  Changed 2026-10-19: the UI now asks for the player first, then the action (see UI > Turn flow). No engine change: `play` gets both at once.

## Lobby and server (2026-10-19)

- **Host**: the first connected human, in joining order. They change the settings, add and remove bots, start the game,
  and send everyone back to the lobby after a game. If the host leaves or disconnects, the next connected human becomes host
  (and the original host gets the role back on reconnection), so the host is always someone present.
- **Lobby**: shows every seat (humans and bots). Anyone can join while the lobby is open, up to 10 seats.
  A human disconnected from the lobby for 1 minute loses their seat, so a closed tab never blocks the start.
- **Spectators**: someone who opens the link during a game watches it, with public information only (RULES 9).
  They can take a seat once everyone is back in the lobby.
- **After a game**: everyone goes back to the lobby with the same seats and bots, ready for a rematch.
- **Future**: a main page where players create a lobby; the settings will move there. This will replace "one game at a time per server".
- **Messages** ([Socket.IO](https://socket.io/docs/v4/)): each client request gets an
  [acknowledgement](https://socket.io/docs/v4/emitting-events/#acknowledgements) (ok or error message).
  After each change, every client gets its full view (small) plus the new public events. The full event log is sent on (re)connection only.
- **Reconnection token**: random UUID given on joining. Stored in `localStorage`, or `sessionStorage` in dev mode
  so each browser tab is a separate player.
- **Dev mode**: the server runs Vite in [middleware mode](https://vite.dev/guide/ssr#setting-up-the-dev-server):
  one command, one port, same URL as in production.
- **Step 3 client**: a throwaway debug page (raw buttons, state as text). The real UI comes in step 4.
- **Bot pacing**: one bot move at a time, 1.5 s apart, 4 s after an attack so humans can follow the animation.
  Bot names come from a fixed list in `src/server/room.ts` (owner can change it).
- **Deck count in the lobby**: if the host picked 2 decks and players leave so that 2 is no longer allowed (RULES 2),
  the default is used and shown.

## Access / networking (2026-10-16)

Two use cases, two commands:

| Use case | Command | How players join |
|---|---|---|
| Same room, everyone on the host's Wi-Fi | `npm start` | Local URL `http://<host-LAN-IP>:3000` + QR code |
| Different places / mobile data | `npm run share` | Public `https://…trycloudflare.com` URL + QR code |

- Tunnel: [Cloudflare Quick Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/do-more-with-tunnels/trycloudflare/)
  (`cloudflared`). Chosen because it requires **no account and no card**: the owner wants a solution that can never bill them.
- The tunnel is external to the code: it only forwards traffic to `localhost:3000`. It can be swapped for another tunnel without changing the game.
- Known limits: the URL changes on every launch; no uptime guarantee.
- Alternatives considered: localtunnel (unreliable, password interstitial), bore (no HTTPS),
  localhost.run (commercial), router port forwarding (exposes home IP), paid/freemium hosting (rejected: risk of billing).
- Host setup: macOS firewall must allow incoming connections on first launch; guest Wi-Fi networks with client isolation block LAN mode.
- **Online hosting on [Fly.io](https://fly.io/docs/)** (2026-10-22, owner): friends from work use it. This changes the
  "never billed" stance above: Fly has no free tier for new accounts, so a card is on file. Accepted budget: about 1–2 € per month.
  - **Exactly one machine**: the game lives in the server's memory, so a second machine would host a different game.
  - **[Autostop/autostart](https://fly.io/docs/launch/autostop-autostart/)** (`auto_stop_machines = "stop"`,
    `min_machines_running = 0`): the machine stops when nobody is connected (no CPU/RAM billed, only a little storage)
    and starts on the next visit (a few seconds' wait). A stop or a redeploy ends the game in memory, which is fine when nobody is on.
  - No dedicated IPv4 (paid extra). No hard spending cap is confirmed: check Fly's billing settings for alerts or limits.
  - Open: whether Fly replaces the Cloudflare tunnel (`npm run share`) in roadmap step 5.

## UI (2026-10-16)

- Must work on both desktop and phone browsers.
- **Desktop first**, then a mobile pass. Use flexible layouts (flexbox/grid, relative units) from the start so the mobile pass is an adjustment, not a rewrite.
- Keep downloads light (players may be on mobile data): prefer CSS/SVG cards or small compressed images.
- Visual style: to be discussed with mockups before building the desktop UI (roadmap step 4).
  Owner's input so far (2026-10-16):
  - **Minimalist cards**. References:
    [Iota playing cards](https://www.creativebloq.com/graphic-design/iota-playing-cards-get-minimalist-makeover-5132595),
    [Contours playing cards](https://www.maxplayingcards.com/en/2016/09/11/contours-playing-cards-a-double-line-that-hides-many-secrets/),
    [UNO Minimalista](https://www.inverse.com/input/design/uno's-had-a-minimalist-design-overhaul-google-will-love-minimalista-games).
  - Color as meaning: maybe **red for attack**, **blue for defence**.
  - **Layout** (desktop and mobile): each player sees **their own cards in front of them** (bottom of the screen),
    the **side pot and draw deck in the middle**, and the **other players around the middle in playing order**.
    No table drawn: just names with their cards.
- **Turn flow** (2026-10-19):
  1. Click the draw deck to draw. The card appears beside the deck: face-down for everyone, face-up only for the
     active player if their defence is an Ace (RULES 5.4). No text announces the peek.
  2. Click a player's area (cards + name) to select them. Not final: click elsewhere or press Esc to change.
  3. Three buttons in the middle: "Attack", "Change defence" (or "Give a defence" if the player has none), "Munition".
     They do not repeat the player's name: the centre text already says "Pick an action for B" (owner, 2026-10-22).
     Actions that are illegal on that player are disabled; players themselves are never greyed out.
     Clicking a button sends the move. No confirmation step: selecting the player is the safety net.
  - The buttons never cover a player's area: other players' cards must stay visible.
- **Animations** (2026-10-19): sober, plain CSS ([3D transforms](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_transforms/Using_CSS_transforms)), no library.
  - Attack: the attack cards flip in the air and land on the target (mostly on the defence), then stay 3–4 s while life points update.
  - Defence: the card flips face-up onto the target's defence spot. Munition: it slides face-down onto the target's munition stack.
  - **The wait is client-side**: the server applies moves at once and sends events; each device plays them in order
    and keeps its deck disabled until its own animations end.
- **Main info text** (2026-10-19): in the middle, above the deck: whose turn it is, hunter turns, who hit whom.
- **Game log** (2026-10-19): every player can open it on their device at any time. The server keeps the event history
  and sends it to a player who reconnects.
- **Damage preference** (2026-10-19): bottom right for now, placement to be revisited.
- **Vocabulary** (2026-10-19): players always see **Defence** (never "shield", which is only a code name).
  English spelling "Defence". Button for a target who already has one: "Change defence"; otherwise "Give a defence".
- **Languages** (2026-10-19): English and French.
  - Small dictionary of our own (`en.ts`, `fr.ts`, a `t(key)` function), no library: little text, light download.
    TypeScript checks that both languages have every key. Plurals with [`Intl.PluralRules`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/PluralRules).
  - Each device picks its language: browser language first ([`navigator.language`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language)), then an EN/FR switch, remembered.
  - The server never sends text: errors are codes, events are data. Each client translates.
  - French face cards: **R, D, V** (Roi, Dame, Valet) instead of K, Q, J.
  - Done early, at the owner's request (2026-10-19): `src/client/i18n/`, used by the debug page with an EN | FR switch. The real UI (step 4) reuses it.
  - French terms (confirmed by the owner 2026-10-19): Attaque, Défense, Munition, points de vie / cartes de vie,
    Pioche (draw deck), Défausse (side pot), Chasseur (hunter), "Changer la défense" / "Donner une défense".

- **Visual style, mockup round 1** (2026-10-22, owner):
  - **Outline cards** (double-line contour, like the Contours deck), but **classic**: pips laid out as on real cards
    (10 of spades = ten spades), drawn court figures for J, Q, K, corner indices.
  - **Defence in front of the 3 life cards**, overlapping them.
  - **Munitions as big as life cards**, placed beside them (placement confirmed).
  - **Drawn card highlighted**, floating above the deck and the side pot (3D).
  - **Side pot**: the last 3 cards slightly visible on the sides, under the top one.
  - **No card counts** on the draw deck and side pot, and **no life-point totals** next to names. Both may come back later as options.
  - **Card backs**: choice of several designs in the lobby, preferably goofy and funny. Later.
  - **Profile pictures** on the board for each player. Approach to discuss (upload, size, privacy).
- **Visual style, mockup round 2** (2026-10-22, owner). Replaces round 1 where they differ:
  - Cards: **modern and abstract**, outlined (outlined suit pips, abstract geometric court cards, no drawn figures).
  - **Classic red and black suits**. Red no longer means attack; action buttons are plain outlined buttons in a sober modern font.
  - **Every player's cards face the centre of the table**, as at a real table (the player opposite is upside down for us;
    the double corner indices keep values readable).
  - **Defence on the centre side of the life cards**, overlapping them, shielding them from the other players (for us: above our cards).
    The defence is the **same card simply turned 90°**: no special design or colour for it.
  - A player's cards are **centred on their seat**. With munitions, life cards + munition stack are centred together
    (the life cards shift a little to make room). Munitions always sit right next to the last life card, whatever the number of life cards.
  - **Flat top-down view**: the tilted camera was tried and dropped. No table shape drawn.
  - **Deck and side pot side by side**. The drawn card lifts up, highlighted, partly over them on the active player's side
    (below them on our screen); deck and side pot stay as they are.
  - **Fewer players = bigger cards**: eliminated players leave the table, the others close in and their cards grow.
    The deck, side pot and drawn card keep their full size whatever the number of players: only the players' cards scale.
  - Usual games: 4 to 8 players (10 is rare). Design for 4–6 first.
- **Visual style, mockup round 3** (2026-10-22, owner):
  - **"Looking at" is public** (RULES 10): the picked player gets the selection outline on every screen and the centre text
    says "Theo is looking at Chloé's game". A small client request to the server (checked: your turn, card drawn), broadcast
    to all; room state, not engine state; not in the game log. Bots look at their target briefly before acting.
  - **In-game chat**, bottom right. Details (spectators, bots, length limits) to discuss when we build it.
  - **Damage preference** moves out of the table into a pause / preferences menu.
  - **Chat mockup**: a bar bottom right (Chat toggle, message field, Send). New messages show as a short speech bubble
    next to the sender's name at the table; the Chat toggle opens the history above the bar. A "Menu" button (top right) holds preferences.
  - **Seats about the same distance from the centre**: players on the far left and right come closer instead of sitting at the
    screen edge. A perfect circle does not fit (the screen is wider than tall and the centre needs room for the deck, side pot
    and action buttons), so the table is a slightly wide oval.
  - **Card size by number of players at the table**: about 100 px wide at 3–4, 80 at 5, 66 at 6, 56 at 7–8, 50 at 9–10.
  - **Chat rules** (owner): players **and spectators** can write; **bots never chat**. Messages up to **300 characters**.
    A speech bubble stays **5 s**, in a larger font than the rest of the table text.
  - **Another player's turn** (mockup): centre text "Chloé's turn · Choosing a player", then
    "Chloé's turn · Chloé is looking at Malik's game" with the outline on Malik. Their drawn card lifts on their side of the
    deck and side pot, turned towards them. A small "playing" tag sits next to the active player's name. No action buttons.
  - **Thin card typography** (owner): light corner numbers, smaller suit symbols, fine lines on court cards.
  - **Two outlines** (owner): a **grey** outline around the player whose turn it is, a **black** outline around the player
    being looked at (black wins when they are the same player).
  - **Flipping the side pot** (owner, 2026-10-22, RULES 7): when the deck is empty, the player whose turn it is clicks the
    side pot to flip it ("Your turn · Flip the side pot"); the stack flips over and slides to the deck spot; then they click
    the deck to draw as usual. Chosen over a single click (flip + draw together) because it is a fun table moment.
    Code impact (step 4): new engine command (e.g. `flip`), legal only for the player who must draw, before drawing, with an
    empty deck; `draw` then refuses an empty deck. Bots and the 1-minute disconnection wait cover it like any other action.
  - Suit symbols **filled** (black or red); the abstract court patterns stay outlined.
  - Player names stay **upright** (readable) while their cards face the centre. Room next to the name may hold the profile picture later.
  - **Ranking** (bottom left): one empty slot per player from 1st to last, filled from the bottom each time a player is eliminated.
  - **No player preselected** after drawing. The centre text guides the turn: "Your turn · Pick a player", then
    "Pick an action for B". The three action buttons appear only once a player is picked.

## Repository and versioning (2026-10-16)

- Public GitHub repo `AttaqueDefense` (GitHub names cannot contain "é"); display name **AttaqueDéfense**.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/).
- Tags: [SemVer](https://semver.org/). While in `0.x`: a new feature bumps the minor version (`v0.1.0` → `v0.2.0`),
  a fix bumps the patch version (`v0.2.0` → `v0.2.1`).
- `v0.1.0` = first playable version (proposed: end of roadmap step 5).
