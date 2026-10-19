# Status

Last updated: 2026-10-19. Update this file whenever a step starts or ends, or a discussion is settled.

## Roadmap

| # | Step | Status |
|---|---|---|
| 1 | Scaffold (TypeScript, Vite, Vitest) | Done |
| 2 | Game engine + tests + random bot + simulations | Done |
| 3 | Server: lobby, "Add bot", filtered views, spectators, reconnection, disconnection timeout, multi-tab dev mode, debug page | Done (2026-10-19) |
| 4 | Visual style discussion with mockups → desktop UI | To do |
| 5 | Launch commands: `npm start` (LAN + QR code), `npm run share` (Cloudflare Quick Tunnel) | To do. `v0.1.0` = first playable version |
| 6 | Mobile pass | To do |
| 7 | Smarter bots (difficulty levels) | To do |

## Next conversation: start here
1. UX flows discussion: **done** (2026-10-19), recorded in `DECISIONS.md` > UI and RULES section 10 (disconnections).
2. Step 3 (server): done and tested by the owner. Not tested automatically: the `OutOfCardsError` path
   (too rare to provoke; the room ends the game and shows it).
3. Language switch (EN/FR): done 2026-10-19 (`src/client/i18n/`). Owner to reread the French texts in `fr.ts`.
4. Bots: the current ones are random (test tool). Decided: Monte Carlo bot first, ML later (`DECISIONS.md` > Bots), not now.
   Still unanswered: owner's bot requirements per level, owner's ML/Python background, and whether bots come before v0.1.0.
5. Then step 4: visual style discussion with mockups.

## Pending discussions (owner input needed)
- **Lobby settings**: settled (2026-10-19), nothing more than hunters, number of decks and max munitions.
- **Bots (step 7)**: difficulty levels random, beginner, confirmed, expert, godlike. Owner has requirements: ask before designing.
  Godlike never cheats. Bots have names; faces from photos postponed.
- **Long-term**: bot-vs-bot simulations, machine learning and deep learning to find the best moves per game state,
  especially in the endgame (owner, 2026-10-19).

## Useful facts
- Random-bot game length (median number of turns): 3 players 33, 4: 47, 5: 61, 6: 74, 7: 87, 8: 100, 9: 114, 10: 126.
- The engine plays several thousand random games per second (no UI), enough for Monte Carlo bots later.
