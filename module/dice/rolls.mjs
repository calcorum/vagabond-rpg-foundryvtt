/**
 * Vagabond RPG Dice Rolling Module
 *
 * Provides specialized roll functions for the Vagabond RPG system.
 *
 * Core Mechanics:
 * - d20 checks: Roll d20 >= difficulty (20 - stat for untrained, 20 - stat×2 for trained)
 * - Favor: Add +d6 to the roll
 * - Hinder: Subtract d6 from the roll
 * - Crit: Roll >= critThreshold (default 20, can be lowered by class features)
 * - Exploding dice: d6! for certain abilities (reroll and add on max)
 * - Countdown dice: d6 → d4 → ends (for status effect durations)
 *
 * @module dice/rolls
 */

/**
 * Roll result object returned by roll functions.
 * @typedef {Object} VagabondRollResult
 * @property {Roll} roll - The Foundry Roll object
 * @property {number} total - The final roll total
 * @property {boolean} success - Whether the roll met/exceeded difficulty
 * @property {boolean} isCrit - Whether the roll was a critical success
 * @property {boolean} isFumble - Whether the roll was a natural 1
 * @property {number} d20Result - The natural d20 result
 * @property {number} favorDie - The favor/hinder d6 result (positive or negative)
 * @property {Object} details - Additional roll details
 */

/**
 * Perform a d20 skill/attack check.
 *
 * @param {Object} options - Roll options
 * @param {number} options.difficulty - Target difficulty number
 * @param {number} [options.critThreshold=20] - Crit on d20 >= this value
 * @param {number} [options.favorHinder=0] - Net favor/hinder (+1, 0, or -1)
 * @param {number} [options.modifier=0] - Flat modifier to add to roll
 * @param {Object} [options.rollData={}] - Data for roll formula evaluation
 * @returns {Promise<VagabondRollResult>} The roll result
 */
export async function d20Check({
  difficulty,
  critThreshold = 20,
  favorHinder = 0,
  modifier = 0,
  rollData = {},
} = {}) {
  // Build the roll formula
  let formula = "1d20";

  // Add favor (+d6) or hinder (-d6)
  if (favorHinder > 0) {
    formula += " + 1d6";
  } else if (favorHinder < 0) {
    formula += " - 1d6";
  }

  // Add flat modifier
  if (modifier !== 0) {
    formula += modifier > 0 ? ` + ${modifier}` : ` - ${Math.abs(modifier)}`;
  }

  // Create and evaluate the roll
  const roll = new Roll(formula, rollData);
  await roll.evaluate();

  // Extract the d20 result
  const d20Term = roll.terms.find((t) => t instanceof foundry.dice.terms.Die && t.faces === 20);
  const d20Result = d20Term?.results?.[0]?.result || 0;

  // Extract favor/hinder d6 if present
  let favorDie = 0;
  if (favorHinder !== 0) {
    const d6Term = roll.terms.find((t) => t instanceof foundry.dice.terms.Die && t.faces === 6);
    favorDie = d6Term?.results?.[0]?.result || 0;
    if (favorHinder < 0) favorDie = -favorDie;
  }

  // Determine success (total >= difficulty)
  const success = roll.total >= difficulty;

  // Determine critical (natural d20 >= critThreshold)
  const isCrit = d20Result >= critThreshold;

  // Determine fumble (natural 1)
  const isFumble = d20Result === 1;

  return {
    roll,
    total: roll.total,
    success,
    isCrit,
    isFumble,
    d20Result,
    favorDie,
    difficulty,
    critThreshold,
    details: {
      formula,
      modifier,
      favorHinder,
    },
  };
}

/**
 * Perform a skill check for an actor.
 *
 * @param {VagabondActor} actor - The actor making the check
 * @param {string} skillId - The skill key (e.g., "arcana", "brawl")
 * @param {Object} options - Additional options
 * @param {number} [options.modifier=0] - Situational modifier
 * @param {number} [options.favorHinder] - Override favor/hinder (otherwise calculated from actor)
 * @returns {Promise<VagabondRollResult>} The roll result
 */
export async function skillCheck(actor, skillId, options = {}) {
  const skillConfig = CONFIG.VAGABOND?.skills?.[skillId];
  if (!skillConfig) {
    throw new Error(`Unknown skill: ${skillId}`);
  }

  const system = actor.system;
  const skillData = system.skills?.[skillId];

  if (!skillData) {
    throw new Error(`Actor does not have skill: ${skillId}`);
  }

  // Use provided difficulty or calculate from stat and training
  let difficulty;
  if (options.difficulty !== undefined) {
    difficulty = options.difficulty;
  } else {
    const statKey = skillConfig.stat;
    const statValue = system.stats?.[statKey]?.value || 0;
    const trained = skillData.trained;
    difficulty = trained ? 20 - statValue * 2 : 20 - statValue;
  }
  const critThreshold = options.critThreshold ?? skillData.critThreshold ?? 20;

  // Determine favor/hinder from Active Effect flags or override
  const favorHinderResult = actor.getNetFavorHinder?.({ skillId }) ?? { net: 0 };
  const favorHinder = options.favorHinder ?? favorHinderResult.net;

  return d20Check({
    difficulty,
    critThreshold,
    favorHinder,
    modifier: options.modifier || 0,
    rollData: actor.getRollData(),
  });
}

/**
 * Perform an attack check for an actor with a weapon.
 *
 * @param {VagabondActor} actor - The actor making the attack
 * @param {VagabondItem} weapon - The weapon being used
 * @param {Object} options - Additional options
 * @param {number} [options.modifier=0] - Situational modifier
 * @param {number} [options.favorHinder] - Override favor/hinder
 * @returns {Promise<VagabondRollResult>} The roll result
 */
export async function attackCheck(actor, weapon, options = {}) {
  const attackType = weapon.system.attackType || "melee";
  const attackConfig = CONFIG.VAGABOND?.attackTypes?.[attackType];

  if (!attackConfig) {
    throw new Error(`Unknown attack type: ${attackType}`);
  }

  const system = actor.system;

  // Use weapon's getAttackStat() if available, otherwise fall back to config
  const statKey = weapon.system.getAttackStat?.() || attackConfig.stat;
  const statValue = system.stats?.[statKey]?.value || 0;

  // Attack difficulty = 20 - stat × 2 (attacks are always "trained")
  const difficulty = 20 - statValue * 2;

  // Get crit threshold: weapon override > actor attack data > default
  const actorCritThreshold = system.attacks?.[attackType]?.critThreshold || 20;
  const weaponCritThreshold = weapon.system.critThreshold;
  const critThreshold = weaponCritThreshold ?? actorCritThreshold;

  // Determine favor/hinder from Active Effect flags or override
  const favorHinderResult = actor.getNetFavorHinder?.({ isAttack: true }) ?? { net: 0 };
  const favorHinder = options.favorHinder ?? favorHinderResult.net;

  return d20Check({
    difficulty,
    critThreshold,
    favorHinder,
    modifier: options.modifier || 0,
    rollData: actor.getRollData(),
  });
}

/**
 * Perform a save roll for an actor.
 *
 * @param {VagabondActor} actor - The actor making the save
 * @param {string} saveType - The save type ("reflex", "endure", "will")
 * @param {number} difficulty - The target difficulty
 * @param {Object} options - Additional options
 * @param {boolean} [options.isBlock=false] - True if using Block (Reflex with shield)
 * @param {boolean} [options.isDodge=false] - True if using Dodge (Reflex)
 * @param {number} [options.favorHinder] - Override favor/hinder
 * @returns {Promise<VagabondRollResult>} The roll result
 */
export async function saveRoll(actor, saveType, difficulty, options = {}) {
  const saveConfig = CONFIG.VAGABOND?.saves?.[saveType];
  if (!saveConfig) {
    throw new Error(`Unknown save type: ${saveType}`);
  }

  // Determine favor/hinder from Active Effect flags or override
  const favorHinderResult = actor.getNetFavorHinder?.({ saveType }) ?? { net: 0 };
  const favorHinder = options.favorHinder ?? favorHinderResult.net;

  return d20Check({
    difficulty,
    critThreshold: 20, // Saves don't crit
    favorHinder,
    modifier: options.modifier || 0,
    rollData: actor.getRollData(),
  });
}

/**
 * Roll damage dice.
 *
 * @param {string} formula - The damage formula (e.g., "2d6", "1d8+3")
 * @param {Object} options - Roll options
 * @param {boolean} [options.isCrit=false] - Double the dice on crit
 * @param {Object} [options.rollData={}] - Data for roll formula evaluation
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function damageRoll(formula, options = {}) {
  const { isCrit = false, rollData = {} } = options;

  let rollFormula = formula;

  // On crit, double the dice (not modifiers)
  if (isCrit) {
    rollFormula = doubleDice(formula);
  }

  const roll = new Roll(rollFormula, rollData);
  await roll.evaluate();

  return roll;
}

/**
 * Double the dice in a formula (for crits).
 * "2d6+3" becomes "4d6+3"
 *
 * @param {string} formula - The original formula
 * @returns {string} Formula with doubled dice
 */
export function doubleDice(formula) {
  return formula.replace(
    /(\d+)d(\d+)/gi,
    (match, count, faces) => `${parseInt(count) * 2}d${faces}`
  );
}

/**
 * Roll exploding dice (d6!).
 * When max is rolled, add another die and keep rolling.
 *
 * @param {number} count - Number of d6 to roll
 * @param {Object} options - Roll options
 * @param {number} [options.maxExplosions=10] - Safety limit on explosions
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function explodingDice(count, _options = {}) {
  // Use Foundry's exploding dice syntax
  // Note: maxExplosions could be used for custom capping if needed
  const formula = `${count}d6x`;

  const roll = new Roll(formula);
  await roll.evaluate();

  return roll;
}

/**
 * Roll a countdown die and determine if effect continues.
 * Countdown: d6 → d4 → ends
 * Effect ends if roll is 1-2.
 *
 * @param {number} currentDie - Current die size (6 or 4)
 * @returns {Promise<Object>} Result with roll, continues, and nextDie
 */
export async function countdownRoll(currentDie) {
  if (currentDie <= 0) {
    return { roll: null, continues: false, nextDie: 0, ended: true };
  }

  const formula = `1d${currentDie}`;
  const roll = new Roll(formula);
  await roll.evaluate();

  const result = roll.total;

  // Effect ends on 1-2
  if (result <= 2) {
    // Shrink die: d6 → d4 → 0 (ended)
    const nextDie = currentDie === 6 ? 4 : 0;
    const ended = nextDie === 0;

    return {
      roll,
      result,
      continues: !ended,
      nextDie,
      ended,
      shrunk: !ended, // Die shrunk but didn't end
    };
  }

  // Effect continues with same die
  return {
    roll,
    result,
    continues: true,
    nextDie: currentDie,
    ended: false,
    shrunk: false,
  };
}

/**
 * Roll a morale check for an NPC.
 * 2d6 vs Morale score - fails if roll > morale.
 *
 * @param {VagabondActor} npc - The NPC making the check
 * @returns {Promise<Object>} Result with roll, passed, and morale
 */
export async function moraleCheck(npc) {
  if (npc.type !== "npc") {
    throw new Error("Morale checks are only for NPCs");
  }

  const morale = npc.system.morale || 7;

  const roll = new Roll("2d6");
  await roll.evaluate();

  const passed = roll.total <= morale;

  return {
    roll,
    total: roll.total,
    morale,
    passed,
    fled: !passed,
  };
}

/**
 * Roll the "appearing" dice for a monster type.
 *
 * @param {string} formula - The appearing formula (e.g., "1d6", "2d4")
 * @returns {Promise<Roll>} The evaluated roll
 */
export async function appearingRoll(formula) {
  const roll = new Roll(formula);
  await roll.evaluate();
  return roll;
}

/**
 * Create a chat message for a roll result.
 *
 * @param {VagabondRollResult} result - The roll result
 * @param {Object} options - Message options
 * @param {string} options.flavor - Message flavor text
 * @param {Actor} [options.speaker] - The speaking actor
 * @returns {Promise<ChatMessage>} The created chat message
 */
export async function sendRollToChat(result, options = {}) {
  const { flavor = "Roll", speaker } = options;

  // Build the message content
  let content = `<div class="vagabond roll-result">`;

  // Success/failure indicator
  if (result.success !== undefined) {
    const successClass = result.success ? "success" : "failure";
    const successText = result.success ? "Success" : "Failure";
    content += `<div class="roll-outcome ${successClass}">${successText}</div>`;
  }

  // Crit indicator
  if (result.isCrit) {
    content += `<div class="roll-crit">Critical!</div>`;
  }

  // Fumble indicator
  if (result.isFumble) {
    content += `<div class="roll-fumble">Fumble!</div>`;
  }

  // Roll details
  content += `<div class="roll-details">`;
  content += `<span class="roll-total">Total: ${result.total}</span>`;
  if (result.difficulty !== undefined) {
    content += ` <span class="roll-difficulty">vs DC ${result.difficulty}</span>`;
  }
  content += `</div>`;

  content += `</div>`;

  // Create the chat message with the roll
  const chatData = {
    user: game.user.id,
    speaker: speaker ? ChatMessage.getSpeaker({ actor: speaker }) : ChatMessage.getSpeaker(),
    flavor,
    content,
    rolls: [result.roll],
    type: CONST.CHAT_MESSAGE_STYLES.ROLL,
  };

  return ChatMessage.create(chatData);
}
