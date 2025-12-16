# Compendium Data Review Checklist

Use this checklist when reviewing compendium JSON files before committing.

## Source Material References

- **NoteDiscovery**: `gaming/vagabond-rpg/` (classes, perks, spells, ancestries)
- **PDF**: `/mnt/NV2/Development/claude-home/gaming/Vagabond_RPG_-_Pulp_Fantasy_Core_Rulebook_Interactive_PDF.pdf`

## Class Files (`classes/*.json`)

- [ ] **Name** matches official class name exactly
- [ ] **keyStat** matches recommended stat from rulebook
- [ ] **zone** (frontline/midline/backline) matches class description
- [ ] **isCaster** flag is correct
- [ ] **trainedSkills** list matches class training grants
- [ ] **Progression table** matches level-by-level:
  - [ ] Correct levels for each feature
  - [ ] Correct mana values for casters
  - [ ] Correct castingMax values for casters
  - [ ] Feature names at correct levels
- [ ] **Features array**:
  - [ ] Feature names match exactly
  - [ ] Descriptions are from source (not invented)
  - [ ] `changes[]` arrays have correct Active Effect keys
  - [ ] Mode values are appropriate (2=ADD, 5=OVERRIDE for booleans)
  - [ ] Choice features have correct `choiceType` and `choiceFilter`

## Ancestry Files (`ancestries/*.json`)

- [ ] **Name** matches official ancestry name
- [ ] **beingType** is correct (typically "mortal")
- [ ] **size** matches (small/medium/large)
- [ ] **baseSpeed** matches source
- [ ] **Traits array**:
  - [ ] Trait names match exactly
  - [ ] Descriptions are from source (not invented)
  - [ ] `changes[]` arrays have correct keys and values
  - [ ] Boolean senses use mode 5 (OVERRIDE)

## Perk Files (`perks/*.json`)

- [ ] **Name** matches official perk name exactly
- [ ] **prerequisite** text matches source requirements
- [ ] **prerequisites object** (if used):
  - [ ] Stat requirements are correct
  - [ ] Skill training requirements are correct
  - [ ] Required perks/spells are correct
- [ ] **Description** is from source (not invented flavor text)
- [ ] **changes[]** array (if mechanical effect):
  - [ ] Keys target correct system paths
  - [ ] Values are correct
  - [ ] Modes are appropriate

## Spell Files (`spells/*.json`)

- [ ] **Name** matches official spell name
- [ ] **Effect** description matches source
- [ ] **Damage** dice and type are correct
- [ ] **Delivery options** match what's listed
- [ ] **Duration** options are correct
- [ ] **critEffect** matches source (if any)

## Common Mistakes to Avoid

1. **Invented flavor text** - Only use descriptions from the source material
2. **Wrong feature levels** - Double-check progression tables
3. **Incorrect prerequisites** - Verify stat/skill/perk requirements
4. **Made-up mechanics** - Don't add effects not in the source
5. **Typos in effect keys** - `system.attacks.melee.critThreshold` not `system.attack.melee.crit`

## Review Sign-off

When reviewing, the human should:

1. Open the relevant NoteDiscovery page or PDF section
2. Compare each field against the source
3. Flag any discrepancies
4. Only approve when all fields verified

**Do not approve if you cannot verify against source material.**
