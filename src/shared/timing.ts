// How long the table plays an attack back (docs/DECISIONS.md > UI > Animations). Shared with the server, which waits
// as long before a bot plays after an attack, so the screens never fall behind the game.

/** The attack cards lie on the target's defence, before anything changes. */
export const ATTACK_PAUSE_MS = 2_000;
/** Then the life cards change, and the attack cards stay a little longer. */
export const ATTACK_HOLD_MS = 2_000;
export const ATTACK_PLAYBACK_MS = ATTACK_PAUSE_MS + ATTACK_HOLD_MS;
