/**
 * Vagabond RPG Configuration
 * Contains all system constants and configuration data
 */

export const VAGABOND = {};

/**
 * The set of Ability Scores (Stats) used within the system
 */
VAGABOND.stats = {
  might: "VAGABOND.StatMight",
  dexterity: "VAGABOND.StatDexterity",
  awareness: "VAGABOND.StatAwareness",
  reason: "VAGABOND.StatReason",
  presence: "VAGABOND.StatPresence",
  luck: "VAGABOND.StatLuck"
};

/**
 * Abbreviated stat labels
 */
VAGABOND.statsAbbr = {
  might: "VAGABOND.StatMightAbbr",
  dexterity: "VAGABOND.StatDexterityAbbr",
  awareness: "VAGABOND.StatAwarenessAbbr",
  reason: "VAGABOND.StatReasonAbbr",
  presence: "VAGABOND.StatPresenceAbbr",
  luck: "VAGABOND.StatLuckAbbr"
};

/**
 * Skills and their associated stats
 */
VAGABOND.skills = {
  arcana: { label: "VAGABOND.SkillArcana", stat: "reason" },
  brawl: { label: "VAGABOND.SkillBrawl", stat: "might" },
  craft: { label: "VAGABOND.SkillCraft", stat: "reason" },
  detect: { label: "VAGABOND.SkillDetect", stat: "awareness" },
  finesse: { label: "VAGABOND.SkillFinesse", stat: "dexterity" },
  influence: { label: "VAGABOND.SkillInfluence", stat: "presence" },
  leadership: { label: "VAGABOND.SkillLeadership", stat: "presence" },
  medicine: { label: "VAGABOND.SkillMedicine", stat: "reason" },
  mysticism: { label: "VAGABOND.SkillMysticism", stat: "awareness" },
  performance: { label: "VAGABOND.SkillPerformance", stat: "presence" },
  sneak: { label: "VAGABOND.SkillSneak", stat: "dexterity" },
  survival: { label: "VAGABOND.SkillSurvival", stat: "awareness" }
};

/**
 * Attack types and their associated stats
 */
VAGABOND.attackTypes = {
  melee: { label: "VAGABOND.AttackMelee", stat: "might" },
  brawl: { label: "VAGABOND.AttackBrawl", stat: "might" },
  ranged: { label: "VAGABOND.AttackRanged", stat: "awareness" },
  finesse: { label: "VAGABOND.AttackFinesse", stat: "dexterity" }
};

/**
 * Save types and their stat combinations
 */
VAGABOND.saves = {
  reflex: { label: "VAGABOND.SaveReflex", stats: ["dexterity", "awareness"] },
  endure: { label: "VAGABOND.SaveEndure", stats: ["might", "might"] },
  will: { label: "VAGABOND.SaveWill", stats: ["reason", "presence"] }
};

/**
 * Spell delivery types with base costs
 */
VAGABOND.spellDelivery = {
  touch: { label: "VAGABOND.DeliveryTouch", cost: 0 },
  remote: { label: "VAGABOND.DeliveryRemote", cost: 0 },
  imbue: { label: "VAGABOND.DeliveryImbue", cost: 0 },
  cube: { label: "VAGABOND.DeliveryCube", cost: 1 },
  aura: { label: "VAGABOND.DeliveryAura", cost: 2 },
  cone: { label: "VAGABOND.DeliveryCone", cost: 2 },
  glyph: { label: "VAGABOND.DeliveryGlyph", cost: 2 },
  line: { label: "VAGABOND.DeliveryLine", cost: 2 },
  sphere: { label: "VAGABOND.DeliverySphere", cost: 2 }
};

/**
 * Spell duration types
 */
VAGABOND.spellDuration = {
  instant: { label: "VAGABOND.DurationInstant", focus: false },
  focus: { label: "VAGABOND.DurationFocus", focus: true },
  continual: { label: "VAGABOND.DurationContinual", focus: false }
};

/**
 * Damage types
 */
VAGABOND.damageTypes = {
  blunt: "VAGABOND.DamageBlunt",
  slash: "VAGABOND.DamageSlash",
  pierce: "VAGABOND.DamagePierce",
  fire: "VAGABOND.DamageFire",
  cold: "VAGABOND.DamageCold",
  shock: "VAGABOND.DamageShock",
  poison: "VAGABOND.DamagePoison",
  acid: "VAGABOND.DamageAcid"
};

/**
 * Weapon properties
 */
VAGABOND.weaponProperties = {
  finesse: "VAGABOND.PropertyFinesse",
  thrown: "VAGABOND.PropertyThrown",
  cleave: "VAGABOND.PropertyCleave",
  reach: "VAGABOND.PropertyReach",
  loading: "VAGABOND.PropertyLoading",
  brawl: "VAGABOND.PropertyBrawl",
  crude: "VAGABOND.PropertyCrude",
  versatile: "VAGABOND.PropertyVersatile"
};

/**
 * Weapon grip types
 */
VAGABOND.gripTypes = {
  "1h": "VAGABOND.Grip1H",
  "2h": "VAGABOND.Grip2H",
  versatile: "VAGABOND.GripVersatile",
  fist: "VAGABOND.GripFist"
};

/**
 * Armor types
 */
VAGABOND.armorTypes = {
  light: "VAGABOND.ArmorLight",
  heavy: "VAGABOND.ArmorHeavy",
  shield: "VAGABOND.ArmorShield"
};

/**
 * Size categories
 */
VAGABOND.sizes = {
  small: "VAGABOND.SizeSmall",
  medium: "VAGABOND.SizeMedium",
  large: "VAGABOND.SizeLarge",
  huge: "VAGABOND.SizeHuge",
  giant: "VAGABOND.SizeGiant",
  colossal: "VAGABOND.SizeColossal"
};

/**
 * Being types
 */
VAGABOND.beingTypes = {
  humanlike: "VAGABOND.BeingHumanlike",
  fae: "VAGABOND.BeingFae",
  cryptid: "VAGABOND.BeingCryptid",
  artificial: "VAGABOND.BeingArtificial",
  beast: "VAGABOND.BeingBeast",
  outer: "VAGABOND.BeingOuter",
  primordial: "VAGABOND.BeingPrimordial",
  undead: "VAGABOND.BeingUndead"
};

/**
 * Enemy zones for AI behavior
 */
VAGABOND.zones = {
  frontline: "VAGABOND.ZoneFrontline",
  midline: "VAGABOND.ZoneMidline",
  backline: "VAGABOND.ZoneBackline"
};

/**
 * Default crit threshold (Natural 20)
 */
VAGABOND.defaultCritThreshold = 20;

/**
 * Speed values by Dexterity
 */
VAGABOND.speedByDex = {
  2: 25,
  3: 25,
  4: 30,
  5: 30,
  6: 35,
  7: 35
};

/**
 * Max fatigue before death
 */
VAGABOND.maxFatigue = 5;

/**
 * Base item slots calculation
 */
VAGABOND.baseItemSlots = 8;
