# Equipment Compendium Generation Summary

## Generation Date

2025-12-16

## Total Items Generated

**368 equipment JSON files**

### Breakdown by Category

#### Adventuring Gear (286 items)

- **Alchemy & Medicine**: 26 items (tools, containers, medical supplies)
- **Beasts & Husbandry**: 25 items (animals, mounts, feed, barding)
- **Astronomy & Navigation**: 8 items (astrolabe, compass, spyglass, etc.)
- **Books & Magic**: 21 items (including Spellbook with canCastThrough=true, Trinket)
- **Clothing, Hygiene, & Textiles**: 43 items (all types of clothing and fabric)
- **Containers & Packs**: 1 item (Backpack with containerCapacity=2)
- **Cooking & Food**: 36 items (tools, ingredients, rations, meals)
- **Games & Toys**: 16 items (cards, dice, toys)
- **Gems & Jewelry**: 18 items (gems, ingots, jewelry)
- **Hardware**: 32 items (tools, ropes, chains, locks)
- **Liquor & Spirits**: 18 items (ale, beer, wine, liquor variants)
- **Musical Instruments**: 13 items (accordion, lute, drum, etc.)
- **Outdoors**: 20 items (camping gear, tents, torches)
- **Tools**: 9 items (tool sets for various trades)
- **Trade Goods**: 2 items (personal seal, merchant's scale)

#### Alchemical Items (82 items)

- **Acids**: 4 items (basic, defoliator, green slime, oxidizing)
- **Concoctions**: 17 items (adhesive, gravebane, instant rope, etc.)
- **Explosives**: 5 items (alchemist's fire, thunderstone, etc.)
- **Oils**: 7 items (basic, anointing, bladefire, ghostflame, etc.)
- **Poisons**: 3 items (basic, deadly nightshade, truth serum)
- **Potions**: 37 items (healing I-III, mana I-III, anger I-III, resistance, etc.)
- **Torches & Light Sources**: 9 items (candles, sunrod, special torches)

## Technical Specifications

### Value Conversion

All values correctly converted to copper:

- 1g = 1000 copper
- 1s = 10 copper
- 1c = 1 copper

### Special Properties Applied

#### Trinkets

- Spellbook: `isTrinket: true, canCastThrough: true`
- Trinket: `isTrinket: true`

#### Containers

- Backpack: `containerCapacity: 2, slots: 1`
- Various containers: Properly noted capacities in descriptions

#### Consumables

All consumable items have:

- `consumable: true`
- `uses.max: 1` (or appropriate number)
- `uses.autoDestroy: true`

### Category Distribution

- **consumable**: 149 items (potions, food, oils, acids, etc.)
- **gear**: 159 items (general adventuring equipment)
- **tool**: 11 items (crafting tool sets)
- **container**: 25 items (backpack, jars, vials, chests)
- **treasure**: 7 items (gems, ingots)
- **misc**: 17 items (animals, services)

### Tags Applied

Comprehensive tagging for filtering and search:

- `alchemy` - all alchemical items
- `potion` - healing, mana, resistance potions
- `poison` - poisonous substances
- `oil` - weapon oils
- `explosive` - alchemist's fire, thunderstone
- `acid` - corrosive substances
- `light` - torches, candles, lanterns
- `food` - rations, meals, ingredients
- `drink` - ale, beer, wine, liquor
- `clothing` - all wearable items
- `instrument` - musical instruments
- `camping` - outdoor/survival gear
- `tool` - tool sets and implements
- `container` - storage items
- `mount` - animals for riding
- `holy` - holy water, anointing oil
- `magic` - spellbooks, enchanted items
- `climbing` - rope, pitons, grappling hooks
- `navigation` - compass, astrolabe

## File Naming Convention

All files use kebab-case:

- `potion-healing-i.json`
- `alchemists-fire.json`
- `oil-wyrmwound.json`
- `clothes-winter-set.json`

## ID Convention

All items use camelCase IDs prefixed with `vagabondEquip`:

- `vagabondEquipPotionhealingi`
- `vagabondEquipAlchemistsfire`
- `vagabondEquipOilwyrmwound`

## Source Data

Generated from NoteDiscovery notes:

- `gaming/vagabond-rpg/gear-adventuring.md`
- `gaming/vagabond-rpg/gear-alchemical.md`

## Validation

All JSON files:

- Valid JSON format
- Match EquipmentData.mjs schema
- Include all required fields
- Set `reviewed: false` for manual review
- Include proper `_key` for Foundry compendium

## Notes

- All items ready for import into Foundry VTT
- Icons default to `icons/svg/item-bag.svg` (can be customized later)
- Descriptions include game mechanics where available
- Some alchemical item descriptions were incomplete in source data
