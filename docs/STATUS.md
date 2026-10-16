# Status

Last updated: 2026-10-16. Update this file whenever a step starts or ends, or a discussion is settled.

## Roadmap

| # | Step | Status |
|---|---|---|
| 1 | Scaffold (TypeScript, Vite, Vitest) | Done |
| 2 | Game engine + tests + random bot + simulations | Done (awaiting commit of the deck/munition settings) |
| 3 | Server: lobby, "Add bot", filtered views, reconnection, multi-tab dev mode | **Next**, after the UX flows discussion |
| 4 | Visual style discussion with mockups → desktop UI | To do |
| 5 | Launch commands: `npm start` (LAN + QR code), `npm run share` (Cloudflare Quick Tunnel) | To do. `v0.1.0` = first playable version |
| 6 | Mobile pass | To do |
| 7 | Smarter bots (difficulty levels) | To do |

## Next conversation: start here
1. **UX flows discussion** (before step 3, because it shapes what the server sends): what a turn looks like on screen,
   picking a target, confirmations, the attack reveal, how the hunter turn and the Ace peek are shown,
   where the damage preference lives, the game log. Owner's layout and style notes are in `DECISIONS.md` > UI.
2. Then plan step 3 (server) and get approval.

## Pending discussions (owner input needed)
- **Default number of decks for 6–7 players**: currently 1. Simulations: with 7 players and one deck, the draw deck + side pot went down to 4 cards (never empty).
- **Max munitions range**: see RULES open questions (safe values only vs 1–10).
- **Lobby settings** to expose: hunter rule (off / first eliminated only / all), number of decks (6–7 players), max munitions (default 5). Anything else?
- **Bots (step 7)**: difficulty levels random, beginner, confirmed, expert, godlike. Owner has requirements: ask before designing.
  Godlike never cheats. Bots have names; faces from photos postponed.
- **Long-term**: bot-vs-bot simulations to find the best moves per game state.

## Useful facts
- Random-bot game length (median number of turns): 3 players 33, 4: 47, 5: 61, 6: 74, 7: 87, 8: 100, 9: 114, 10: 126.
- The engine plays several thousand random games per second (no UI), enough for Monte Carlo bots later.
