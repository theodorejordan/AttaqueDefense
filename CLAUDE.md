# AttaqueDéfense

Multiplayer browser card game (3 to 10 players) designed by the repo owner. Public repo: https://github.com/theodorejordan/AttaqueDefense

## Start of every conversation
Read these before doing anything, so the owner never has to re-explain the project:
1. `docs/STATUS.md`: where we are in the roadmap, what's next, pending discussions. **Start here.**
2. `docs/RULES.md`: the game rules, single source of truth. Read before touching any game logic.
3. `docs/DECISIONS.md`: architecture, networking, UI, bots, versioning decisions and why.

Keep them up to date: when a rule is clarified, a decision is made or a step ends, update the right file in the same change.
Never invent a rule: if something is ambiguous or missing, ask the owner, then record the answer in the RULES "Clarifications log".

## Working with the owner
- Communicate in English (even if the owner writes in French).
- Discuss every design decision before implementing it, at each roadmap step. The owner has their own ideas
  (e.g. bots, UI): ask for them first. Present options with pros/cons and a recommendation; challenge bad ideas.
- Plan before coding (files, approach, why) and get approval. Explain concepts and link official docs.
- Don't over-anticipate rare edge cases: mention them briefly, then move on. The owner prefers to handle them if they happen in real games.
- Never commit or push without the owner's explicit go-ahead for that specific change. No AI attribution in commits.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Releases are tagged with [SemVer](https://semver.org/) (`v0.1.0`, …). See `docs/DECISIONS.md` > Versioning.

## Commands
```sh
npm test           # all tests, including bot simulations
npm run typecheck
npm run dev        # game server + client on http://localhost:3000 (each browser tab = one player)
```
Node 22.18+ runs the TypeScript directly (type stripping): only erasable syntax is allowed (no enums, no parameter properties),
and imports use the `.ts` extension.

## Code map
- `src/engine/`: the rules, as pure functions. No network or UI code.
  - `state.ts`: types (`GameState`, `Settings`, `GameOptions`, `Command`, `GameEvent`), `cloneState`, errors.
  - `setup.ts`: createGame (seating, decks, dealing), blind shield choice, first player.
  - `actions.ts`: `applyCommand` (single entry point), flip the side pot, draw, play (attack/defense/munition), hunter, turn order, `legalPlays`.
  - `damage.ts`: damage options, replacement-card search, preferences, fallbacks.
  - `view.ts`: `viewFor(state, player)`, the only data a client or bot may receive.
  - `bots/random.ts`: random bot (uses a `PlayerView`, never the full state).
  - `rng.ts`: seeded RNG; randomness is always injected, never `Math.random()` inside the engine.
  - `*.test.ts`: unit tests built from RULES examples; `simulation.test.ts` plays random games and checks invariants.
  - `actions.ts` also has `eliminateAfterTimeout` (RULES 10), called by the server only. `view.ts` also has `spectatorView`.
- `src/shared/protocol.ts`: messages between browser and server (`Request` in, `Update` and `chat` out, `Reply` acknowledgement).
- `src/server/`:
  - `room.ts`: the single room (lobby, host, bots, game, event log, disconnection timers, "looking at", chat). No network code, tested with fake timers.
  - `validate.ts`: checks the shape of every client payload (clients are untrusted).
  - `index.ts`: HTTP + Socket.IO wiring; `--dev` serves the client through Vite middleware mode.
- `src/client/`: throwaway debug page (step 3). The real UI comes in step 4.
  - `i18n/`: English and French texts (`en.ts`, `fr.ts`, same keys, checked by TypeScript), `t`, language detection and switch.
    Every text a player sees goes through `t`; the server only sends codes and data.

## Key principles
- The server is authoritative: game logic and validation live in the engine, run by the server only.
- Never send another player's hidden cards to a client: only `viewFor` output leaves the server. Events are public by design.
- Engine functions return a new state + events and never mutate their input. Cards are immutable objects that move between piles.
- Desktop first, but keep layouts responsive for the mobile pass. Keep downloads light (mobile data).
