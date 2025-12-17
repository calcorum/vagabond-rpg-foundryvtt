/**
 * Active Effects Helper Module
 *
 * Provides utilities for managing Active Effects in Vagabond RPG.
 * Active Effects allow items (classes, perks, features) to modify actor stats,
 * crit thresholds, resources, and other values.
 *
 * Key Use Cases:
 * - Class features modifying crit thresholds for specific skills
 * - Perks adding bonuses to stats or saves
 * - Equipment providing armor or stat bonuses
 * - Conditions applying temporary penalties
 */

/**
 * Effect modes matching Foundry's CONST.ACTIVE_EFFECT_MODES
 */
export const EFFECT_MODES = {
  CUSTOM: 0,
  MULTIPLY: 1,
  ADD: 2,
  DOWNGRADE: 3,
  UPGRADE: 4,
  OVERRIDE: 5,
};

/**
 * Common effect change keys for Vagabond RPG
 * Maps human-readable names to data paths
 */
export const EFFECT_KEYS = {
  // Stats
  "stat.might": "system.stats.might.value",
  "stat.dexterity": "system.stats.dexterity.value",
  "stat.awareness": "system.stats.awareness.value",
  "stat.reason": "system.stats.reason.value",
  "stat.presence": "system.stats.presence.value",
  "stat.luck": "system.stats.luck.value",

  // Resources
  "hp.bonus": "system.resources.hp.bonus",
  "mana.bonus": "system.resources.mana.bonus",
  "mana.castingMax": "system.resources.mana.castingMax",
  "luck.max": "system.resources.luck.max",
  "studiedDice.max": "system.resources.studiedDice.max",

  // Movement speeds
  "speed.walk": "system.speed.walk",
  "speed.fly": "system.speed.fly",
  "speed.swim": "system.speed.swim",
  "speed.climb": "system.speed.climb",
  "speed.burrow": "system.speed.burrow",
  "speed.bonus": "system.speed.bonus",
  armor: "system.armor",
  "itemSlots.bonus": "system.itemSlots.bonus",

  // Save bonuses (reduce difficulty)
  "save.reflex": "system.saves.reflex.bonus",
  "save.endure": "system.saves.endure.bonus",
  "save.will": "system.saves.will.bonus",

  // Skill crit thresholds
  "crit.arcana": "system.skills.arcana.critThreshold",
  "crit.brawl": "system.skills.brawl.critThreshold",
  "crit.craft": "system.skills.craft.critThreshold",
  "crit.detect": "system.skills.detect.critThreshold",
  "crit.finesse": "system.skills.finesse.critThreshold",
  "crit.influence": "system.skills.influence.critThreshold",
  "crit.leadership": "system.skills.leadership.critThreshold",
  "crit.medicine": "system.skills.medicine.critThreshold",
  "crit.mysticism": "system.skills.mysticism.critThreshold",
  "crit.performance": "system.skills.performance.critThreshold",
  "crit.sneak": "system.skills.sneak.critThreshold",
  "crit.survival": "system.skills.survival.critThreshold",

  // Attack crit thresholds
  "crit.attack.melee": "system.attacks.melee.critThreshold",
  "crit.attack.brawl": "system.attacks.brawl.critThreshold",
  "crit.attack.ranged": "system.attacks.ranged.critThreshold",
  "crit.attack.finesse": "system.attacks.finesse.critThreshold",

  // Senses (boolean, use OVERRIDE mode=5)
  "sense.darkvision": "system.senses.darkvision",
  "sense.blindsight": "system.senses.blindsight",
  "sense.allsight": "system.senses.allsight",
  "sense.echolocation": "system.senses.echolocation",
  "sense.seismicsense": "system.senses.seismicsense",
  "sense.telepathy": "system.senses.telepathy",

  // Movement capabilities (boolean, use OVERRIDE mode=5)
  "movement.fly": "system.movement.fly",
  "movement.swim": "system.movement.swim",
  "movement.climb": "system.movement.climb",
  "movement.cling": "system.movement.cling",
  "movement.phase": "system.movement.phase",

  // Skill training (boolean, use OVERRIDE mode=5)
  "skill.arcana.trained": "system.skills.arcana.trained",
  "skill.brawl.trained": "system.skills.brawl.trained",
  "skill.craft.trained": "system.skills.craft.trained",
  "skill.detect.trained": "system.skills.detect.trained",
  "skill.finesse.trained": "system.skills.finesse.trained",
  "skill.influence.trained": "system.skills.influence.trained",
  "skill.leadership.trained": "system.skills.leadership.trained",
  "skill.medicine.trained": "system.skills.medicine.trained",
  "skill.mysticism.trained": "system.skills.mysticism.trained",
  "skill.performance.trained": "system.skills.performance.trained",
  "skill.sneak.trained": "system.skills.sneak.trained",
  "skill.survival.trained": "system.skills.survival.trained",

  // Focus tracking
  "focus.maxConcurrent": "system.focus.maxConcurrent",
};

/**
 * Create an Active Effect data object from a simplified definition.
 *
 * @param {Object} options - Effect options
 * @param {string} options.name - Display name of the effect
 * @param {string} options.icon - Icon path
 * @param {Array} options.changes - Array of {key, value, mode} objects
 * @param {boolean} options.disabled - Whether effect starts disabled
 * @param {string} options.origin - UUID of the source item
 * @returns {Object} Active Effect data object
 */
export function createEffectData({
  name,
  icon = "icons/svg/aura.svg",
  changes = [],
  disabled = false,
  origin = null,
}) {
  // Convert simplified keys to full data paths
  const mappedChanges = changes.map((change) => ({
    key: EFFECT_KEYS[change.key] || change.key,
    mode: change.mode ?? EFFECT_MODES.ADD,
    value: String(change.value),
    priority: change.priority ?? null,
  }));

  return {
    name,
    icon,
    changes: mappedChanges,
    disabled,
    origin,
    transfer: true, // Transfer to actor when item is owned
  };
}

/**
 * Create a crit threshold reduction effect.
 * Common for class features that improve crits on specific skills.
 *
 * @param {string} skillOrAttack - Skill ID or "attack.type"
 * @param {number} reduction - Amount to reduce crit threshold (positive number)
 * @param {string} name - Display name
 * @param {string} origin - Source item UUID
 * @returns {Object} Active Effect data
 */
export function createCritReductionEffect(skillOrAttack, reduction, name, origin = null) {
  const key = skillOrAttack.startsWith("attack.")
    ? `crit.${skillOrAttack}`
    : `crit.${skillOrAttack}`;

  return createEffectData({
    name,
    icon: "icons/svg/sword.svg",
    changes: [
      {
        key,
        value: -Math.abs(reduction), // Negative to reduce threshold
        mode: EFFECT_MODES.ADD,
      },
    ],
    origin,
  });
}

/**
 * Create a stat bonus effect.
 *
 * @param {string} stat - Stat ID (might, dexterity, etc.)
 * @param {number} bonus - Bonus amount
 * @param {string} name - Display name
 * @param {string} origin - Source item UUID
 * @returns {Object} Active Effect data
 */
export function createStatBonusEffect(stat, bonus, name, origin = null) {
  return createEffectData({
    name,
    icon: "icons/svg/upgrade.svg",
    changes: [
      {
        key: `stat.${stat}`,
        value: bonus,
        mode: EFFECT_MODES.ADD,
      },
    ],
    origin,
  });
}

/**
 * Create a save bonus effect.
 *
 * @param {string} save - Save type (reflex, endure, will)
 * @param {number} bonus - Bonus amount (reduces difficulty)
 * @param {string} name - Display name
 * @param {string} origin - Source item UUID
 * @returns {Object} Active Effect data
 */
export function createSaveBonusEffect(save, bonus, name, origin = null) {
  return createEffectData({
    name,
    icon: "icons/svg/shield.svg",
    changes: [
      {
        key: `save.${save}`,
        value: bonus,
        mode: EFFECT_MODES.ADD,
      },
    ],
    origin,
  });
}

/**
 * Apply effects from an item to its parent actor.
 * Called when items with changes are added to an actor.
 *
 * @param {Item} item - The item with effects to apply
 * @returns {Promise<ActiveEffect[]>} Created effects
 */
export async function applyItemEffects(item) {
  const actor = item.parent;
  if (!actor || !item.system.changes?.length) return [];

  const effectData = createEffectData({
    name: item.name,
    icon: item.img,
    changes: item.system.changes,
    origin: item.uuid,
  });

  return actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
}

/**
 * Remove effects originating from a specific item.
 *
 * @param {Actor} actor - The actor to remove effects from
 * @param {string} itemUuid - UUID of the source item
 * @returns {Promise<void>}
 */
export async function removeItemEffects(actor, itemUuid) {
  const effects = actor.effects.filter((e) => e.origin === itemUuid);
  if (effects.length) {
    const ids = effects.map((e) => e.id);
    await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/**
 * Get all effects on an actor grouped by source type.
 *
 * @param {Actor} actor - The actor to analyze
 * @returns {Object} Effects grouped by source (class, perk, feature, equipment, other)
 */
export function getEffectsBySource(actor) {
  const grouped = {
    class: [],
    perk: [],
    feature: [],
    equipment: [],
    temporary: [],
    other: [],
  };

  for (const effect of actor.effects) {
    if (!effect.origin) {
      grouped.temporary.push(effect);
      continue;
    }

    // Try to determine source type from origin UUID
    const sourceItem = fromUuidSync(effect.origin);
    if (sourceItem) {
      const type = sourceItem.type;
      if (grouped[type]) {
        grouped[type].push(effect);
      } else {
        grouped.other.push(effect);
      }
    } else {
      grouped.other.push(effect);
    }
  }

  return grouped;
}
