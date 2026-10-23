# Status

Last updated: 2026-10-23. Update this file whenever a step starts or ends, or a discussion is settled.

## Roadmap

| # | Step | Status |
|---|---|---|
| 1 | Scaffold (TypeScript, Vite, Vitest) | Done |
| 2 | Game engine + tests + random bot + simulations | Done |
| 3 | Server: lobby, "Add bot", filtered views, spectators, reconnection, disconnection timeout, multi-tab dev mode, debug page | Done (2026-10-19) |
| 4 | Visual style discussion with mockups → desktop UI | In progress (4a–4e done, 4f next) |
| 5 | Launch commands: `npm start` (LAN + QR code), online hosting on Fly.io (decided 2026-10-22; tunnel's fate open) | To do. `v0.1.0` = first playable version |
| 6 | Mobile pass | To do |
| 7 | Smarter bots (difficulty levels) | To do |

## Next conversation: start here
1. Step 3 (server): done and tested by the owner. Not tested automatically: the `OutOfCardsError` path
   (too rare to provoke; the room ends the game and shows it).
2. Language switch (EN/FR): done 2026-10-19 (`src/client/i18n/`). Owner trusts the French texts as they are; adjust later if needed.
3. Bots: settled for now (2026-10-22), see `DECISIONS.md` > Bots. They come **after** `v0.1.0`.
4. **Step 4 in progress** (started 2026-10-22): table mockups done over 3 rounds (decisions in `DECISIONS.md` > UI).
   Lobby and end-of-game screens mocked too.
   Later options: card counts, life totals, goofy card backs (chosen in the lobby), profile pictures.
   Step 4 sub-steps (plan approved 2026-10-22): 4a server side (flip, "looking at", chat) **done**; 4b basics (Preact,
   colours, self-hosted fonts, Card piece, texts) **done**; 4c lobby **done**
   **4d table done** (2026-10-23; games are now played on `/`), plus the owner's first feedback: last-action line, attack cards
   shown on the target, game log panel (actions only), bigger table on big screens, chosen defences shown at once, and the
   attack playback (lands on the defence, 2 s pause, then the life cards change).
   **4e done** (2026-10-23): chat always open with speech bubbles, Menu (damage preference, How to play, Leave the game),
   ranking. Debug page deleted. Next: 4f animations, then 4g end of game: see "Step 4: what's left" below.

## Step 4: what's left (written 2026-10-23, to pick up in a later session)

Everything below is agreed unless marked **open**. Decisions live in `DECISIONS.md` > UI (sections named here), not repeated.

### 4f, animations: no card ever teleports
Decided: `DECISIONS.md` > UI > Animations (every bullet, including "No card ever teleports", "Attack timing",
"Playback", "Elimination", "Changing a defence") and Visual style round 3 (side pot flip).

Every card move to animate, with the event that triggers it (`GameEvent` in `src/engine/state.ts`):

| Event | Flight |
|---|---|
| `drew` | top of the deck → drawn spot, lifted on the active player's side |
| `attacked` | drawn card **and every munition of the attacker** fly together, flip face-up, land tilted on the target's defence |
| (attack, +2 s) `damaged` | removed life cards → side pot; replacement card(s) ← side pot or deck (the replacement animation, may be longer) |
| `munitionsLost`, destroyed defence | → side pot, after the attack cards leave the target |
| attack cards | → side pot when they leave the target (they are kept out of it until then, already done in `playback.ts`) |
| `munitionGiven` | drawn card flies face-down onto the target's munition stack |
| `shieldPlaced` | drawn card flips face-up onto the defence spot; the replaced defence → side pot |
| `eliminated` (also after `timedOut`, `left`) | all their cards → side pot, short death animation, then the other seats slide to their new places |
| `deckFlipped` | the side pot flips over and slides to the deck spot |
| `gameStarted` / setup | the deal: 4 face-down cards to each player, clockwise |
| `hunterTurn` | nothing flies; the hunter stays seated (already done) |

Technical approach to discuss and approve first (the main design choice of 4f):
- **How a flight finds its start and end on screen.** Recommended: the [FLIP technique](https://aerotwist.com/blog/flip-your-animations/)
  (measure the card's place before and after with `getBoundingClientRect`, then animate the difference), with flying copies
  in an overlay layer above the table while the real spots stay hidden. Seats are rotated, so measuring the DOM is simpler
  than recomputing positions from `layout.ts`. Face-up cards can be tracked by `cardKey` (unique even with two decks);
  face-down ones (deck, munitions, the hidden drawn card) need made-up keys such as "B's 2nd munition".
  **Approved 2026-10-23**, with the [Web Animations API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API)
  (`DECISIONS.md` > UI > Animations > How cards fly).
- **Replacement source**: `damaged` gives the life cards before and after, not where the new card came from. The client
  can tell: if it was in the side pot shown before, it came from there, otherwise from the bottom of the deck (RULES 6.1).
- **Timings grow**: each move now has a playback length, not only attacks. Replace `ATTACK_PLAYBACK_MS` with a shared
  function (events → milliseconds) in `src/shared/timing.ts`, used by `playback.ts` and by the server's bot pacing
  (`#scheduleBot` in `room.ts`), so screens never fall behind the bots.
- **Seats sliding** after an elimination: a CSS transition on each seat's `left`, `top` and `transform` may be enough.
- Respect [`prefers-reduced-motion`](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion):
  shorter or simpler motion, same order.
- **Open: the death animation** ("small", owner). Show 2–3 ideas (mockup or quick prototype) before building.
- Testing: playback frames stay pure and unit-tested (`playback.test.ts`); motion is checked by eye. A headless Chrome
  screenshot script was used in this session (scratchpad, not in the repo); a dev page that replays a sample game
  without the server could help, like `gallery.html`.

### 4g, end of game
Decided: `DECISIONS.md` > UI > "Lobby and end of game, mockup" (modal over the table, winner, final ranking, fun
statistics from the public log, Play again and Quit, "You left the table" screen). Today a finished game only shows
"X wins" in the centre text and a host-only "Back to lobby" (`Centre.tsx`).
- The modal opens once the playback has shown the last move (after the final attack and elimination).
- Statistics, all from the public log: biggest hit, most munitions given, defence that stopped the most attacks,
  most attacked, fastest exit (= fewest turns played, owner 2026-10-23). A defence is followed by its `cardKey` while it
  stays in place. Pure function + tests.
- **Play again** (owner, 2026-10-23): anyone can press it; it takes only that player back to the lobby, the others keep
  the modal; the host stays the host. The server's `backToLobby` is host-only today: to rework.
- Quit after the game: frees the seat and shows "You left the table". New server handling (`leave` only works in the
  lobby today; `leaveGame` refuses a finished game).
- No winner (out of cards): same modal, "No cards left".
- Spectators: the modal without Play again.
- Then step 4 is done: update the roadmap, then step 5 (`npm start` on LAN, Fly.io, `v0.1.0`).

### Loose ends from this session
- Done: on a big screen, the top bar and the Game log / Menu panels scale like the table (owner, 2026-10-23).
- How to play texts: fine for now (owner, 2026-10-23).
- Not seen yet on screen: other players' defences appearing during the defence choice, and a player knocked out by an
  attack staying seated until the attack ends. Check in the next real game.
- While open, the Game log and Menu panels cover the top-right player's cards.

## Pending discussions (owner input needed)
- **Lobby settings**: settled (2026-10-19), nothing more than hunters, number of decks and max munitions.
- **Bots (step 7)**: levels scaled like Stockfish, by rating (about 800 / 1200 / 1600 / 2000 Elo). Godlike never cheats.
  Bots have names; faces from photos postponed. Details to discuss again at step 7.
- **Accounts** (owner, 2026-10-22): email + password, official pseudo, future leaderboards. Design and timing to discuss (`DECISIONS.md` > Accounts).
  Settled 2026-10-23: SQLite for the database; Resend (emails) and Simple Analytics soon after `v0.1.0`; a "What's new" modal after each feature release.
- **Long-term**: bot-vs-bot simulations, machine learning and deep learning to find the best moves per game state,
  especially in the endgame (owner, 2026-10-19).

## Useful facts
- Random-bot game length (median number of turns): 3 players 33, 4: 47, 5: 61, 6: 74, 7: 87, 8: 100, 9: 114, 10: 126.
- The engine plays several thousand random games per second (no UI), enough for Monte Carlo bots later.
