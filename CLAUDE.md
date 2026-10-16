# Attaque Défense

Multiplayer browser card game (3 to 10 players) designed by the repo owner.

## Read before working
- `docs/RULES.md`: the game rules. Read it before touching any game logic. Never invent a rule:
  if something is ambiguous or missing, ask the owner, then record the answer in the "Clarifications log" section.
- `docs/DECISIONS.md`: architecture, networking and UI decisions. Respect them; propose changes before deviating.

## Working with the owner
- Discuss every design decision with the owner before implementing it, at each step of the roadmap.
  The owner has their own ideas and requirements (e.g. for the bots): ask for them first.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
- Releases are tagged with [SemVer](https://semver.org/) (`v0.1.0`, …). See `docs/DECISIONS.md` > Versioning.

## Key principles
- The server is authoritative: game logic and validation live on the server only.
- Never send another player's hidden cards to a client.
- Desktop first, but keep layouts responsive for the mobile pass.
