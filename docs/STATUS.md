# Status

Last updated: 2026-10-23. Update this file whenever a step starts or ends, or a discussion is settled.

## Roadmap

| # | Step | Status |
|---|---|---|
| 1 | Scaffold (TypeScript, Vite, Vitest) | Done |
| 2 | Game engine + tests + random bot + simulations | Done |
| 3 | Server: lobby, "Add bot", filtered views, spectators, reconnection, disconnection timeout, multi-tab dev mode, debug page | Done (2026-10-19) |
| 4 | Visual style discussion with mockups → desktop UI | In progress (4a–4d done, 4e next) |
| 5 | Launch commands: `npm start` (LAN + QR code), online hosting on Fly.io (decided 2026-10-22; tunnel's fate open) | To do. `v0.1.0` = first playable version |
| 6 | Mobile pass | To do |
| 7 | Smarter bots (difficulty levels) | To do |

## Next conversation: start here
1. Step 3 (server): done and tested by the owner. Not tested automatically: the `OutOfCardsError` path
   (too rare to provoke; the room ends the game and shows it).
2. Language switch (EN/FR): done 2026-10-19 (`src/client/i18n/`). Owner trusts the French texts as they are; adjust later if needed.
3. Bots: settled for now (2026-10-22), see `DECISIONS.md` > Bots. They come **after** `v0.1.0`.
4. **Step 4 in progress** (started 2026-10-22): table mockups done over 3 rounds (decisions in `DECISIONS.md` > UI).
   Lobby and end-of-game screens mocked too. Next: step 4 implementation plan, then build the desktop UI.
   Later options: card counts, life totals, goofy card backs (chosen in the lobby), profile pictures.
   To design when building: in-game chat (bottom right), pause / preferences menu (damage preference moves there).
   Step 4 sub-steps (plan approved 2026-10-22): 4a server side (flip, "looking at", chat) **done**; 4b basics (Preact,
   colours, self-hosted fonts, Card piece, texts) **done**; 4c lobby **done**
   **4d table done** (2026-10-23; games are now played on `/`), plus the owner's first feedback: last-action line, attack cards
   shown 4 s, game log panel, bigger table on big screens, chosen defences shown at once.
   Next: 4e chat and Menu (damage preference, still only on `/debug.html`), 4f animations (incl. elimination), 4g end of game.

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
