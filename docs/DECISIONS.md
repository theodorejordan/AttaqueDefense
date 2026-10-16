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

## Repository and versioning (2026-10-16)

- Public GitHub repo `AttaqueDefense` (GitHub names cannot contain "é"); display name **AttaqueDéfense**.
- Commits: [Conventional Commits](https://www.conventionalcommits.org/).
- Tags: [SemVer](https://semver.org/). While in `0.x`: a new feature bumps the minor version (`v0.1.0` → `v0.2.0`),
  a fix bumps the patch version (`v0.2.0` → `v0.2.1`).
- `v0.1.0` = first playable version (proposed: end of roadmap step 5).
