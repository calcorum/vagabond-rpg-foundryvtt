/**
 * VagabondActor Document Class
 *
 * Extended Actor document for Vagabond RPG system.
 * Provides document-level functionality including:
 * - Derived data preparation pipeline
 * - Item management (equipped items, inventory)
 * - Roll methods for skills, attacks, and saves
 * - Resource management helpers
 *
 * Data models (CharacterData, NPCData) handle schema and derived calculations.
 * This class handles document operations and Foundry integration.
 *
 * @extends Actor
 */
export default class VagabondActor extends Actor {
  /* -------------------------------------------- */
  /*  Document Lifecycle                          */
  /* -------------------------------------------- */

  /**
   * Handle actor updates. Detect level changes and update class features.
   *
   * @override
   */
  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);

    // Only process for the updating user
    if (game.user.id !== userId) return;

    // Check for level change on characters
    if (this.type === "character" && changed.system?.level !== undefined) {
      const newLevel = changed.system.level;
      const oldLevel = options._previousLevel ?? 1;

      if (newLevel !== oldLevel) {
        await this._onLevelChange(newLevel, oldLevel);
      }
    }
  }

  /**
   * Capture current level before update for comparison.
   *
   * @override
   */
  async _preUpdate(changed, options, userId) {
    await super._preUpdate(changed, options, userId);

    // Store current level for level change detection
    if (this.type === "character" && changed.system?.level !== undefined) {
      options._previousLevel = this.system.level;
    }
  }

  /**
   * Handle character level changes.
   * Updates class features for all owned class items.
   *
   * @param {number} newLevel - The new character level
   * @param {number} oldLevel - The previous character level
   * @private
   */
  async _onLevelChange(newLevel, oldLevel) {
    // Get all class items
    const classes = this.items.filter((i) => i.type === "class");

    // Update features for each class
    for (const classItem of classes) {
      await classItem.updateClassFeatures(newLevel, oldLevel);
    }
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare data for the actor.
   * This is called automatically by Foundry when the actor is loaded or updated.
   *
   * The preparation pipeline:
   * 1. prepareBaseData() - Set up data before embedded documents
   * 2. prepareEmbeddedDocuments() - Process owned items
   * 3. prepareDerivedData() - Calculate final derived values
   *
   * @override
   */
  prepareData() {
    // Call the parent class preparation
    super.prepareData();
  }

  /**
   * Prepare base data before embedded documents are processed.
   * Called by Foundry as part of the data preparation pipeline.
   *
   * @override
   */
  prepareBaseData() {
    super.prepareBaseData();
    // Base data is handled by the TypeDataModel (CharacterData/NPCData)
  }

  /**
   * Prepare derived data after embedded documents are processed.
   * This is where we calculate values that depend on owned items.
   *
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Type-specific derived data
    const actorType = this.type;
    if (actorType === "character") {
      this._prepareCharacterDerivedData();
    } else if (actorType === "npc") {
      this._prepareNPCDerivedData();
    }
  }

  /**
   * Prepare character-specific derived data.
   * Calculates values based on owned items (armor, weapons, etc.).
   *
   * @private
   */
  _prepareCharacterDerivedData() {
    const system = this.system;

    // Calculate armor from equipped armor items
    let totalArmor = 0;
    for (const item of this.items) {
      if (item.type === "armor" && item.system.equipped) {
        totalArmor += item.system.armorValue || 0;
      }
    }
    system.armor = totalArmor;

    // Calculate used item slots from inventory
    let usedSlots = 0;
    for (const item of this.items) {
      // Only count items that take slots (not features, classes, etc.)
      if (["weapon", "armor", "equipment"].includes(item.type)) {
        const slots = item.system.slots || 0;
        const quantity = item.system.quantity || 1;
        usedSlots += slots * quantity;
      }
    }
    system.itemSlots.used = usedSlots;

    // Recalculate overburdened status after slot calculation
    system.itemSlots.overburdened = system.itemSlots.used > system.itemSlots.max;
  }

  /**
   * Prepare NPC-specific derived data.
   *
   * @private
   */
  _prepareNPCDerivedData() {
    // NPC derived data is handled by NPCData.prepareDerivedData()
    // Add any document-level NPC calculations here if needed
  }

  /* -------------------------------------------- */
  /*  Roll Data                                   */
  /* -------------------------------------------- */

  /**
   * Get the roll data for this actor.
   * Includes all stats, resources, and item bonuses for use in Roll formulas.
   *
   * @override
   * @returns {Object} Roll data object
   */
  getRollData() {
    // Start with the system data
    const data = { ...super.getRollData() };

    // Add actor-level conveniences
    data.name = this.name;

    // Type-specific roll data is added by the TypeDataModel's getRollData()

    return data;
  }

  /* -------------------------------------------- */
  /*  Item Management                             */
  /* -------------------------------------------- */

  /**
   * Get all items of a specific type owned by this actor.
   *
   * @param {string} type - The item type to filter by
   * @returns {VagabondItem[]} Array of matching items
   */
  getItemsByType(type) {
    return this.items.filter((item) => item.type === type);
  }

  /**
   * Get all equipped weapons.
   *
   * @returns {VagabondItem[]} Array of equipped weapon items
   */
  getEquippedWeapons() {
    return this.items.filter((item) => item.type === "weapon" && item.system.equipped);
  }

  /**
   * Get all equipped armor (including shields).
   *
   * @returns {VagabondItem[]} Array of equipped armor items
   */
  getEquippedArmor() {
    return this.items.filter((item) => item.type === "armor" && item.system.equipped);
  }

  /**
   * Get the character's class item(s).
   *
   * @returns {VagabondItem[]} Array of class items
   */
  getClasses() {
    return this.items.filter((item) => item.type === "class");
  }

  /**
   * Get the character's ancestry item.
   *
   * @returns {VagabondItem|null} The ancestry item or null
   */
  getAncestry() {
    return this.items.find((item) => item.type === "ancestry") || null;
  }

  /**
   * Get all known spells.
   *
   * @returns {VagabondItem[]} Array of spell items
   */
  getSpells() {
    return this.items.filter((item) => item.type === "spell");
  }

  /**
   * Get all perks.
   *
   * @returns {VagabondItem[]} Array of perk items
   */
  getPerks() {
    return this.items.filter((item) => item.type === "perk");
  }

  /**
   * Get all features (from class, ancestry, etc.).
   *
   * @returns {VagabondItem[]} Array of feature items
   */
  getFeatures() {
    return this.items.filter((item) => item.type === "feature");
  }

  /* -------------------------------------------- */
  /*  Resource Management                         */
  /* -------------------------------------------- */

  /**
   * Modify a resource value (HP, Mana, Luck, etc.).
   * Handles bounds checking and triggers appropriate hooks.
   *
   * @param {string} resource - The resource key (e.g., "hp", "mana", "luck")
   * @param {number} delta - The amount to change (positive or negative)
   * @returns {Promise<VagabondActor>} The updated actor
   */
  async modifyResource(resource, delta) {
    if (this.type !== "character") {
      // For NPCs, only HP is tracked in the same way
      if (resource === "hp") {
        const npcCurrent = this.system.hp.value;
        const npcMax = this.system.hp.max;
        const npcNewValue = Math.clamp(npcCurrent + delta, 0, npcMax);
        return this.update({ "system.hp.value": npcNewValue });
      }
      return this;
    }

    const resourceData = this.system.resources[resource];
    if (!resourceData) {
      // eslint-disable-next-line no-console
      console.warn(`Vagabond | Unknown resource: ${resource}`);
      return this;
    }

    const current = resourceData.value;
    const max = resourceData.max || Infinity;
    const min = resource === "fatigue" ? 0 : 0; // All resources min at 0
    const newValue = Math.clamp(current + delta, min, max);

    return this.update({ [`system.resources.${resource}.value`]: newValue });
  }

  /**
   * Apply damage to this actor.
   * Reduces HP by the damage amount (after considering armor if applicable).
   *
   * @param {number} damage - The raw damage amount
   * @param {Object} options - Damage options
   * @param {boolean} options.ignoreArmor - If true, bypass armor reduction
   * @param {string} options.damageType - The type of damage for resistance checks
   * @returns {Promise<VagabondActor>} The updated actor
   */
  async applyDamage(damage, options = {}) {
    const { ignoreArmor = false, damageType = "blunt" } = options;

    let finalDamage = damage;

    // Apply armor reduction for characters (unless ignored)
    if (this.type === "character" && !ignoreArmor) {
      const armor = this.system.armor || 0;
      finalDamage = Math.max(0, damage - armor);
    }

    // For NPCs, check immunities, resistances, and weaknesses
    if (this.type === "npc") {
      const system = this.system;

      if (system.immunities?.includes(damageType)) {
        finalDamage = 0;
      } else if (system.resistances?.includes(damageType)) {
        finalDamage = Math.floor(finalDamage / 2);
      } else if (system.weaknesses?.includes(damageType)) {
        finalDamage = Math.floor(finalDamage * 1.5);
      }

      // Apply armor for NPCs
      if (!ignoreArmor) {
        const armor = system.armor || 0;
        finalDamage = Math.max(0, finalDamage - armor);
      }
    }

    // Apply the damage
    if (this.type === "character") {
      return this.modifyResource("hp", -finalDamage);
    }
    const newHP = Math.max(0, this.system.hp.value - finalDamage);
    return this.update({ "system.hp.value": newHP });
  }

  /**
   * Heal this actor.
   *
   * @param {number} amount - The amount to heal
   * @returns {Promise<VagabondActor>} The updated actor
   */
  async applyHealing(amount) {
    if (this.type === "character") {
      return this.modifyResource("hp", amount);
    }
    const max = this.system.hp.max;
    const newHP = Math.min(max, this.system.hp.value + amount);
    return this.update({ "system.hp.value": newHP });
  }

  /**
   * Spend mana for spellcasting.
   *
   * @param {number} cost - The mana cost
   * @returns {Promise<boolean>} True if mana was spent, false if insufficient
   */
  async spendMana(cost) {
    if (this.type !== "character") return false;

    const current = this.system.resources.mana.value;
    if (current < cost) return false;

    await this.modifyResource("mana", -cost);
    return true;
  }

  /**
   * Spend a luck point.
   *
   * @returns {Promise<boolean>} True if luck was spent, false if none available
   */
  async spendLuck() {
    if (this.type !== "character") return false;

    const current = this.system.resources.luck.value;
    if (current < 1) return false;

    await this.modifyResource("luck", -1);
    return true;
  }

  /**
   * Add fatigue to the character.
   * Death occurs at 5 fatigue.
   *
   * @param {number} amount - Fatigue to add (default 1)
   * @returns {Promise<VagabondActor>} The updated actor
   */
  async addFatigue(amount = 1) {
    if (this.type !== "character") return this;

    const current = this.system.resources.fatigue.value;
    const newValue = Math.min(5, current + amount);

    // Check for death at 5 fatigue
    if (newValue >= 5) {
      // TODO: Trigger death state
      // eslint-disable-next-line no-console
      console.log("Vagabond | Character has died from fatigue!");
    }

    return this.update({ "system.resources.fatigue.value": newValue });
  }

  /* -------------------------------------------- */
  /*  Rest & Recovery                             */
  /* -------------------------------------------- */

  /**
   * Perform a short rest (breather).
   * Recovers some HP based on Might.
   *
   * @returns {Promise<Object>} Results of the rest
   */
  async takeBreather() {
    if (this.type !== "character") return { recovered: 0 };

    const might = this.system.stats.might.value;
    const currentHP = this.system.resources.hp.value;
    const maxHP = this.system.resources.hp.max;

    // Recover Might HP
    const recovered = Math.min(might, maxHP - currentHP);
    await this.modifyResource("hp", recovered);

    // Track breathers taken
    const breathersTaken = (this.system.restTracking?.breathersTaken || 0) + 1;
    await this.update({ "system.restTracking.breathersTaken": breathersTaken });

    return { recovered, breathersTaken };
  }

  /**
   * Perform a full rest.
   * Recovers all HP, Mana, Luck; reduces Fatigue by 1.
   *
   * @returns {Promise<Object>} Results of the rest
   */
  async takeFullRest() {
    if (this.type !== "character") return {};

    const system = this.system;
    const updates = {};

    // Restore HP to max
    updates["system.resources.hp.value"] = system.resources.hp.max;

    // Restore Mana to max
    updates["system.resources.mana.value"] = system.resources.mana.max;

    // Restore Luck to max
    updates["system.resources.luck.value"] = system.resources.luck.max;

    // Reduce Fatigue by 1 (minimum 0)
    const newFatigue = Math.max(0, system.resources.fatigue.value - 1);
    updates["system.resources.fatigue.value"] = newFatigue;

    // Reset breathers counter
    updates["system.restTracking.breathersTaken"] = 0;

    // Track last rest time
    updates["system.restTracking.lastRest"] = new Date().toISOString();

    await this.update(updates);

    return {
      hpRestored: system.resources.hp.max,
      manaRestored: system.resources.mana.max,
      luckRestored: system.resources.luck.max,
      fatigueReduced: system.resources.fatigue.value > 0 ? 1 : 0,
    };
  }

  /* -------------------------------------------- */
  /*  Combat Helpers                              */
  /* -------------------------------------------- */

  /**
   * Check if this actor is dead (HP <= 0 or Fatigue >= 5).
   *
   * @returns {boolean} True if the actor is dead
   */
  get isDead() {
    if (this.type === "character") {
      return (
        this.system.resources.hp.value <= 0 ||
        this.system.resources.fatigue.value >= 5 ||
        this.system.death?.isDead
      );
    }
    return this.system.hp.value <= 0;
  }

  /**
   * Check if this NPC should make a morale check.
   *
   * @returns {boolean} True if morale should be checked
   */
  shouldCheckMorale() {
    if (this.type !== "npc") return false;
    return this.system.shouldCheckMorale?.() || false;
  }

  /**
   * Get the net favor/hinder for a specific roll type.
   * Checks Active Effect flags for persistent favor/hinder sources.
   * Favor and Hinder cancel 1-for-1, capped at +1 or -1.
   *
   * Flag convention (set by Active Effects):
   * - flags.vagabond.favor.skills.<skillId> - Favor on specific skill
   * - flags.vagabond.hinder.skills.<skillId> - Hinder on specific skill
   * - flags.vagabond.favor.attacks - Favor on attack rolls
   * - flags.vagabond.hinder.attacks - Hinder on attack rolls
   * - flags.vagabond.favor.saves.<saveType> - Favor on specific save
   * - flags.vagabond.hinder.saves.<saveType> - Hinder on specific save
   *
   * @param {Object} options - Options for determining favor/hinder
   * @param {string} [options.skillId] - Skill ID for skill checks (e.g., "arcana", "brawl")
   * @param {boolean} [options.isAttack] - True if this is an attack roll
   * @param {string} [options.saveType] - Save type (e.g., "reflex", "endure", "will")
   * @returns {Object} Result with net value and sources
   * @returns {number} result.net - Net modifier: +1 (favor), 0 (neutral), -1 (hinder)
   * @returns {string[]} result.favorSources - Names of active favor sources
   * @returns {string[]} result.hinderSources - Names of active hinder sources
   */
  getNetFavorHinder({ skillId = null, isAttack = false, saveType = null } = {}) {
    if (this.type !== "character") return { net: 0, favorSources: [], hinderSources: [] };

    const favorSources = [];
    const hinderSources = [];

    // Check skill-specific flags
    if (skillId) {
      if (this.getFlag("vagabond", `favor.skills.${skillId}`)) {
        favorSources.push(this._getFavorHinderSourceName("favor", "skills", skillId));
      }
      if (this.getFlag("vagabond", `hinder.skills.${skillId}`)) {
        hinderSources.push(this._getFavorHinderSourceName("hinder", "skills", skillId));
      }
    }

    // Check attack flags
    if (isAttack) {
      if (this.getFlag("vagabond", "favor.attacks")) {
        favorSources.push(this._getFavorHinderSourceName("favor", "attacks"));
      }
      if (this.getFlag("vagabond", "hinder.attacks")) {
        hinderSources.push(this._getFavorHinderSourceName("hinder", "attacks"));
      }
    }

    // Check save-specific flags
    if (saveType) {
      if (this.getFlag("vagabond", `favor.saves.${saveType}`)) {
        favorSources.push(this._getFavorHinderSourceName("favor", "saves", saveType));
      }
      if (this.getFlag("vagabond", `hinder.saves.${saveType}`)) {
        hinderSources.push(this._getFavorHinderSourceName("hinder", "saves", saveType));
      }
    }

    // They cancel 1-for-1, max of +1 or -1
    const net = Math.clamp(favorSources.length - hinderSources.length, -1, 1);

    return { net, favorSources, hinderSources };
  }

  /**
   * Get the source name for a favor/hinder flag by finding the Active Effect that set it.
   *
   * @param {string} type - "favor" or "hinder"
   * @param {string} category - "skills", "attacks", or "saves"
   * @param {string} [subtype] - Skill ID or save type
   * @returns {string} Source name or generic description
   * @private
   */
  _getFavorHinderSourceName(type, category, subtype = null) {
    const flagKey = subtype
      ? `flags.vagabond.${type}.${category}.${subtype}`
      : `flags.vagabond.${type}.${category}`;

    // Find the Active Effect that sets this flag
    for (const effect of this.effects) {
      if (!effect.active) continue;
      for (const change of effect.changes) {
        if (change.key === flagKey) {
          return effect.name || effect.parent?.name || `${type} effect`;
        }
      }
    }

    // Fallback if source not found
    const categoryLabel =
      category === "skills"
        ? `${subtype} checks`
        : category === "saves"
          ? `${subtype} saves`
          : category;
    return `${type} on ${categoryLabel}`;
  }
}
