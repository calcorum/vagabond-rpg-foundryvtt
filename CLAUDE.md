# Vagabond RPG Foundry VTT System - Development Context

## Project Overview

This is a complete Foundry VTT v13 system implementation for Vagabond RPG (Pulp Fantasy TTRPG).

## Key Architecture Decisions

### Data Models (Foundry v13 style)

- Use TypeDataModel classes in `module/data/` for Actor and Item schemas
- Character stats: Might, Dexterity, Awareness, Reason, Presence, Luck (range 2-7)
- Derived values calculated in `prepareData()`: HP, Speed, Save difficulties, Skill difficulties

### Roll System

- Base formula: d20 >= (20 - Stat) for untrained, d20 >= (20 - Stat\*2) for trained
- Favor: +d6 bonus die
- Hinder: -d6 penalty die
- Crit: Natural 20 by default, but threshold can be modified per-skill by Active Effects
- Exploding dice: d6! notation for certain abilities

### Spell Casting

**Casting Decisions:** When casting, determine Damage/Effect, Delivery, and Duration.

**Mana Cost Formula:**

1. **Base cost:**
   - Only 1d6 damage OR only effect = 0 Mana
   - Both damage AND effect = 1 Mana
2. **+ Extra damage dice:** +1 Mana per d6 beyond the first
3. **+ Delivery cost:** Touch(0), Remote(0), Imbue(0), Cube(1), Aura(2), Cone(2), Glyph(2), Line(2), Sphere(2)
4. **Duration:** Instant/Focus/Continual - no initial cost, but Focus requires 1 Mana/round to maintain on unwilling targets

**Cast Checks:** Only required when targeting an unwilling Being.

**Cast Skills by Class:** Wizard/Magus=Arcana, Druid/Luminary/Witch=Mysticism, Sorcerer=Influence, Revelator=Leadership

### Class System

- Classes are Items with progression tables
- When dragged to character, creates Active Effects for current level
- On level up, update Active Effects to grant new features
- Supports future multiclassing by allowing multiple class items

### Crit Threshold System

- Each skill/action has a `critThreshold` field (default 20)
- Active Effects from classes/perks can modify: `system.skills.melee.critThreshold`
- Fighter's Valor reduces crit by 1/2/3 at levels 1/4/8
- Gunslinger's Deadeye dynamically reduces on consecutive hits

### Resources

- HP: max = Might \* Level
- Mana: class-dependent, max from class progression
- Luck: equals Luck stat, refreshes on rest
- Fatigue: 0-5, death at 5, each reduces item slots by 1
- Studied Dice: some classes grant these
- Custom resources can be added dynamically

## File Naming Conventions

- Main system entry: `vagabond.mjs`
- Document classes: `VagabondActor.mjs`, `VagabondItem.mjs`
- Sheet classes: `VagabondCharacterSheet.mjs`, `VagabondNPCSheet.mjs`
- Data models: `CharacterData.mjs`, `NPCData.mjs`, `SpellData.mjs`, etc.
- Templates: `character-sheet.hbs`, `npc-sheet.hbs`, `spell-item.hbs`

## Testing Commands

```bash
# Start local Foundry
docker compose up -d

# Watch SCSS
npm run watch

# View logs
docker compose logs -f foundry
```

### Testing Code Revisions

```bash
# Restart local Foundry container
docker compose restart
```

## Reference Data Location

Game rules and content are documented in NoteDiscovery under `gaming/vagabond-rpg/`:

- `core-mechanics` - Stats, checks, dice, HP
- `combat` - Actions, movement, defending, zones
- `character-creation` - Ancestries, classes, leveling
- `magic-system` - Casting, mana, delivery, duration
- `spells-full-text` - All 55+ spells with full descriptions
- `perks-full-list` - All 90+ perks with prerequisites
- `classes-full-text` - All 18 classes with progression tables
- `bestiary` - Creature categories, TL reference
- `testing-strategy` - Quench testing patterns (unit vs integration, async handling)

**To access NoteDiscovery:**

```bash
# List all notes
cd ~/.claude/skills/notediscovery && python client.py list

# Read a specific note
cd ~/.claude/skills/notediscovery && python client.py read "gaming/vagabond-rpg/magic-system.md"

# Search notes
cd ~/.claude/skills/notediscovery && python client.py search "keyword"
```

Original PDF at: `/mnt/NV2/Development/claude-home/gaming/Vagabond_RPG_-_Pulp_Fantasy_Core_Rulebook_Interactive_PDF.pdf`
Character sheet reference: `/mnt/NV2/Development/claude-home/gaming/Vagabond_-_Hero_Record_Interactive_PDF.pdf`

## Reference Project Documentation

The D&D 5e Foundry system is very well documented here: https://deepwiki.com/foundryvtt/dnd5e/1-dnd5e-system-overview

## Project Roadmap

See `PROJECT_ROADMAP.json` for complete task breakdown with dependencies.

## Style Guidelines

- Parchment color scheme with high contrast (WCAG AA compliant)
- Match official Hero Record layout where possible
- Use CSS custom properties for theming
- SCSS with BEM naming convention
