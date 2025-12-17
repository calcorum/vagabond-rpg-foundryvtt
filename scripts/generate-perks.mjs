import fs from 'fs';
import path from 'path';

const PERKS_DIR = '/mnt/NV2/Development/vagabond-rpg-foundryvtt/packs/_source/perks/';

// Skip already created perks
const SKIP_PERKS = ['sharpshooter', 'situational-awareness', 'tough'];

// Utility functions
function toCamelCase(str) {
  return str.split('-').map((word, index) => {
    if (index === 0) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join('');
}

function toKebabCase(str) {
  return str.toLowerCase().replace(/\s+/g, '-');
}

function parsePrerequisites(prereqString) {
  const result = {
    stats: {
      might: null,
      dexterity: null,
      awareness: null,
      reason: null,
      presence: null,
      luck: null
    },
    trainedSkills: [],
    spells: [],
    perks: [],
    custom: ""
  };

  if (!prereqString || prereqString === '-' || prereqString === 'Prerequisite: -') {
    return result;
  }

  // Handle stat prerequisites
  const statMap = {
    'MIT': 'might',
    'DEX': 'dexterity',
    'AWR': 'awareness',
    'RSN': 'reason',
    'PRS': 'presence',
    'LUK': 'luck'
  };

  // Match "Stat: XXX N+" or "Stat: XXX N"
  const statMatch = prereqString.match(/Stat:\s*(\w+)\s*([<>]?)(\d+)\+?/);
  if (statMatch) {
    const statAbbr = statMatch[1];
    const operator = statMatch[2];
    const value = parseInt(statMatch[3]);
    const statName = statMap[statAbbr];

    if (statName) {
      if (operator === '<') {
        // Special case for Advancement (stat < 7)
        result.custom = `${statAbbr} ${operator}${value}`;
      } else {
        result.stats[statName] = value;
      }
    }
  }

  // Match "Stat: Chosen Stat <7"
  if (prereqString.includes('Chosen Stat <7')) {
    result.custom = "Chosen Stat <7";
  }

  // Handle trained skill prerequisites - need to capture the full trained section including potential &
  const trainedRegex = /Trained:\s*([^|]+?)(?:\s*\||$)/;
  const trainedMatch = prereqString.match(trainedRegex);
  if (trainedMatch) {
    let trainedText = trainedMatch[1].trim();

    // Remove trailing content after | if it exists
    trainedText = trainedText.replace(/\s*\|.*$/, '');

    // Check for AND condition (&)
    if (trainedText.includes('&')) {
      const skills = trainedText.split('&').map(s => {
        // Clean up "either X" patterns
        let skill = s.trim().toLowerCase();
        skill = skill.replace(/^either\s+/, '');
        return skill;
      });
      result.trainedSkills = skills.filter(s => s && !s.includes('either'));
    }
    // Check for OR condition (or)
    else if (trainedText.toLowerCase().includes(' or ')) {
      const skills = trainedText.split(/\s+or\s+/i).map(s => s.trim().toLowerCase());
      result.trainedSkills = skills;
    }
    // Single skill
    else {
      const skill = trainedText.toLowerCase();
      if (skill && skill !== 'either') {
        result.trainedSkills = [skill];
      }
    }
  }

  // Handle spell prerequisites
  const spellMatch = prereqString.match(/Spell:\s*(\w+)/);
  if (spellMatch) {
    result.spells = [spellMatch[1].toLowerCase()];
  }

  // Handle resource prerequisites
  const resourceMatch = prereqString.match(/Resource:\s*(.+)/);
  if (resourceMatch) {
    result.custom = resourceMatch[1].trim();
  }

  return result;
}

function assignTags(name, description, prerequisites) {
  const tags = [];
  const lowerDesc = description.toLowerCase();
  const lowerName = name.toLowerCase();

  // Combat-related
  if (lowerDesc.includes('attack') || lowerDesc.includes('damage') ||
      lowerDesc.includes('combat') || lowerDesc.includes('weapon') ||
      lowerDesc.includes('melee') || lowerDesc.includes('ranged')) {
    tags.push('combat');
  }

  // Defensive
  if (lowerDesc.includes('armor') || lowerDesc.includes('save') ||
      lowerDesc.includes('hp') || lowerDesc.includes('block') ||
      lowerDesc.includes('dodge') || lowerName.includes('tough') ||
      lowerDesc.includes('protect')) {
    tags.push('defensive');
  }

  // Utility
  if (lowerDesc.includes('check') && !tags.includes('combat') ||
      lowerDesc.includes('tool') || lowerDesc.includes('item slot')) {
    tags.push('utility');
  }

  // Social
  if (lowerDesc.includes('influence') || lowerDesc.includes('leadership') ||
      lowerDesc.includes('performance') || lowerDesc.includes('ally') ||
      lowerDesc.includes('inspire') || lowerDesc.includes('rally')) {
    tags.push('social');
  }

  // Crafting
  if (lowerDesc.includes('craft') || lowerDesc.includes('materials') ||
      lowerDesc.includes('artisan')) {
    tags.push('crafting');
  }

  // Magic
  if (lowerDesc.includes('spell') || lowerDesc.includes('mana') ||
      lowerDesc.includes('cast') || prerequisites.spells.length > 0) {
    tags.push('magic');
  }

  // Ritual
  if (lowerDesc.includes('ritual')) {
    tags.push('ritual');
  }

  // Movement
  if (lowerDesc.includes('speed') || lowerDesc.includes('move') ||
      lowerDesc.includes('rush') || lowerDesc.includes('jump') ||
      lowerDesc.includes('fly') || lowerDesc.includes('walk')) {
    tags.push('movement');
  }

  // Healing
  if (lowerDesc.includes('heal') || lowerDesc.includes('regain') ||
      lowerDesc.includes('restore') && lowerDesc.includes('hp')) {
    tags.push('healing');
  }

  // Add repeatable tag if applicable
  if (lowerDesc.includes('you can take this perk multiple times')) {
    tags.push('repeatable');
  }

  return tags.length > 0 ? tags : ['utility'];
}

function detectRitual(description) {
  const ritualMatch = description.match(/(\d+)\s*minute\s*Ritual/i);
  if (ritualMatch) {
    return {
      isRitual: true,
      duration: parseInt(ritualMatch[1])
    };
  }
  return {
    isRitual: false,
    duration: 0
  };
}

function createPerkJSON(name, prereqString, description) {
  const kebabName = toKebabCase(name);
  const camelName = toCamelCase(kebabName);
  const prerequisites = parsePrerequisites(prereqString);
  const ritual = detectRitual(description);
  const tags = assignTags(name, description, prerequisites);

  return {
    "_id": `vagabondPerk${camelName.charAt(0).toUpperCase() + camelName.slice(1)}`,
    "name": name,
    "type": "perk",
    "img": "icons/svg/shield.svg",
    "system": {
      "description": `<p>${description}</p>`,
      "prerequisites": prerequisites,
      "changes": [],
      "passive": true,
      "uses": {
        "value": 0,
        "max": 0,
        "per": ""
      },
      "luckCost": 0,
      "grantsLuck": 0,
      "isRitual": ritual.isRitual,
      "ritualDuration": ritual.duration,
      "ritualComponents": "",
      "tags": tags
    },
    "effects": [],
    "_key": `!items!vagabondPerk${camelName.charAt(0).toUpperCase() + camelName.slice(1)}`,
    "reviewed": false
  };
}

// All perks data extracted from the source
const PERKS = [
  {
    name: "Advancement",
    prereq: "Stat: Chosen Stat <7",
    description: "Increase one of your Stats by 1, but no higher than 7."
  },
  {
    name: "Akimbo Trigger",
    prereq: "Stat: DEX 4+ | Trained: Ranged",
    description: "You can dual-wield ranged weapons and make attacks with both."
  },
  {
    name: "Ambusher",
    prereq: "Stat: AWR 4+ | Trained: Sneak",
    description: "You have Favor on attack rolls against surprised enemies."
  },
  {
    name: "Animal Companion",
    prereq: "Stat: PRS 4+ | Trained: Survival",
    description: "If you spend a Shift taming and training a non-hostile Beast with a HD count no higher than half your Level, you can have it follow you as a companion. You control it by commanding it with your Action or by skipping your Move. Otherwise, it instinctually attacks your Enemies. It uses your Survival Difficulty for Checks. You can only have one such companion at a time."
  },
  {
    name: "Arcane Artisan",
    prereq: "Spell: Any | Trained: Craft",
    description: "When you spend a Shift to Craft, you can spend Mana to supplement Materials at a rate of 5s per Mana spent."
  },
  {
    name: "Archaeologist",
    prereq: "Stat: RSN 4+ | Trained: Craft",
    description: "Checks and Saves you make against traps have Favor and, if you are subjected to a Curse, you can make a Will Save to instantly break the curse's hold on you."
  },
  {
    name: "Assured Healer",
    prereq: "Spell: Life",
    description: "Healing rolls of your Spells explode on a 1."
  },
  {
    name: "Athame",
    prereq: "Trained: Arcana or Mysticism",
    description: "You can perform a 10 minute Ritual with a dagger, making it your athame until you conduct this ritual again. Your athame is a Relic with the Loyalty Power, and it can be used as a Trinket."
  },
  {
    name: "Bookworm",
    prereq: "Stat: RSN 4+",
    description: "You gain an extra Studied die when you Study. You can take this Perk multiple times."
  },
  {
    name: "Botanical Mediciner",
    prereq: "Trained: Medicine & Survival",
    description: "You can restore d6 HP to a willing Being during a Breather if you have herbs. If you do, you can also remove a Status from the Ally from either Blinded, Paralyzed, or Sickened. That Being can't be affected by this Ability for the rest of the Shift."
  },
  {
    name: "Briar Healer",
    prereq: "Spell: Life",
    description: "The Target of your Life Spell gains a cloak of ethereal thorns while you Focus on it, giving it +1 Armor and dealing d6 to any Being who damages them with a Melee Attack."
  },
  {
    name: "Bully",
    prereq: "Stat: MIT 4+ | Trained: Brawl",
    description: "Checks you make to Grapple or Shove Targets that are smaller than you are Favored, and you can use them as a greatclub with the Brawl property that deals its damage to both the Target and itself on a hit. Your attacks with it count as maintaining the grapple."
  },
  {
    name: "Cardistry",
    prereq: "Spell: Any | Stat: DEX 4+",
    description: "You can use a deck of cards as a Trinket and can make attacks with cards drawn from a deck using your Cast Skill. The Deck must be used as a 2H Grip Weapon to do so. It deals d4, and has the Finesse and Thrown properties. Cards used for an attack magically reappear in the deck."
  },
  {
    name: "Cat-Like Reflexes",
    prereq: "Stat: DEX 4+ | Trained: Finesse",
    description: "You reduce any fall damage you take by half and, while you are Prone, you can stand up using only 5 feet of Speed."
  },
  {
    name: "Check Hook",
    prereq: "Stat: DEX 4+ | Trained: Brawl",
    description: "Once per Round, you can make one attack with a Brawl Weapon you have Equipped if a Close Enemy Moves or Attacks (no Action)."
  },
  {
    name: "Chicanery",
    prereq: "Stat: DEX 4+ | Trained: Sneak",
    description: "If you fail a Check, it doesn't alert Beings to your presence, or advance relevant Progress Clocks being tracked."
  },
  {
    name: "Combat Medic",
    prereq: "Stat: RSN 4+ | Trained: Medicine",
    description: "As an Action, you can tend to a willing Being's injuries. Doing so removes the Sickened Status if they have it and they regain (d6 + your Reason) HP. That Being can't be affected by this Ability for the rest of the Shift."
  },
  {
    name: "Deft Hands",
    prereq: "Stat: DEX 4+ | Trained: Finesse",
    description: "You can skip your Move to take the Use Action."
  },
  {
    name: "Diplomat",
    prereq: "Stat: PRS 4+ | Trained: Leadership",
    description: "You have Favor on Leadership Checks to negotiate and parley if you have not dealt damage to the Target in the last minute."
  },
  {
    name: "Drunken Master",
    prereq: "Trained: Brawl & Finesse",
    description: "1H Crude Weapons have the Finesse property for you."
  },
  {
    name: "Duelist",
    prereq: "Stat: DEX 4+ | Trained: Melee",
    description: "While Dual-Wielding, you can Move up to half your Speed when you skip your Move to make an attack, and you Dodge attacks with Favor if you and the attacker are the only Beings Close to each other."
  },
  {
    name: "Endless Stamina",
    prereq: "Stat: MIT 4+ | Trained: Brawl",
    description: "Fatigue doesn't prevent you from taking the Rush Action and, once per day, you can remove 1 Fatigue during a Breather."
  },
  {
    name: "Extrovert",
    prereq: "Stat: PRS 4+ | Trained: Influence",
    description: "Once per Day, you gain a Studied die if you meet a new friendly person."
  },
  {
    name: "Fallaway Reverse",
    prereq: "Stat: DEX 4+ | Trained: Finesse",
    description: "If you Crit to Dodge a Melee Attack, the attacker falls Prone."
  },
  {
    name: "Familiar",
    prereq: "Trained: Arcana or Mysticism",
    description: "You can perform a 10 minute Ritual to conjure a familiar, a loyal Ally to you that you control. The familiar can be any Small Being with HD: 1. It uses your Cast Skill for Checks and Saves, and you can Cast Spells using the familiar as a conduit for your Magic. If you do, you can deliver the Spell from the familiar as if it were originating from you. The familiar is banished when it drops to 0 HP or if you conduct this Ritual again to create another familiar."
  },
  {
    name: "Full Swing",
    prereq: "Stat: MIT 4+ | Trained: Melee",
    description: "When you make a Melee Attack Check and roll 10 above your Melee Difficulty, you can choose to push the Target as if you had shoved them if they are no more than one size larger than you."
  },
  {
    name: "Gish",
    prereq: "Spell: Any | Trained: Melee or Ranged",
    description: "You can use Weapons as trinkets to Cast and, when you Cast with a Delivery of Imbue on a Weapon you have Equipped, you can make an attack with the weapon with the same Action."
  },
  {
    name: "Grim Harvest",
    prereq: "Spell: Raise",
    description: "When one of your Spells kills an Enemy that is not an Artificial or Undead, you regain HP equal to the damage of the Spell."
  },
  {
    name: "Guardian Angel",
    prereq: "Stat: AWR 4+ | Trained: Melee or Ranged",
    description: "Once per Round, if one of your Allies is Targeted by an Enemy, you can spend 1 Luck to make an attack against that Enemy. If you hit, your Ally has Favor on any Save forced by that Enemy this Turn."
  },
  {
    name: "Harmonic Resonance",
    prereq: "Spell: Any | Trained: Performance",
    description: "You can use a Musical Instrument as a Trinket. When you do, you can Cast with a delivery of Aura or Cone if you otherwise couldn't, and you spend 1 less Mana on Aura and Cone delivery. This Casting still creates sound."
  },
  {
    name: "Heavy Arms",
    prereq: "Stat: MIT 4+ | Trained: Melee",
    description: "While you have a weapon held as 2H Grip, its damage rolls explode on a 1. For the purpose of this Perk, Fist Grip counts as 2H Grip."
  },
  {
    name: "Heightened Cognition",
    prereq: "Stat: AWR 7",
    description: "You can spend a Studied die to pass a Detect, Mysticism, or Survival Check you fail."
  },
  {
    name: "Heightened Magnetism",
    prereq: "Stat: PRS 7",
    description: "You can spend a Luck to pass an Influence, Leadership, or Performance Check you fail."
  },
  {
    name: "Heightened Reason",
    prereq: "Stat: RSN 7",
    description: "You can spend a Studied die to pass an Arcana, Craft, or Medicine Check you fail."
  },
  {
    name: "Ice Knife",
    prereq: "Spell: Freeze",
    description: "Ice Objects you create with Freeze last for up to 1 minute without requiring Focus."
  },
  {
    name: "Impersonator",
    prereq: "Stat: PRS 4+ | Trained: Influence",
    description: "You can unerringly imitate the voice of any Humanlike you have heard speak."
  },
  {
    name: "Infesting Burst",
    prereq: "Spell: Raise",
    description: "When you create an Undead with Raise, you can choose to raise them up as a Boomer."
  },
  {
    name: "Infravision",
    prereq: "Stat: AWR 4+ | Trained: Detect",
    description: "You gain Darksight."
  },
  {
    name: "Inspiring Presence",
    prereq: "Stat: PRS 4+ | Trained: Leadership",
    description: "If any of your Allies are Berserk, Charmed, Confused, or Frightened by an effect that ends on a Countdown die, you can use your Action to attempt to rally them and make a Leadership Check. If you pass, the Countdown die for the effect decreases by 1 size."
  },
  {
    name: "Interceptor",
    prereq: "Stat: AWR 4+ | Trained: Melee",
    description: "Once per Round, you can make one attack on an Off-Turn against a Close Enemy that begins to Move out of your reach."
  },
  {
    name: "Knife Juggler",
    prereq: "Stat: DEX 4+ | Trained: Finesse",
    description: "You treat 1H Thrown Weapons as 0 Slot for occupying your Item Slots, and can draw one as part of an attack with it."
  },
  {
    name: "Limit Break",
    prereq: "Stat: MIT 7",
    description: "Once per Combat, when you are dropped below half HP and aren't Fatigued, you can take another Action on your next Turn."
  },
  {
    name: "Mage Slayer",
    prereq: "Trained: Arcana or Mysticism",
    description: "When you damage a Focusing Being, the damage rolls can explode and, if the result of your d20 roll on the Check is 10 or higher than your Difficulty, the Focus ends."
  },
  {
    name: "Magical Secret",
    prereq: "Trained: Arcana, Influence, or Mysticism",
    description: "Choose a Spell. You learn the Spell and can Cast it using a Skill of your choice. You can take this Perk multiple times."
  },
  {
    name: "Marksmanship",
    prereq: "Stat: AWR 7 | Trained: Ranged",
    description: "The damage dice for your Ranged Weapon attacks are one size larger."
  },
  {
    name: "Master Artisan",
    prereq: "Stat: RSN 4+ | Trained: Craft",
    description: "When you spend a Shift to Craft, it puts two Shifts worth of work towards making the Item, rather than one."
  },
  {
    name: "Master Breaker",
    prereq: "Stat: DEX 4+ | Trained: Finesse",
    description: "If you fail a Finesse Check to pick a lock, your lockpick isn't broken and you make Saves against traps it triggers with Favor."
  },
  {
    name: "Master Chef",
    prereq: "Stat: PRS 4+ | Trained: Survival",
    description: "During a Scene where you have cooking tools, you can cook meals using 5s worth of Materials. Doing so makes d6+1 rations which restore d6 HP to anyone who eats one as part of a Breather. They function as normal rations after a Shift."
  },
  {
    name: "Medium",
    prereq: "Stat: AWR 4+ | Trained: Mysticism",
    description: "You can conduct a 10 minute Ritual to ask up to 3 questions from the GM which can only be answered with a \"yes\" or \"no.\" The Fates are the source of the information, and will answer these questions truthfully (if possible). Afterward, you can't conduct this Ritual until you complete a Quest."
  },
  {
    name: "Mesmer",
    prereq: "Spell: Charm",
    description: "If you pass a Cast Check by 10 or more to cause a Target to be Charmed or Frightened, you can also cause it to act in one of the following ways in a manner of your choice on its next Turn: Move up to half its Speed. Attack a Target (it can attack itself). Drop or pick up an Item."
  },
  {
    name: "Metamagic",
    prereq: "Resource: Maximum Mana 7+",
    description: "The Maximum Mana you can spend on a Spell increases by 1. You can take this Perk multiple times."
  },
  {
    name: "Mithridatism",
    prereq: "Stat: MIT 4+ | Trained: Medicine",
    description: "Your Saves against Sickened are Favored, and you reduce Poison-based damage you take by 2 per die of the effect."
  },
  {
    name: "Moonlight Sonata",
    prereq: "Spell: Light",
    description: "You can cause for the light shed by your Spells to be Moonlight."
  },
  {
    name: "Mounted Combatant",
    prereq: "Stat: MIT 4+ | Trained: Survival",
    description: "Any Check you make to avoid falling off a mount is Favored, and you can wield Weapons with the Versatile Grip as 1H while riding a mount and get the benefits of them being wielded in both hands."
  },
  {
    name: "Necromancer",
    prereq: "Spell: Raise",
    description: "When you Focus on Raise, you can choose an Undead you control. The Target regains HP equal to (half your Level)."
  },
  {
    name: "New Training",
    prereq: "Prerequisite: -",
    description: "You gain a Training. You can take this Perk multiple times."
  },
  {
    name: "Owl-Blasted",
    prereq: "Spell: Charm",
    description: "If you spend Mana to attempt to cause a Being to be Charmed and the Check fails, you regain d4 Mana that was spent on the Casting."
  },
  {
    name: "Pack Mule",
    prereq: "Stat: MIT 4+ | Trained: Brawl",
    description: "You gain +2 Item Slots. You can take this Perk multiple times."
  },
  {
    name: "Padfoot",
    prereq: "Stat: AWR 4+ | Trained: Survival",
    description: "Once per Day, you gain a Studied die when you Travel 6 miles or more."
  },
  {
    name: "Panache",
    prereq: "Stat: DEX 4+ | Trained: Melee",
    description: "If you hit an Enemy with a Melee attack, the next Save you make against an attack before the start of your next Turn is Favored."
  },
  {
    name: "Patience",
    prereq: "Stat: MIT 4+ | Trained: Detect",
    description: "When you Hold to Attack, your next Endure Save to Block before your next Turn is Favored."
  },
  {
    name: "Peerless Athlete",
    prereq: "Stat: MIT 4+ | Trained: Brawl",
    description: "You can stand from Prone at the start of your Turn (no Action), and you can Rush and Jump with the same Action."
  },
  {
    name: "Perfect Parry",
    prereq: "Stat: MIT 4+ | Trained: Brawl or Melee",
    description: "If you Crit to Block an attack, the attacker is Vulnerable until the end of your next Turn."
  },
  {
    name: "Poisoner",
    prereq: "Stat: DEX 4+ | Trained: Finesse",
    description: "You can coat your Equipped Weapon with a poison when you attack with it."
  },
  {
    name: "Primordial Summoner",
    prereq: "Trained: Arcana or Mysticism",
    description: "You can conduct a 10 minute Ritual to conjure a Primordial with Hit Dice no higher than (half your Level, round up). It obeys your commands, which you can issue as an Action or by skipping your Move. Otherwise, it attacks your Enemies using your Cast Skill for its Checks and Saves. If you use this Feature to conjure another Primordial, the previous one is banished."
  },
  {
    name: "Protector",
    prereq: "Stat: MIT 4+ | Trained: Melee",
    description: "You can Block on behalf of an Ally that fails their Save against the attack of an Enemy that is Close to you."
  },
  {
    name: "Provoker",
    prereq: "Stat: PRS 4+ | Trained: Influence",
    description: "You can use your Action to intimidate or otherwise goad an Enemy that can see or hear you. When you do, your Allies make all Saves provoked by that Enemy's Attacks with Favor until the start of your Group's next Turn."
  },
  {
    name: "Rally",
    prereq: "Stat: PRS 4+ | Trained: Leadership",
    description: "Once per Shift, you can give an inspirational speech, or otherwise boost the morale of your Allies. Doing so requires an Action and grants them all 1 Luck and ends a Status affecting them from either Charmed or Frightened."
  },
  {
    name: "Re-Animator",
    prereq: "Trained: Craft & either Arcana or Mysticism",
    description: "You can perform a 10 minute Ritual with the corpse of a non-Artificial or Undead Being with HD no higher than your Level, raising it as an Undead as per the Raise Spell. It is under your control for one Shift, or until you perform this Ritual again. You can command it during your Turn (no Action), and it uses your Craft Skill for Checks it makes."
  },
  {
    name: "Resourceful",
    prereq: "Stat: LUK 4+ | Trained: Craft",
    description: "You can spend 1 Luck to recall having packed an Item in your inventory with a value as high as 50s. It doesn't \"appear,\" it was always there."
  },
  {
    name: "Sage",
    prereq: "Stat: RSN 4+",
    description: "As an Action, you can grant an Ally one of your Studied Dice if they can see or hear you."
  },
  {
    name: "Salbenist",
    prereq: "Trained: Craft & Mysticism",
    description: "You can perform a 10 minute Ritual with a Weapon and an oil. Upon concluding the Ritual, you gain the following benefits until you perform it again: You can attack with it using Craft. You can will the absorbed oil to coat it on your Turn (no Action). This doesn't consume it, and it remains coated until you dismiss it, it leaves your hand, or until it is coated with another oil."
  },
  {
    name: "Scout",
    prereq: "Trained: Detect & Survival",
    description: "Your Survival Checks to Navigate during Travel have Favor and, if you choose to Hunt, you can roll for the discovered game twice and use the roll of your choice."
  },
  {
    name: "Scrapper's Delight",
    prereq: "Trained: Arcana & Craft",
    description: "You can conduct a 10 minute Ritual to magically break down an unsecured Item you touch throughout the ritual. The Item must be nonmagical, it must have a value of at least 5s, and can occupy no more than 2 Slots. The Item becomes raw materials of a value equal to 5s per 1 Slot it occupies of its original form."
  },
  {
    name: "Second Wind",
    prereq: "Stat: MIT 4+ | Trained: Brawl",
    description: "Once per Combat, you can use your Action or skip your Move to regain (d6 + Might) HP."
  },
  {
    name: "Secret of Mana",
    prereq: "Spell: Any",
    description: "You gain 1 Mana per Level you have, and gain 1 Mana each time you gain a Level. You can take this Perk multiple times."
  },
  {
    name: "Sentinel",
    prereq: "Stat: MIT 4+ | Trained: Melee",
    description: "Enemies you hit with a Melee Attack can't Move for the rest of the Turn."
  },
  {
    name: "Shapechanger",
    prereq: "Spell: Polymorph",
    description: "When you are a Target of your Polymorph Spell, you use your Cast Skill for its Actions, and it doesn't cost you Mana to Focus on it as per the Spell's description."
  },
  {
    name: "Singer",
    prereq: "Stat: PRS 4+ | Trained: Performance",
    description: "You can use your voice as a Musical Instrument. If you are capable of singing, you are considered to have a Musical Instrument Equipped."
  },
  {
    name: "Sixth Sense",
    prereq: "Stat: AWR 6+ | Trained: Detect",
    description: "You ignore the Blinded Status for sight-based Checks and Saves."
  },
  {
    name: "Skirmisher",
    prereq: "Stat: DEX 4+ | Trained: Melee",
    description: "While you have Light Armor or no armor Equipped, you have a 5 foot bonus to Speed."
  },
  {
    name: "Smooth Talker",
    prereq: "Stat: PRS 4+ | Trained: Influence",
    description: "Once per Scene, if you fail an Influence Check made to interact with a Being who understands you, you can reroll it."
  },
  {
    name: "Snareroot Trapper",
    prereq: "Spell: Sprout",
    description: "You can Cast Sprout with a Glyph delivery for no additional Mana and without Focusing. You can have one Casting of Sprout active this way."
  },
  {
    name: "Solar Flare",
    prereq: "Spell: Light",
    description: "You can cause the light shed by Spells you Cast to be Sunlight."
  },
  {
    name: "Spin-to-Win",
    prereq: "Stat: MIT 4+ | Trained: Melee",
    description: "When you attack with a Melee Cleave weapon, you can deal half its damage to any viable Targets, rather than just one extra Being."
  },
  {
    name: "Steady Aim",
    prereq: "Trained: Detect & Ranged",
    description: "You ignore Hinder on Ranged Weapon attacks if you can see the Target, and have Favor on Ranged Checks against Targets who haven't moved since the end of your last Turn."
  },
  {
    name: "Storm Raiser",
    prereq: "Stat: AWR 4+ | Trained: Mysticism",
    description: "Once per Day, you can perform a 10 minute Ritual to change the weather in the surrounding 1-mile radius. This change is strong enough to cause or end heavy storms."
  },
  {
    name: "Strategist",
    prereq: "Stat: AWR 4+ | Trained: Leadership",
    description: "Your attacks against Targets that are Close to at least one of your Allies are Favored if that Ally isn't Incapacitated."
  },
  {
    name: "Tactician",
    prereq: "Stat: RSN 4+ | Trained: Leadership",
    description: "You can use your Action or skip your Move to issue an order, choosing from the following list. The benefits of a command you issue last for the Combat or until you issue another order: Attack: Declare a Target Enemy. Attack and Cast Checks against it ignore Hinder. Defend: You and your Allies' Saves against attacks can't be Hindered. Retreat: Your Allies that use their Action to Rush and end their Turn further away from any Enemies than they started have Favor on Saves against attacks that Round."
  },
  {
    name: "Telepath",
    prereq: "Stat: RSN 7",
    description: "While you aren't Unconscious, you can communicate with any Being you can see through Telepathy by Focusing on this Ability."
  },
  {
    name: "Transvection",
    prereq: "Spell: Levitate",
    description: "If you Cast Levitate to give an Item of 2 Slots or less a Fly Speed of 30 ft., you do not need to Focus on that Cast. It remains Imbued until you Imbue another Item this way."
  },
  {
    name: "Treads Lightly",
    prereq: "Stat: DEX 4+",
    description: "Your Speed isn't impeded by nonmagical Difficult Terrain, and you don't trigger traps by walking on them."
  },
  {
    name: "Unfailing Guidance",
    prereq: "Spell: Guide",
    description: "If the Target of your Guide Spell forces one of your Allies to make a Hindered Save, the Hinder is ignored if the Ally can see you."
  },
  {
    name: "Ungarmax",
    prereq: "Spell: Apoplex",
    description: "Allies you cause to be Berserk with Apoplex gain a +1 bonus to each damage die used for their attacks."
  },
  {
    name: "Vehement Magic",
    prereq: "Spell: Any",
    description: "Damage rolls from Spells you Cast explode on a roll of 1."
  },
  {
    name: "Vigilance",
    prereq: "Stat: MIT 4+ | Trained: Detect",
    description: "You don't need to sleep to gain the benefits of a Rest, but you can't remove Fatigue without normal Rest."
  },
  {
    name: "Vituperation",
    prereq: "Stat: PRS 4+ | Trained: Influence",
    description: "You can use your Action or skip your Move to rebuke an Enemy, and make an Influence Check with a penalty equal to the Target's Morale. If you pass, that Enemy is Vulnerable until your next Turn or until it deals damage."
  },
  {
    name: "Wander the Wooded",
    prereq: "Stat: DEX 4+ | Trained: Survival",
    description: "Natural Difficult Terrain doesn't impede your Speed, and Saves you make against natural hazards (such as avalanches or extreme heat) are Favored."
  },
  {
    name: "Water Walker",
    prereq: "Spell: Aqua",
    description: "While you aren't Incapacitated, you can walk on water."
  },
  {
    name: "Witchsight",
    prereq: "Stat: AWR 4+ | Trained: Arcana or Mysticism",
    description: "You make Checks against illusions with Favor and you can see Invisible Beings if you aren't otherwise Blinded."
  }
];

// Generate all perks
let generated = 0;
let skipped = 0;

for (const perk of PERKS) {
  const fileName = toKebabCase(perk.name) + '.json';
  const filePath = path.join(PERKS_DIR, fileName);

  // Skip already created perks
  if (SKIP_PERKS.includes(toKebabCase(perk.name))) {
    console.log(`⏭️  Skipping ${perk.name} (already exists)`);
    skipped++;
    continue;
  }

  const perkData = createPerkJSON(perk.name, perk.prereq, perk.description);
  fs.writeFileSync(filePath, JSON.stringify(perkData, null, 2) + '\n');

  console.log(`✅ Generated ${fileName}`);
  generated++;
}

console.log(`\n🎉 Complete! Generated ${generated} perks, skipped ${skipped} existing perks.`);
