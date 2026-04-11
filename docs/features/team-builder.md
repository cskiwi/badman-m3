## Team Builder / Assembly Generator Rules

### Encounter Structure

#### Same-Gender Encounters (Men's or Women's)

All slots are filled by the same gender:

| Slot    | Type      | Players |
| ------- | --------- | ------- |
| double1 | Doubles 1 | 2       |
| double2 | Doubles 2 | 2       |
| double3 | Doubles 3 | 2       |
| double4 | Doubles 4 | 2       |
| single1 | Singles 1 | 1       |
| single2 | Singles 2 | 1       |
| single3 | Singles 3 | 1       |
| single4 | Singles 4 | 1       |

**Total player-slots:** 12

#### Mixed Encounters (MX)

Slots are split by gender:

| Slot    | Type                    | Players           |
| ------- | ----------------------- | ----------------- |
| double1 | MD (Men's Doubles)      | 2 males           |
| double2 | FD (Women's Doubles)    | 2 females         |
| double3 | MXD1 (Mixed Doubles 1)  | 1 male + 1 female |
| double4 | MXD2 (Mixed Doubles 2)  | 1 male + 1 female |
| single1 | MS1 (Men's Singles 1)   | 1 male            |
| single2 | MS2 (Men's Singles 2)   | 1 male            |
| single3 | FS1 (Women's Singles 1) | 1 female          |
| single4 | FS2 (Women's Singles 2) | 1 female          |

- **Male player-slots:** 6 (2 in MD + 1 in MXD1 + 1 in MXD2 + 1 in MS1 + 1 in MS2)
- **Female player-slots:** 6 (2 in FD + 1 in MXD1 + 1 in MXD2 + 1 in FS1 + 1 in FS2)

---

### Game Distribution Rules

Team size is always between 4 and 6 players. **Every slot must be filled!** and **Each the players must have this exact amount of games provided by this table**

So the order for the generator is:
- First decide who is going to play how many games (based on the available players and the table below and historically who played the most, if equal then random)
  - Also if a player has a pre-assigned slot, that counts toward their game total. So if a player is pre-assigned to a single, they can only be assigned to 1 more slot (either a double or another single).
- depending on the strategy, assign players to slots while respecting the constraints and pre-assigned slots

#### Same-Gender (12 total slots)

| Pool Size | Games per Player               | Distribution                             |
| --------- | ------------------------------ | ---------------------------------------- |
| 6 players | 2 games each                   | Either 2 doubles, or 1 double + 1 single |
| 5 players | 2 play 3 games, 3 play 2 games | 3-game players: 2 doubles + 1 single     |
| 4 players | 3 games each                   | 2 doubles + 1 single                     |

#### Mixed (6 slots per gender)

The same rules apply **per gender pool**:

| Pool Size (per gender) | Games per Player | Distribution                                                     |
| ---------------------- | ---------------- | ---------------------------------------------------------------- |
| 3 players              | 2 games each     | Either 2 doubles (see constraints below), or 1 double + 1 single |
| 2 players              | 3 games each     | 2 doubles + 1 single                                             |

Typical MX team compositions:

| Total Players | Composition | Males        | Females      |
| ------------- | ----------- | ------------ | ------------ |
| 6             | 3M + 3F     | 2 games each | 2 games each |
| 5             | 3M + 2F     | 2 games each | 3 games each |
| 5             | 2M + 3F     | 3 games each | 2 games each |
| 4             | 2M + 2F     | 3 games each | 3 games each |

---

### Constraints

1. **Mixed doubles limit:** A single player can play at most **1 mixed double** (MXD1 or MXD2, not both).
2. **Singles uniqueness:** A player cannot be assigned to two different singles slots.
3. **Doubles limit:** As there will be only 1 gender double (MD or FD) in MX, a player can only be assigned to one of these doubles slots.

---

### Pre-Assigned / Occupied Slots

- **Fully occupied slot:** A slot with all required players pre-assigned. The generator skips this slot entirely.
- **Partial double:** A double slot with exactly 1 player pre-assigned. The generator finds a suitable partner for the pre-assigned player.
- **Pre-assigned singles:** Singles that are already filled count toward the player's game total.

---

### Generation Strategies

Three strategies are available:

1. **Variations** — Rotates player combinations based on historical usage. Picks least-used pairs while respecting game count balance and ranking restrictions.
2. **Best Results** — Uses win/loss history to select the best-performing pairs. Breaks ties by preferring players with fewer current games.
3. **Random** — Shuffles players randomly, then assigns slots. Sorts mixed-double candidates by ascending game count to ensure balanced distribution.

All strategies follow the same constraint rules. After initial assignment, a `fillAllSlots` / `fillAllSlotsMX` safety net fills any remaining empty slots.

---

### Formula

Maximum games per player is calculated as:

```
maxGames = ceil(totalSlots / poolSize)
```

- Same-gender: `totalSlots = 12`
- MX per gender: `totalSlots = 6`
