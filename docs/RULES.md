# Rules — Attaque Défense

Single source of truth for the game rules. Code must follow this file.
If the code and this file disagree, this file wins (or the file gets updated after discussion).

## Glossary
- **Life cards**: up to 3 face-up cards per player, laid vertically. Their sum = the player's life points.
- **Shield**: 0 or 1 face-up card per player, laid horizontally in front of the life cards.
- **Munitions**: face-down cards held by a player, added to their next attack.
- **Draw deck**: face-down pile.
- **Side pot**: face-up pile of used cards. Each new card goes **on top**.

## 1. Players
- 3 to 10 players.
- Seating order is random. Play goes clockwise (= seating order).

## 2. Cards
- One standard 52-card deck, no jokers. Suits have no effect.
- Values: A = 1, 2–10 = face value, J = 11, Q = 12, K = 13.
- (Later option: two decks for 8–10 players.)

## 3. Setup
1. Shuffle the deck. Deal 4 face-down cards to each player.
2. Each player chooses, **without seeing the values**, which of their 4 cards is their shield.
   The other 3 become their life cards.
3. All shields and life cards are then revealed.
4. **First player**: lowest life points. Tie → lowest shield. Still tied → random.

## 4. Turn structure
1. **Ace peek**: if the active player's shield is an Ace, they privately look at the top card of the draw deck (section 5.4).
2. The player performs **exactly one** of these 3 actions: Attack, Defense, Munition.
3. If that action eliminated the first player of the game, the **hunter** plays immediately (section 8.2).
4. Play passes clockwise to the next player still in the game, counted from the player whose turn it was.

## 5. Actions

### 5.1 Attack
1. The attacker draws the top card of the draw deck, face-down.
2. They choose a target: any other player still in the game (never themselves).
3. The drawn card **and all munitions** the attacker holds are revealed together.
   Munitions are mandatory: you always attack with all of them.
   **Attack value** = sum of all those cards.
4. Resolution:
   - Target has **no shield** → damage = attack value.
   - Attack value **<** shield → nothing happens. The target keeps their shield and munitions.
   - Attack value **=** shield → shield destroyed, no damage.
   - Attack value **>** shield → shield destroyed, damage = attack value − shield.
5. Discarding: the destroyed shield (if any) goes to the side pot first, then the attack cards (drawn card + munitions).
6. If damage > 0, apply it (section 6).
7. **Losing munitions**: if the target's shield was destroyed **or** they lost life points, all their munitions go to the side pot (section 6.3).

### 5.2 Defense
Draw the top card of the draw deck face-down and give it to a player as their shield. It is revealed as soon as it is placed. Three possible uses:
- replace **your own** shield,
- replace **another player's** shield,
- give a shield to a player who has **none**.

The replaced shield (if any) goes to the side pot.

### 5.3 Munition
Draw the top card of the draw deck and give it face-down to any player still in the game (yourself included).
- Nobody sees its value, not even the giver or the receiver.
- Everyone can see how many munitions each player holds.
- No limit on the number of munitions.

### 5.4 Ace shield: peek
If a player's shield is an Ace at the start of their turn, they privately see the top card of the draw deck before choosing their action.
Whatever action they choose uses that card.
- Only that player sees it. The rest of the table does not.
- It is a balancing rule for a weak shield, and an important part of the game.
- If that card becomes a munition, the game does **not** remind them of its value: they have to remember it, as at a real table.

## 6. Damage
Life points can never increase.

To take **D** damage:
- If **D ≥ total life points** → the player is eliminated (section 8).
- Otherwise the player removes one or more life cards whose sum **S ≥ D**.
  - If S = D, nothing is added.
  - If S > D, add **one** replacement card of value **S − D**. It must be a real card value (1–13).
- A player can never have more than 3 life cards.
- Removed life cards go to the side pot.

Example: life 9-2-12, 5 damage.

| Removed | Replacement | Result | Valid? |
|---|---|---|---|
| 9 | 4 | 4-2-12 | yes |
| 12 | 7 | 9-2-7 | yes |
| 2 | — | (2 < 5) | no |
| 9 + 2 | 6 | 6-12 | yes |
| 12 + 2 | 9 | 9-9 | yes |
| 9 + 12 | 16 | not a card | no |

### 6.1 Finding the replacement card
1. Search the **side pot**, from the top (most recent card) down.
2. If not found, search the **draw deck from the bottom** up, so the top of the deck is left undisturbed.
3. If that value is not available anywhere, the option is invalid: use the next best one (6.2).

Because the destroyed shield and the attack cards are discarded **before** the search (5.1 step 5),
they are the first cards found. Example: an attack of 2 on a player with no shield and life 4-12
→ remove the 4, and the attack card 2 becomes their new life card → 2-12.

### 6.2 Choosing among valid options (automatic)
Each player picks a **damage preference**. It is private and can be changed at any time during the game:
- **Fewest cards**: minimize the number of life cards. Tie-break: lowest max.
- **Lowest max**: minimize the highest life card. Tie-break: fewest cards.
- **Normal**: no preference. Picks the option with the **least searching**. Tie-break: fewest cards.

**Least searching** = the replacement card is found the earliest: no replacement needed is best,
then higher in the side pot, then closer to the bottom of the draw deck.
It is the final tie-break for "Fewest cards" and "Lowest max".
Example: life 10-4-3, 2 damage from an attack card 2 → the 2 is on top of the side pot → 10-2-3 rather than 10-4-1.

In the 9-2-12 example above, both "Fewest cards" and "Lowest max" pick 9-9.

### 6.3 Losing munitions
A player loses all their munitions when:
- their shield is destroyed by an attack, or
- they lose life points.

If an attack is lower than their shield, they keep their munitions.
If another player replaces their shield with Defense, it is not destroyed: they keep their munitions.
Lost munitions go to the side pot face-up, **after** the damage is resolved (so they never serve as a replacement card for that attack).

## 7. Draw deck running out
When a card must be drawn and the draw deck is empty, the side pot is **flipped over without shuffling** and becomes the new draw deck.
The most recently discarded cards end up at the bottom, the oldest ones on top.

## 8. Elimination and end of the game

### 8.1 Elimination
- An eliminated player's cards (life cards, shield, munitions) go to the side pot.
- The last player standing wins.

### 8.2 Hunter rule
- The **first** player eliminated in the game immediately plays one last action, right after the action that eliminated them.
- They may choose any action **except** giving themselves a shield or a munition. So: attack a player, change or give someone else's shield, or give someone else a munition.
- They have no munitions left (they lost them when they lost life points), so a hunter attack uses only the drawn card.
- Players eliminated afterwards (including by the hunter) do not get a hunter action.
- Then play resumes normally. Example: order A, B, C, D; C eliminates B → B plays as hunter → D plays.
- Planned game setting: hunter rule off / first eliminated only (default) / every eliminated player.

## 9. Information visibility
| Element | Visible to |
|---|---|
| Life cards | Everyone |
| Shields | Everyone (revealed as soon as placed) |
| Number of munitions per player | Everyone |
| Munition values | Nobody, until revealed in an attack |
| Drawn card (attack / defense / munition) | Nobody until revealed, except the Ace holder's peek (5.4) |
| Side pot | Everyone (face-up) |
| Draw deck | Nobody (only its card count) |
| Damage preference | Only its owner |

## 10. Online-specific rules (timers, disconnections)
To decide.

## Open questions
None for now.

## Clarifications log
- **2026-10-16**: Order of discards before the replacement search: owner says it makes little difference; chosen order is shield first, then attack cards.
- **2026-10-16**: Running out of every card (all cards held as munitions) is ignored for now: it should not happen in practice.
