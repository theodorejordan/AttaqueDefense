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
- **Turn in two engine steps** (2026-10-16): `draw`, then `play(action, target)`. The drawn card stays pending in between
  (also covers a disconnect mid-turn). Matches the owner's UI flow: card shown beside the deck → choose action → choose player.

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
  - Color as meaning: maybe **red for attack**, **blue for shield**.
  - **Layout** (desktop and mobile): each player sees **their own cards in front of them** (bottom of the screen),
    the **side pot and draw deck in the middle**, and the **other players around the middle in playing order**.
    No table drawn: just names with their cards.

## Repository and versioning (2026-10-16)

- Public GitHub repo `AttaqueDefense` (GitHub names cannot contain "é"); display name **AttaqueDéfense**.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/).
- Tags: [SemVer](https://semver.org/). While in `0.x`: a new feature bumps the minor version (`v0.1.0` → `v0.2.0`),
  a fix bumps the patch version (`v0.2.0` → `v0.2.1`).
- `v0.1.0` = first playable version (proposed: end of roadmap step 5).
