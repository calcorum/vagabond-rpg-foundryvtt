# Active Effect Attribute Reference

Quick reference for attribute keys when creating Active Effects in the Vagabond RPG system.

## Attribute Key Format

All attribute keys use the format: `system.<path>.<property>`

## Character Attributes

### Core Stats

| Key                            | Type   | Range | Description    |
| ------------------------------ | ------ | ----- | -------------- |
| `system.stats.might.value`     | Number | 1-10  | Might stat     |
| `system.stats.dexterity.value` | Number | 1-10  | Dexterity stat |
| `system.stats.awareness.value` | Number | 1-10  | Awareness stat |
| `system.stats.reason.value`    | Number | 1-10  | Reason stat    |
| `system.stats.presence.value`  | Number | 1-10  | Presence stat  |
| `system.stats.luck.value`      | Number | 1-10  | Luck stat      |

### Level & XP

| Key            | Type   | Range | Description       |
| -------------- | ------ | ----- | ----------------- |
| `system.level` | Number | 1-10  | Character level   |
| `system.xp`    | Number | 0+    | Experience points |

### Resources

| Key                                  | Type   | Range | Description                     |
| ------------------------------------ | ------ | ----- | ------------------------------- |
| `system.resources.hp.value`          | Number | 0+    | Current HP                      |
| `system.resources.hp.max`            | Number | 0+    | Max HP (derived: Might x Level) |
| `system.resources.hp.bonus`          | Number | any   | Bonus to max HP                 |
| `system.resources.mana.value`        | Number | 0+    | Current Mana                    |
| `system.resources.mana.max`          | Number | 0+    | Max Mana                        |
| `system.resources.mana.castingMax`   | Number | 0+    | Max Mana per spell cast         |
| `system.resources.mana.bonus`        | Number | any   | Bonus to max Mana               |
| `system.resources.luck.value`        | Number | 0+    | Current Luck pool               |
| `system.resources.luck.max`          | Number | 0+    | Max Luck (derived: Luck stat)   |
| `system.resources.fatigue.value`     | Number | 0-5   | Fatigue level (death at 5)      |
| `system.resources.studiedDice.value` | Number | 0+    | Current Studied Dice            |
| `system.resources.studiedDice.max`   | Number | 0+    | Max Studied Dice                |

### Skills

Each skill has `trained`, `difficulty`, and `critThreshold` properties.

**Skills:** `arcana`, `brawl`, `craft`, `detect`, `finesse`, `influence`, `leadership`, `medicine`, `mysticism`, `performance`, `sneak`, `survival`

| Key Pattern                           | Type    | Range      | Description                 |
| ------------------------------------- | ------- | ---------- | --------------------------- |
| `system.skills.<skill>.trained`       | Boolean | true/false | Is skill trained?           |
| `system.skills.<skill>.difficulty`    | Number  | 1-20       | Roll target (derived)       |
| `system.skills.<skill>.critThreshold` | Number  | 1-20       | Crit on this roll or higher |

**Examples:**

- `system.skills.arcana.trained` - Train Arcana skill
- `system.skills.melee.critThreshold` - Modify melee crit threshold
- `system.skills.sneak.critThreshold` - Modify sneak crit threshold

### Attack Skills

Each attack skill has `trained`, `difficulty`, and `critThreshold` properties.

**Attack Skills:** `melee`, `brawl`, `ranged`, `finesse`

| Key Pattern                             | Type    | Range      | Description                 |
| --------------------------------------- | ------- | ---------- | --------------------------- |
| `system.attacks.<attack>.trained`       | Boolean | true/false | Is attack skill trained?    |
| `system.attacks.<attack>.difficulty`    | Number  | 1-20       | Roll target (derived)       |
| `system.attacks.<attack>.critThreshold` | Number  | 1-20       | Crit on this roll or higher |

**Examples:**

- `system.attacks.melee.trained` - Train Melee attack skill
- `system.attacks.ranged.trained` - Train Ranged attack skill
- `system.attacks.melee.critThreshold` - Modify melee crit threshold

### Saves

| Key                              | Type   | Description                                      |
| -------------------------------- | ------ | ------------------------------------------------ |
| `system.saves.reflex.difficulty` | Number | Reflex save difficulty (derived: 20 - DEX - AWR) |
| `system.saves.reflex.bonus`      | Number | Bonus to Reflex saves                            |
| `system.saves.endure.difficulty` | Number | Endure save difficulty (derived: 20 - MIT x 2)   |
| `system.saves.endure.bonus`      | Number | Bonus to Endure saves                            |
| `system.saves.will.difficulty`   | Number | Will save difficulty (derived: 20 - RSN - PRS)   |
| `system.saves.will.bonus`        | Number | Bonus to Will saves                              |

### Movement & Speed

| Key                     | Type    | Description                      |
| ----------------------- | ------- | -------------------------------- |
| `system.speed.walk`     | Number  | Walking speed (derived from DEX) |
| `system.speed.bonus`    | Number  | Bonus to walking speed           |
| `system.movement.climb` | Boolean | Can climb at full speed          |
| `system.movement.cling` | Boolean | Can move on ceilings             |
| `system.movement.fly`   | Boolean | Can fly                          |
| `system.movement.phase` | Boolean | Can move through occupied spaces |
| `system.movement.swim`  | Boolean | Can swim at full speed           |

### Senses

| Key                          | Type    | Description              |
| ---------------------------- | ------- | ------------------------ |
| `system.senses.allsight`     | Boolean | Can see everything       |
| `system.senses.blindsight`   | Boolean | Can sense without sight  |
| `system.senses.darkvision`   | Boolean | Can see in darkness      |
| `system.senses.echolocation` | Boolean | Echolocation sense       |
| `system.senses.seismicsense` | Boolean | Can sense vibrations     |
| `system.senses.telepathy`    | Boolean | Telepathic communication |

### Armor & Defense

| Key            | Type   | Description |
| -------------- | ------ | ----------- |
| `system.armor` | Number | Armor value |

### Item Slots

| Key                      | Type   | Description                                        |
| ------------------------ | ------ | -------------------------------------------------- |
| `system.itemSlots.used`  | Number | Currently used slots                               |
| `system.itemSlots.max`   | Number | Maximum slots (derived: 8 + MIT - Fatigue + bonus) |
| `system.itemSlots.bonus` | Number | Total bonus to slots                               |

### Character Details

| Key                                    | Type    | Values                                                                    | Description          |
| -------------------------------------- | ------- | ------------------------------------------------------------------------- | -------------------- |
| `system.details.size`                  | String  | small, medium, large, huge, giant, colossal                               | Size category        |
| `system.details.unitsOccupied`         | Number  | 1+                                                                        | Grid units occupied  |
| `system.details.allowsMovementThrough` | Boolean |                                                                           | Small creatures flag |
| `system.details.beingType`             | String  | humanlike, fae, cryptid, artificial, undead, primordial, hellspawn, beast | Being type           |

### Combat

| Key                                    | Type    | Description                              |
| -------------------------------------- | ------- | ---------------------------------------- |
| `system.combat.isFlanked`              | Boolean | Currently flanked                        |
| `system.combat.ignoresFlankingPenalty` | Boolean | Ignores flanking (Situational Awareness) |
| `system.combat.currentZone`            | String  | frontline, midline, backline, or null    |
| `system.combat.isDualWielding`         | Boolean | Currently dual-wielding                  |

### Casting

| Key                                       | Type    | Description        |
| ----------------------------------------- | ------- | ------------------ |
| `system.casting.canCastThroughWeapon`     | Boolean | Gish perk          |
| `system.casting.canCastThroughInstrument` | Boolean | Harmonic Resonance |

### Focus

| Key                          | Type   | Description                                          |
| ---------------------------- | ------ | ---------------------------------------------------- |
| `system.focus.maxConcurrent` | Number | Max concurrent focus (default 1, Ancient Growth = 2) |

### Travel

| Key                       | Type    | Description               |
| ------------------------- | ------- | ------------------------- |
| `system.travel.canForage` | Boolean | Can forage at normal pace |

---

## NPC Attributes

### Core Stats

| Key               | Type   | Description         |
| ----------------- | ------ | ------------------- |
| `system.hd`       | Number | Hit Dice            |
| `system.hp.value` | Number | Current HP          |
| `system.hp.max`   | Number | Max HP              |
| `system.tl`       | Number | Threat Level        |
| `system.armor`    | Number | Armor value         |
| `system.morale`   | Number | Morale score (2-12) |

### Movement

| Key                     | Type    | Description           |
| ----------------------- | ------- | --------------------- |
| `system.speed.value`    | Number  | Base speed            |
| `system.movement.climb` | Boolean | Can climb             |
| `system.movement.cling` | Boolean | Can cling to ceilings |
| `system.movement.fly`   | Boolean | Can fly               |
| `system.movement.phase` | Boolean | Can phase             |
| `system.movement.swim`  | Boolean | Can swim              |

### Senses (same as Character)

| Key                        | Type    | Description |
| -------------------------- | ------- | ----------- |
| `system.senses.darkvision` | Boolean | Darkvision  |
| `system.senses.blindsight` | Boolean | Blindsight  |
| etc.                       |         |             |

### Combat

| Key                | Type   | Values                       | Description           |
| ------------------ | ------ | ---------------------------- | --------------------- |
| `system.zone`      | String | frontline, midline, backline | Preferred combat zone |
| `system.size`      | String |                              | Size category         |
| `system.beingType` | String |                              | Being type            |

### Damage Modifiers

| Key                  | Type  | Description            |
| -------------------- | ----- | ---------------------- |
| `system.immunities`  | Array | Damage immunities      |
| `system.weaknesses`  | Array | Damage vulnerabilities |
| `system.resistances` | Array | Damage resistances     |

---

## Flag-Based Effects (Favor/Hinder)

Favor and Hinder are handled via Active Effect flags, not data attributes.

### Flag Format

```
flags.vagabond.favor.<category>.<type>
flags.vagabond.hinder.<category>.<type>
```

### Skill Favor/Hinder

| Flag Key                              | Description             |
| ------------------------------------- | ----------------------- |
| `flags.vagabond.favor.skills.arcana`  | Favor on Arcana checks  |
| `flags.vagabond.hinder.skills.arcana` | Hinder on Arcana checks |
| `flags.vagabond.favor.skills.melee`   | Favor on Melee attacks  |
| etc.                                  |                         |

### Attack Favor/Hinder

| Flag Key                        | Description           |
| ------------------------------- | --------------------- |
| `flags.vagabond.favor.attacks`  | Favor on all attacks  |
| `flags.vagabond.hinder.attacks` | Hinder on all attacks |

### Save Favor/Hinder

| Flag Key                             | Description            |
| ------------------------------------ | ---------------------- |
| `flags.vagabond.favor.saves.reflex`  | Favor on Reflex saves  |
| `flags.vagabond.hinder.saves.reflex` | Hinder on Reflex saves |
| `flags.vagabond.favor.saves.endure`  | Favor on Endure saves  |
| `flags.vagabond.hinder.saves.endure` | Hinder on Endure saves |
| `flags.vagabond.favor.saves.will`    | Favor on Will saves    |
| `flags.vagabond.hinder.saves.will`   | Hinder on Will saves   |

---

## Active Effect Change Modes

| Mode      | Value | Description                  |
| --------- | ----- | ---------------------------- |
| CUSTOM    | 0     | Custom handling              |
| MULTIPLY  | 1     | Multiply the value           |
| ADD       | 2     | Add to the value             |
| DOWNGRADE | 3     | Use lower of current or new  |
| UPGRADE   | 4     | Use higher of current or new |
| OVERRIDE  | 5     | Replace the value            |

### Common Patterns

**Add bonus to stat:**

```json
{
  "key": "system.stats.might.value",
  "mode": 2,
  "value": "1"
}
```

**Set boolean flag:**

```json
{
  "key": "system.senses.darkvision",
  "mode": 5,
  "value": "true"
}
```

**Reduce crit threshold:**

```json
{
  "key": "system.attacks.melee.critThreshold",
  "mode": 2,
  "value": "-1"
}
```

**Grant Favor on skill:**

```json
{
  "key": "flags.vagabond.favor.skills.detect",
  "mode": 5,
  "value": "Keen Senses"
}
```

**Grant trained skill:**

```json
{
  "key": "system.skills.survival.trained",
  "mode": 5,
  "value": "true"
}
```

---

## Examples by Class Feature

### Fighter - Valor (Crit Reduction)

```json
[
  {
    "key": "system.attacks.melee.critThreshold",
    "mode": 2,
    "value": "-1"
  },
  {
    "key": "system.attacks.brawl.critThreshold",
    "mode": 2,
    "value": "-1"
  },
  {
    "key": "system.attacks.ranged.critThreshold",
    "mode": 2,
    "value": "-1"
  },
  {
    "key": "system.attacks.finesse.critThreshold",
    "mode": 2,
    "value": "-1"
  }
]
```

### Orc - Hulking (+2 Item Slots)

```json
{
  "key": "system.itemSlots.bonus",
  "mode": 2,
  "value": "2"
}
```

### Dwarf - Darkvision

```json
{
  "key": "system.senses.darkvision",
  "mode": 5,
  "value": "true"
}
```

### Grant Mana

```json
{
  "key": "system.resources.mana.bonus",
  "mode": 2,
  "value": "3"
}
```

### Speed Bonus

```json
{
  "key": "system.speed.bonus",
  "mode": 2,
  "value": "5"
}
```
