# AttaqueDéfense

A multiplayer card game for 3 to 10 players, played in the browser on phones or computers.

One player hosts the game on their computer, the others join with a link or a QR code:
on the same Wi-Fi, or from anywhere through a free Cloudflare tunnel (no account needed).

> **Status: in development, not playable yet.** See the roadmap below.

## The game in 30 seconds

Each player starts with 4 face-down cards: they pick one blind as their **shield**, the other 3 are their **life points**.
On your turn, choose one action:

- **Attack**: draw a card and hit another player. Beat their shield to deal the difference as damage.
- **Defense**: give a new shield to yourself or to someone else.
- **Munition**: give a face-down card to anyone (yourself included). It will be added to their next attack, for better or worse.

Last player standing wins. Full rules: [`docs/RULES.md`](docs/RULES.md).

## Roadmap

1. Project setup
2. Game engine, tests, random bot
3. Server and lobby (with bots)
4. Desktop interface
5. Launch commands (local network and public link)
6. Mobile interface
7. Smarter bots

## Documentation

- [`docs/RULES.md`](docs/RULES.md): full game rules
- [`docs/DECISIONS.md`](docs/DECISIONS.md): technical and design decisions

## Versioning

Releases follow [Semantic Versioning](https://semver.org/) (`v0.1.0`, `v0.2.0`, …) and commits follow [Conventional Commits](https://www.conventionalcommits.org/).
