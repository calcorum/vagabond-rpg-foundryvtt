# Active Effects Reference

This document describes how to use Active Effects to automate mechanical bonuses from ancestries, perks, and class features in the Vagabond RPG Foundry VTT system.

## Overview

Active Effects are Foundry's mechanism for items (classes, perks, ancestries) to modify actor data. When an item with a `changes` array is added to an actor, the system automatically creates Active Effects that modify the actor's stats, resources, senses, etc.

## Effect Modes

| Mode      | Constant                 | Value | Description                         |
| --------- | ------------------------ | ----- | ----------------------------------- |
| CUSTOM    | `EFFECT_MODES.CUSTOM`    | 0     | Custom logic (not commonly used)    |
| MULTIPLY  | `EFFECT_MODES.MULTIPLY`  | 1     | Multiply the base value             |
| ADD       | `EFFECT_MODES.ADD`       | 2     | Add to the base value (most common) |
| DOWNGRADE | `EFFECT_MODES.DOWNGRADE` | 3     | Use lower of base and effect value  |
| UPGRADE   | `EFFECT_MODES.UPGRADE`   | 4     | Use higher of base and effect value |
| OVERRIDE  | `EFFECT_MODES.OVERRIDE`  | 5     | Replace the base value entirely     |

### When to Use Each Mode

- **ADD (2)**: Numeric bonuses like +HP, +Speed, +Armor, crit threshold reductions
- **OVERRIDE (5)**: Boolean toggles like senses (darkvision), movement capabilities (fly), skill training

## Available Effect Keys

### Stats

| Shorthand Key    | Full Path                      | Type   | Typical Mode |
| ---------------- | ------------------------------ | ------ | ------------ |
| `stat.might`     | `system.stats.might.value`     | Number | ADD          |
| `stat.dexterity` | `system.stats.dexterity.value` | Number | ADD          |
| `stat.awareness` | `system.stats.awareness.value` | Number | ADD          |
| `stat.reason`    | `system.stats.reason.value`    | Number | ADD          |
| `stat.presence`  | `system.stats.presence.value`  | Number | ADD          |
| `stat.luck`      | `system.stats.luck.value`      | Number | ADD          |

### Resources

| Shorthand Key     | Full Path                          | Type   | Typical Mode |
| ----------------- | ---------------------------------- | ------ | ------------ |
| `hp.bonus`        | `system.resources.hp.bonus`        | Number | ADD          |
| `mana.bonus`      | `system.resources.mana.bonus`      | Number | ADD          |
| `mana.castingMax` | `system.resources.mana.castingMax` | Number | ADD          |
| `luck.max`        | `system.resources.luck.max`        | Number | ADD          |
| `studiedDice.max` | `system.resources.studiedDice.max` | Number | ADD          |

### Combat Stats

| Shorthand Key     | Full Path                | Type   | Typical Mode |
| ----------------- | ------------------------ | ------ | ------------ |
| `armor`           | `system.armor`           | Number | ADD          |
| `itemSlots.bonus` | `system.itemSlots.bonus` | Number | ADD          |
| `speed.bonus`     | `system.speed.bonus`     | Number | ADD          |

### Save Bonuses

| Shorthand Key | Full Path                   | Type   | Typical Mode |
| ------------- | --------------------------- | ------ | ------------ |
| `save.reflex` | `system.saves.reflex.bonus` | Number | ADD          |
| `save.endure` | `system.saves.endure.bonus` | Number | ADD          |
| `save.will`   | `system.saves.will.bonus`   | Number | ADD          |

### Skill Crit Thresholds

| Shorthand Key      | Full Path                                 | Type   | Typical Mode |
| ------------------ | ----------------------------------------- | ------ | ------------ |
| `crit.arcana`      | `system.skills.arcana.critThreshold`      | Number | ADD          |
| `crit.brawl`       | `system.skills.brawl.critThreshold`       | Number | ADD          |
| `crit.craft`       | `system.skills.craft.critThreshold`       | Number | ADD          |
| `crit.detect`      | `system.skills.detect.critThreshold`      | Number | ADD          |
| `crit.finesse`     | `system.skills.finesse.critThreshold`     | Number | ADD          |
| `crit.influence`   | `system.skills.influence.critThreshold`   | Number | ADD          |
| `crit.leadership`  | `system.skills.leadership.critThreshold`  | Number | ADD          |
| `crit.medicine`    | `system.skills.medicine.critThreshold`    | Number | ADD          |
| `crit.mysticism`   | `system.skills.mysticism.critThreshold`   | Number | ADD          |
| `crit.performance` | `system.skills.performance.critThreshold` | Number | ADD          |
| `crit.sneak`       | `system.skills.sneak.critThreshold`       | Number | ADD          |
| `crit.survival`    | `system.skills.survival.critThreshold`    | Number | ADD          |

### Attack Crit Thresholds

| Shorthand Key         | Full Path                              | Type   | Typical Mode |
| --------------------- | -------------------------------------- | ------ | ------------ |
| `crit.attack.melee`   | `system.attacks.melee.critThreshold`   | Number | ADD          |
| `crit.attack.brawl`   | `system.attacks.brawl.critThreshold`   | Number | ADD          |
| `crit.attack.ranged`  | `system.attacks.ranged.critThreshold`  | Number | ADD          |
| `crit.attack.finesse` | `system.attacks.finesse.critThreshold` | Number | ADD          |

### Senses (Boolean)

| Shorthand Key        | Full Path                    | Type    | Typical Mode |
| -------------------- | ---------------------------- | ------- | ------------ |
| `sense.darkvision`   | `system.senses.darkvision`   | Boolean | OVERRIDE     |
| `sense.blindsight`   | `system.senses.blindsight`   | Boolean | OVERRIDE     |
| `sense.allsight`     | `system.senses.allsight`     | Boolean | OVERRIDE     |
| `sense.echolocation` | `system.senses.echolocation` | Boolean | OVERRIDE     |
| `sense.seismicsense` | `system.senses.seismicsense` | Boolean | OVERRIDE     |
| `sense.telepathy`    | `system.senses.telepathy`    | Boolean | OVERRIDE     |

### Movement Capabilities (Boolean)

| Shorthand Key    | Full Path               | Type    | Typical Mode |
| ---------------- | ----------------------- | ------- | ------------ |
| `movement.fly`   | `system.movement.fly`   | Boolean | OVERRIDE     |
| `movement.swim`  | `system.movement.swim`  | Boolean | OVERRIDE     |
| `movement.climb` | `system.movement.climb` | Boolean | OVERRIDE     |
| `movement.cling` | `system.movement.cling` | Boolean | OVERRIDE     |
| `movement.phase` | `system.movement.phase` | Boolean | OVERRIDE     |

### Skill Training (Boolean)

| Shorthand Key               | Full Path                           | Type    | Typical Mode |
| --------------------------- | ----------------------------------- | ------- | ------------ |
| `skill.arcana.trained`      | `system.skills.arcana.trained`      | Boolean | OVERRIDE     |
| `skill.brawl.trained`       | `system.skills.brawl.trained`       | Boolean | OVERRIDE     |
| `skill.craft.trained`       | `system.skills.craft.trained`       | Boolean | OVERRIDE     |
| `skill.detect.trained`      | `system.skills.detect.trained`      | Boolean | OVERRIDE     |
| `skill.finesse.trained`     | `system.skills.finesse.trained`     | Boolean | OVERRIDE     |
| `skill.influence.trained`   | `system.skills.influence.trained`   | Boolean | OVERRIDE     |
| `skill.leadership.trained`  | `system.skills.leadership.trained`  | Boolean | OVERRIDE     |
| `skill.medicine.trained`    | `system.skills.medicine.trained`    | Boolean | OVERRIDE     |
| `skill.mysticism.trained`   | `system.skills.mysticism.trained`   | Boolean | OVERRIDE     |
| `skill.performance.trained` | `system.skills.performance.trained` | Boolean | OVERRIDE     |
| `skill.sneak.trained`       | `system.skills.sneak.trained`       | Boolean | OVERRIDE     |
| `skill.survival.trained`    | `system.skills.survival.trained`    | Boolean | OVERRIDE     |

### Focus Tracking

| Shorthand Key         | Full Path                    | Type   | Typical Mode |
| --------------------- | ---------------------------- | ------ | ------------ |
| `focus.maxConcurrent` | `system.focus.maxConcurrent` | Number | ADD          |

## JSON Format

### Ancestry Trait Example

```json
{
  "name": "Darksight",
  "description": "<p>You can see in darkness as if it were dim light.</p>",
  "changes": [
    {
      "key": "system.senses.darkvision",
      "mode": 5,
      "value": "true"
    }
  ]
}
```

### Perk Example

```json
{
  "system": {
    "changes": [
      {
        "key": "system.resources.hp.bonus",
        "mode": 2,
        "value": "@level"
      }
    ]
  }
}
```

### Class Feature Example

```json
{
  "name": "Valor I",
  "level": 1,
  "description": "<p>The roll required for you to Crit on Attack Checks is reduced by 1.</p>",
  "passive": true,
  "changes": [
    {
      "key": "system.attacks.melee.critThreshold",
      "mode": 2,
      "value": "-1",
      "priority": 10
    },
    {
      "key": "system.attacks.ranged.critThreshold",
      "mode": 2,
      "value": "-1",
      "priority": 10
    }
  ]
}
```

## Formula Support

Values can use Roll Data formulas for dynamic calculations:

| Formula                  | Description                |
| ------------------------ | -------------------------- |
| `@level`                 | Character's current level  |
| `@stats.might.value`     | Character's Might stat     |
| `@stats.dexterity.value` | Character's Dexterity stat |
| `@stats.awareness.value` | Character's Awareness stat |
| `@stats.reason.value`    | Character's Reason stat    |
| `@stats.presence.value`  | Character's Presence stat  |
| `@stats.luck.value`      | Character's Luck stat      |

### Formula Examples

```json
// HP bonus equal to level (Dwarf Tough, Tough Perk)
{ "key": "system.resources.hp.bonus", "mode": 2, "value": "@level" }

// HP bonus equal to Might stat
{ "key": "system.resources.hp.bonus", "mode": 2, "value": "@stats.might.value" }
```

## Implementation Details

### Where Changes Are Applied

1. **Ancestry Traits**: `VagabondItem.applyAncestryTraits()` in `module/documents/item.mjs`
2. **Perk Effects**: `VagabondItem.applyPerkEffects()` in `module/documents/item.mjs`
3. **Class Features**: `VagabondItem.applyClassFeatures()` in `module/documents/item.mjs`

### Key Mapping

The system supports both full paths (`system.senses.darkvision`) and shorthand keys (`sense.darkvision`). Shorthand keys are mapped to full paths via `EFFECT_KEYS` in `module/helpers/effects.mjs`.

### Priority

Effects with higher priority values are applied later (and thus can override earlier effects). Default priority is `null`. Use explicit priority (e.g., `10`) when order matters.

## Adding New Automatable Effects

1. Add the key mapping to `EFFECT_KEYS` in `module/helpers/effects.mjs`
2. Ensure the target path exists in the actor data model (`module/data/actor/character.mjs`)
3. Add the `changes` array to the relevant compendium JSON file
4. Test by adding the item to a character and verifying the effect applies

## Current Automated Effects

### Ancestries

| Ancestry | Trait     | Effect                                |
| -------- | --------- | ------------------------------------- |
| Dwarf    | Darksight | `system.senses.darkvision = true`     |
| Dwarf    | Tough     | `system.resources.hp.bonus += @level` |
| Goblin   | Darksight | `system.senses.darkvision = true`     |
| Goblin   | Nimble    | `system.speed.bonus += 5`             |
| Orc      | Darksight | `system.senses.darkvision = true`     |
| Orc      | Hulking   | `system.itemSlots.bonus += 2`         |
| Halfling | Nimble    | `system.speed.bonus += 5`             |
| Draken   | Scale     | `system.armor += 1`                   |

### Perks

| Perk  | Effect                                            |
| ----- | ------------------------------------------------- |
| Tough | `system.resources.hp.bonus += @level` (stackable) |

### Class Features

| Class   | Feature            | Effect                                                                                             |
| ------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| Fighter | Valor I/II/III     | `system.attacks.melee.critThreshold -= 1`, `system.attacks.ranged.critThreshold -= 1` (cumulative) |
| Wizard  | Manifold Mind I/II | `system.focus.maxConcurrent += 1` (cumulative, base 1 → 2 → 3)                                     |

### Not Automated (Complex Mechanics)

| Class      | Feature | Reason                                                             |
| ---------- | ------- | ------------------------------------------------------------------ |
| Gunslinger | Deadeye | Dynamic crit reduction based on consecutive hits, resets each turn |
| Magus      | (none)  | No simple numeric bonuses; features are spell-block related        |
