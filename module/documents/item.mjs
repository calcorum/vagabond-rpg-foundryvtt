import LevelUpDialog from "../applications/level-up-dialog.mjs";

// Debug logging for level-up workflow - set to false to disable
const DEBUG_LEVELUP = false;
const debugLog = (...args) => {
  if (DEBUG_LEVELUP) console.log("[VagabondItem]", ...args);
};
const debugWarn = (...args) => {
  if (DEBUG_LEVELUP) console.warn("[VagabondItem]", ...args);
};

/**
 * VagabondItem Document Class
 *
 * Extended Item document for Vagabond RPG system.
 * Provides document-level functionality including:
 * - Chat card generation for items
 * - Roll methods for weapons and spells
 * - Usage tracking for consumables and limited-use items
 *
 * Data models handle schema and base calculations.
 * This class handles document operations and Foundry integration.
 *
 * @extends Item
 */
export default class VagabondItem extends Item {
  /* -------------------------------------------- */
  /*  Document Lifecycle                          */
  /* -------------------------------------------- */

  /**
   * Handle item creation. For class items, apply features as Active Effects.
   * Note: This runs asynchronously after createEmbeddedDocuments returns.
   * The applyClassFeatures method is idempotent and safe to call multiple times.
   *
   * @override
   */
  async _onCreate(data, options, userId) {
    debugLog(`_onCreate called for "${this.name}" (type: ${this.type})`, {
      parentType: this.parent?.type,
      actorId: this.actor?.id,
      itemId: this.id,
      userId,
      currentUserId: game.user.id,
    });

    await super._onCreate(data, options, userId);

    // Only process for the creating user
    if (game.user.id !== userId) {
      debugLog("Skipping - not the creating user");
      return;
    }

    // Apply class features when class is added to a character
    // Check that actor still exists (may be deleted in tests)
    if (this.type === "class" && this.parent?.type === "character" && this.actor?.id) {
      debugLog("Class added to character - checking for choice features...");

      // Check if there are choice features at the actor's current level
      const currentLevel = this.actor.system.level || 1;
      const features = this.system.features || [];

      debugLog(
        "Features array:",
        features.map((f) => ({
          name: f.name,
          level: f.level,
          requiresChoice: f.requiresChoice,
          hasRequiresChoice: "requiresChoice" in f,
        }))
      );

      const choiceFeatures = features.filter(
        (f) => f.level <= currentLevel && f.requiresChoice === true
      );

      if (choiceFeatures.length > 0) {
        // Show level-up dialog for choice features
        debugLog(`Found ${choiceFeatures.length} choice features, showing dialog...`);
        try {
          // Use oldLevel=0 to indicate this is initial class assignment
          await LevelUpDialog.create(this.actor, currentLevel, 0);
        } catch (err) {
          console.error("Failed to show level-up dialog:", err);
        }
      } else {
        // No choices needed, apply features directly
        debugLog("No choice features - applying initial features directly...");
        try {
          const effects = await this.applyClassFeatures();
          debugLog(`Applied ${effects.length} initial Active Effects`);
        } catch (err) {
          // Actor may have been deleted during tests - silently ignore
          if (!err.message?.includes("does not exist")) throw err;
          debugWarn("Actor was deleted during feature application");
        }
      }
    }

    // Apply perk effects when perk is added to a character
    if (this.type === "perk" && this.parent?.type === "character" && this.actor?.id) {
      debugLog("Perk added to character - applying effects...");
      try {
        const effects = await this.applyPerkEffects();
        debugLog(`Applied ${effects.length} perk Active Effects`);
      } catch (err) {
        if (!err.message?.includes("does not exist")) throw err;
        debugWarn("Actor was deleted during perk effect application");
      }
    }

    // Apply ancestry traits when ancestry is added to a character
    if (this.type === "ancestry" && this.parent?.type === "character" && this.actor?.id) {
      debugLog("Ancestry added to character - applying traits...");
      try {
        const effects = await this.applyAncestryTraits();
        debugLog(`Applied ${effects.length} ancestry trait Active Effects`);
      } catch (err) {
        if (!err.message?.includes("does not exist")) throw err;
        debugWarn("Actor was deleted during ancestry trait application");
      }
    }
  }

  /**
   * Handle item deletion. For class/perk/ancestry items, remove associated Active Effects.
   *
   * @override
   */
  async _preDelete(options, userId) {
    // Remove class effects before deletion
    if (this.type === "class" && this.parent?.type === "character") {
      await this._removeClassEffects();
    }

    // Remove perk effects before deletion
    if (this.type === "perk" && this.parent?.type === "character") {
      await this._removePerkEffects();
    }

    // Remove ancestry trait effects before deletion
    if (this.type === "ancestry" && this.parent?.type === "character") {
      await this._removeAncestryEffects();
    }

    return super._preDelete(options, userId);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /**
   * Prepare data for the item.
   *
   * @override
   */
  prepareData() {
    super.prepareData();
  }

  /**
   * Prepare derived data for the item.
   *
   * @override
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Type-specific preparation
    switch (this.type) {
      case "spell":
        this._prepareSpellData();
        break;
      case "weapon":
        this._prepareWeaponData();
        break;
    }
  }

  /**
   * Prepare spell-specific derived data.
   * Pre-calculates mana costs for common configurations.
   *
   * @private
   */
  _prepareSpellData() {
    const system = this.system;
    if (!system) return;

    // Calculate base mana cost (damage dice count)
    // Full formula: base dice + delivery cost + duration modifier
    // This will be calculated dynamically in the cast dialog
  }

  /**
   * Prepare weapon-specific derived data.
   *
   * @private
   */
  _prepareWeaponData() {
    const system = this.system;
    if (!system) return;

    // Determine attack skill based on properties
    // Note: system.properties is a SchemaField (object with boolean values), not an array
    if (!system.attackSkill) {
      if (system.properties?.finesse) {
        system.attackSkill = "finesse";
      } else if (system.properties?.brawl) {
        system.attackSkill = "brawl";
      } else if (system.gripType === "ranged" || system.properties?.thrown) {
        system.attackSkill = "ranged";
      } else {
        system.attackSkill = "melee";
      }
    }
  }

  /* -------------------------------------------- */
  /*  Roll Data                                   */
  /* -------------------------------------------- */

  /**
   * Get the roll data for this item.
   * Includes item stats and owner's roll data if applicable.
   *
   * @override
   * @returns {Object} Roll data object
   */
  getRollData() {
    const data = { ...this.system };

    // Include owner's roll data if this item belongs to an actor
    if (this.actor) {
      data.actor = this.actor.getRollData();
    }

    return data;
  }

  /* -------------------------------------------- */
  /*  Chat Card Generation                        */
  /* -------------------------------------------- */

  /**
   * Display the item in chat as a card.
   * Shows item details and provides roll buttons where applicable.
   *
   * @param {Object} options - Chat message options
   * @returns {Promise<ChatMessage>} The created chat message
   */
  async toChat(options = {}) {
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });

    // Build chat card content based on item type
    const content = await this._getChatCardContent();

    const chatData = {
      user: game.user.id,
      speaker,
      content,
      flavor: this.name,
      ...options,
    };

    return ChatMessage.create(chatData);
  }

  /**
   * Generate HTML content for the item's chat card.
   *
   * @private
   * @returns {Promise<string>} HTML content
   */
  async _getChatCardContent() {
    const data = {
      item: this,
      system: this.system,
      actor: this.actor,
      isOwner: this.isOwner,
      config: CONFIG.VAGABOND,
    };

    // Use type-specific template if available, otherwise generic
    const templatePath = `systems/vagabond/templates/chat/${this.type}-card.hbs`;
    const genericPath = "systems/vagabond/templates/chat/item-card.hbs";

    try {
      return await renderTemplate(templatePath, data);
    } catch {
      // Fall back to generic template
      try {
        return await renderTemplate(genericPath, data);
      } catch {
        // If no templates exist yet, return basic HTML
        return this._getBasicChatCardHTML();
      }
    }
  }

  /**
   * Generate basic HTML for chat card when templates aren't available.
   *
   * @private
   * @returns {string} Basic HTML content
   */
  _getBasicChatCardHTML() {
    const system = this.system;
    let content = `<div class="vagabond chat-card item-card">`;
    content += `<header class="card-header"><h3>${this.name}</h3></header>`;
    content += `<div class="card-content">`;

    // Type-specific details
    switch (this.type) {
      case "weapon":
        content += `<p><strong>Damage:</strong> ${system.damage || "1d6"}</p>`;
        if (system.properties?.length) {
          content += `<p><strong>Properties:</strong> ${system.properties.join(", ")}</p>`;
        }
        break;
      case "armor":
        content += `<p><strong>Armor:</strong> ${system.armorValue || 0}</p>`;
        content += `<p><strong>Type:</strong> ${system.armorType || "light"}</p>`;
        break;
      case "spell":
        content += `<p><strong>Base Cost:</strong> ${system.baseCost || 1} Mana</p>`;
        if (system.effect) {
          content += `<p><strong>Effect:</strong> ${system.effect}</p>`;
        }
        break;
      case "perk":
        if (system.prerequisites?.length) {
          content += `<p><strong>Prerequisites:</strong></p>`;
        }
        break;
    }

    // Description
    if (system.description) {
      content += `<div class="card-description">${system.description}</div>`;
    }

    content += `</div></div>`;
    return content;
  }

  /* -------------------------------------------- */
  /*  Item Actions                                */
  /* -------------------------------------------- */

  /**
   * Use the item (attack with weapon, cast spell, use consumable).
   * Opens appropriate dialog based on item type.
   *
   * @param {Object} options - Usage options
   * @returns {Promise<void>}
   */
  async use(options = {}) {
    if (!this.actor) {
      ui.notifications.warn("This item must be owned by an actor to be used.");
      return;
    }

    switch (this.type) {
      case "weapon":
        return this._useWeapon(options);
      case "spell":
        return this._useSpell(options);
      case "equipment":
        if (this.system.consumable) {
          return this._useConsumable(options);
        }
        break;
      case "feature":
        if (!this.system.passive) {
          return this._useFeature(options);
        }
        break;
    }

    // Default: just post to chat
    return this.toChat();
  }

  /**
   * Attack with this weapon.
   *
   * @private
   * @param {Object} options - Attack options
   * @returns {Promise<void>}
   */
  async _useWeapon(_options = {}) {
    // TODO: Implement attack roll dialog (Phase 2.6)
    // For now, just post to chat
    await this.toChat();

    // Placeholder for attack roll
    const attackSkill = this.system.attackSkill || "melee";
    ui.notifications.info(`Attack with ${this.name} using ${attackSkill} skill`);
  }

  /**
   * Cast this spell.
   *
   * @private
   * @param {Object} options - Casting options
   * @returns {Promise<void>}
   */
  async _useSpell(_options = {}) {
    // TODO: Implement spell casting dialog (Phase 2.8)
    // For now, just post to chat
    await this.toChat();

    // Placeholder for spell cast
    const baseCost = this.system.baseCost || 1;
    ui.notifications.info(`Casting ${this.name} (Base cost: ${baseCost} Mana)`);
  }

  /**
   * Use a consumable item.
   *
   * @private
   * @param {Object} options - Usage options
   * @returns {Promise<void>}
   */
  async _useConsumable(_options = {}) {
    const quantity = this.system.quantity || 1;

    if (quantity <= 0) {
      ui.notifications.warn(`No ${this.name} remaining!`);
      return;
    }

    // Post to chat
    await this.toChat();

    // Reduce quantity
    const newQuantity = quantity - 1;
    await this.update({ "system.quantity": newQuantity });

    if (newQuantity <= 0) {
      ui.notifications.info(`Used last ${this.name}`);
    }
  }

  /**
   * Use an active feature.
   *
   * @private
   * @param {Object} options - Usage options
   * @returns {Promise<void>}
   */
  async _useFeature(_options = {}) {
    // Check if feature has uses
    if (this.system.uses) {
      const current = this.system.uses.value || 0;
      const max = this.system.uses.max || 0;

      if (max > 0 && current <= 0) {
        ui.notifications.warn(`No uses of ${this.name} remaining!`);
        return;
      }

      // Post to chat
      await this.toChat();

      // Reduce uses
      if (max > 0) {
        await this.update({ "system.uses.value": current - 1 });
      }
    } else {
      // No use tracking, just post to chat
      await this.toChat();
    }
  }

  /* -------------------------------------------- */
  /*  Spell Helpers                               */
  /* -------------------------------------------- */

  /**
   * Calculate the mana cost for a spell with given options.
   *
   * @param {Object} options - Casting options
   * @param {number} options.extraDice - Additional damage dice
   * @param {string} options.delivery - Delivery type
   * @param {string} options.duration - Duration type
   * @returns {number} Total mana cost
   */
  calculateManaCost(options = {}) {
    if (this.type !== "spell") return 0;

    const system = this.system;
    const { extraDice = 0, delivery = "touch" } = options;
    // Note: duration affects Focus mechanics but not mana cost directly

    // Base cost is number of damage dice
    const baseDice = system.baseDamageDice || 1;
    let cost = baseDice + extraDice;

    // Add delivery cost
    const deliveryCosts = CONFIG.VAGABOND?.spellDelivery || {};
    const deliveryData = deliveryCosts[delivery];
    if (deliveryData) {
      cost += deliveryData.cost || 0;
    }

    // Duration doesn't add cost, but Focus duration has ongoing effects

    return Math.max(1, cost);
  }

  /**
   * Get available delivery types for this spell.
   *
   * @returns {string[]} Array of valid delivery type keys
   */
  getValidDeliveryTypes() {
    if (this.type !== "spell") return [];

    const validTypes = this.system.validDeliveryTypes || [];
    if (validTypes.length === 0) {
      // Default to touch and remote
      return ["touch", "remote"];
    }
    return validTypes;
  }

  /* -------------------------------------------- */
  /*  Perk Helpers                                */
  /* -------------------------------------------- */

  /**
   * Check if this perk's prerequisites are met by an actor.
   *
   * @param {VagabondActor} actor - The actor to check against
   * @returns {Object} Result with met (boolean) and missing (array of unmet prereqs)
   */
  checkPrerequisites(actor) {
    if (this.type !== "perk" || !actor) {
      return { met: true, missing: [] };
    }

    const prereqs = this.system.prerequisites;
    if (!prereqs) {
      return { met: true, missing: [] };
    }

    const missing = [];

    // Check stat requirements
    if (prereqs.stats) {
      for (const [stat, required] of Object.entries(prereqs.stats)) {
        if (required !== null && required > 0) {
          const actorStat = actor.system.stats?.[stat]?.value || 0;
          if (actorStat < required) {
            const statLabel = stat.charAt(0).toUpperCase() + stat.slice(1);
            missing.push({
              type: "stat",
              stat,
              value: required,
              label: `${statLabel} ${required}`,
            });
          }
        }
      }
    }

    // Check skill training requirements
    if (prereqs.trainedSkills) {
      for (const skillId of prereqs.trainedSkills) {
        const skill = actor.system.skills?.[skillId];
        if (!skill?.trained) {
          missing.push({ type: "training", skill: skillId, label: `Trained in ${skillId}` });
        }
      }
    }

    // Check spell requirements
    if (prereqs.spells?.length > 0) {
      const knownSpells = actor.items.filter((i) => i.type === "spell");
      for (const spellName of prereqs.spells) {
        if (!knownSpells.some((s) => s.name === spellName)) {
          missing.push({ type: "spell", spellName, label: `Spell: ${spellName}` });
        }
      }
    }

    // Check perk requirements
    if (prereqs.perks?.length > 0) {
      const actorPerks = actor.items.filter((i) => i.type === "perk");
      for (const perkName of prereqs.perks) {
        if (!actorPerks.some((p) => p.name === perkName)) {
          missing.push({ type: "perk", perkName, label: `Perk: ${perkName}` });
        }
      }
    }

    // Custom requirements are always flagged as missing (need manual review)
    if (prereqs.custom) {
      missing.push({ type: "custom", label: prereqs.custom });
    }

    return {
      met: missing.length === 0,
      missing,
    };
  }

  /* -------------------------------------------- */
  /*  Class Helpers                               */
  /* -------------------------------------------- */

  /**
   * Get features granted at a specific level for this class.
   *
   * @param {number} level - The level to check
   * @returns {Object[]} Array of feature definitions
   */
  getFeaturesAtLevel(level) {
    if (this.type !== "class") return [];

    const progression = this.system.progression || [];
    const levelData = progression.find((p) => p.level === level);

    return levelData?.features || [];
  }

  /**
   * Get cumulative features up to and including a level.
   *
   * @param {number} level - The maximum level
   * @returns {Object[]} Array of all features up to this level
   */
  getAllFeaturesUpToLevel(level) {
    if (this.type !== "class") return [];

    const progression = this.system.progression || [];
    const features = [];

    for (const levelData of progression) {
      if (levelData.level <= level) {
        features.push(...(levelData.features || []));
      }
    }

    return features;
  }

  /**
   * Apply class features as Active Effects based on character's current level.
   * Called when class is added to character or when level changes.
   * This method is idempotent - it won't create duplicate effects.
   *
   * Note: Race condition protection is handled at the _onCreate level via
   * #initialFeaturesApplied map, which guards against duplicate calls.
   *
   * @param {number} [targetLevel] - Level to apply features for (defaults to actor's level)
   * @returns {Promise<ActiveEffect[]>} Created effects
   */
  async applyClassFeatures(targetLevel = null) {
    debugLog(`applyClassFeatures called for class "${this.name}"`, {
      targetLevel,
      actorLevel: this.actor?.system?.level,
    });

    if (this.type !== "class" || !this.actor) {
      debugWarn("applyClassFeatures: Not a class or no actor");
      return [];
    }
    const level = targetLevel ?? this.actor.system.level ?? 1;
    const features = this.system.features || [];

    debugLog(`Processing features for level ${level}`, {
      totalFeatures: features.length,
      allFeatures: features.map((f) => ({
        name: f.name,
        level: f.level,
        changesCount: f.changes?.length || 0,
      })),
    });

    // Get features at or below current level that have changes
    const applicableFeatures = features.filter((f) => f.level <= level && f.changes?.length > 0);
    debugLog(
      `Applicable features (level <= ${level} with changes):`,
      applicableFeatures.map((f) => f.name)
    );

    if (applicableFeatures.length === 0) {
      debugLog("No applicable features with changes - applying progression only");
      // Still apply progression even if no features with changes
      await this._applyClassProgression(level);
      await this._applyTrainedSkills();
      return [];
    }

    // Filter out features that already have effects applied (idempotent)
    const existingEffects = this.actor.effects.filter((e) => e.origin === this.uuid);
    const existingFeatureNames = new Set(
      existingEffects.map((e) => e.flags?.vagabond?.featureName)
    );
    debugLog(`Existing effects from this class:`, [...existingFeatureNames]);

    const newFeatures = applicableFeatures.filter((f) => !existingFeatureNames.has(f.name));
    debugLog(
      `New features to apply:`,
      newFeatures.map((f) => f.name)
    );

    if (newFeatures.length === 0) {
      debugLog("All features already applied - updating progression only");
      // All features already applied, just update progression
      await this._applyClassProgression(level);
      await this._applyTrainedSkills();
      return [];
    }

    // Build Active Effect data for each new feature
    const effectsData = newFeatures.map((feature) => ({
      name: `${this.name}: ${feature.name}`,
      icon: this.img || "icons/svg/book.svg",
      origin: this.uuid,
      changes: feature.changes.map((change) => ({
        key: change.key,
        mode: change.mode ?? 2, // Default to ADD mode
        value: String(change.value),
        priority: change.priority ?? null,
      })),
      flags: {
        vagabond: {
          classFeature: true,
          className: this.name,
          featureName: feature.name,
          featureLevel: feature.level,
        },
      },
    }));

    debugLog(
      "Creating Active Effects:",
      effectsData.map((e) => ({
        name: e.name,
        changes: e.changes,
      }))
    );

    // Create the effects
    const createdEffects = await this.actor.createEmbeddedDocuments("ActiveEffect", effectsData);
    debugLog(
      `Created ${createdEffects.length} Active Effects:`,
      createdEffects.map((e) => e.name)
    );

    // Also update actor's mana and casting max from class progression
    await this._applyClassProgression(level);

    // Train skills from class
    await this._applyTrainedSkills();

    return createdEffects;
  }

  /**
   * Update class features when character level changes.
   * Adds new features gained at the new level.
   *
   * @param {number} newLevel - The new character level
   * @param {number} oldLevel - The previous character level
   * @returns {Promise<ActiveEffect[]>} Newly created effects
   */
  async updateClassFeatures(newLevel, oldLevel) {
    debugLog(`updateClassFeatures called for class "${this.name}"`, {
      oldLevel,
      newLevel,
    });

    if (this.type !== "class" || !this.actor) {
      debugWarn("updateClassFeatures: Not a class or no actor");
      return [];
    }

    const features = this.system.features || [];
    debugLog(`Total features in class: ${features.length}`);

    // Find features gained between old and new level
    const newFeatures = features.filter(
      (f) => f.level > oldLevel && f.level <= newLevel && f.changes?.length > 0
    );

    debugLog(
      `Features gained between level ${oldLevel} and ${newLevel}:`,
      newFeatures.map((f) => ({
        name: f.name,
        level: f.level,
        changesCount: f.changes?.length || 0,
      }))
    );

    if (newFeatures.length === 0) {
      debugLog("No new features with changes - updating progression only");
      // Still update progression stats even if no new features
      await this._applyClassProgression(newLevel);
      return [];
    }

    // Build Active Effect data for new features
    const effectsData = newFeatures.map((feature) => ({
      name: `${this.name}: ${feature.name}`,
      icon: this.img || "icons/svg/book.svg",
      origin: this.uuid,
      changes: feature.changes.map((change) => ({
        key: change.key,
        mode: change.mode ?? 2,
        value: String(change.value),
        priority: change.priority ?? null,
      })),
      flags: {
        vagabond: {
          classFeature: true,
          className: this.name,
          featureName: feature.name,
          featureLevel: feature.level,
        },
      },
    }));

    debugLog(
      "Creating Active Effects for level-up:",
      effectsData.map((e) => ({
        name: e.name,
        changes: e.changes,
      }))
    );

    const createdEffects = await this.actor.createEmbeddedDocuments("ActiveEffect", effectsData);
    debugLog(
      `Created ${createdEffects.length} Active Effects:`,
      createdEffects.map((e) => e.name)
    );

    // Update mana and casting max
    await this._applyClassProgression(newLevel);

    return createdEffects;
  }

  /**
   * Remove all Active Effects originating from this class.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _removeClassEffects() {
    if (!this.actor) return;

    const classEffects = this.actor.effects.filter((e) => e.origin === this.uuid);
    if (classEffects.length > 0) {
      const ids = classEffects.map((e) => e.id);
      await this.actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
  }

  /* -------------------------------------------- */
  /*  Perk Helpers                                */
  /* -------------------------------------------- */

  /**
   * Apply perk effects as Active Effects when perk is added to character.
   * This method is idempotent - it won't create duplicate effects.
   *
   * @returns {Promise<ActiveEffect[]>} Created effects
   */
  async applyPerkEffects() {
    debugLog(`applyPerkEffects called for perk "${this.name}"`, {
      hasChanges: this.system.changes?.length > 0,
    });

    if (this.type !== "perk" || !this.actor) {
      debugWarn("applyPerkEffects: Not a perk or no actor");
      return [];
    }

    const changes = this.system.changes || [];
    if (changes.length === 0) {
      debugLog("Perk has no mechanical changes - skipping effect creation");
      return [];
    }

    // Check if effect already exists (idempotent)
    const existingEffect = this.actor.effects.find((e) => e.origin === this.uuid);
    if (existingEffect) {
      debugLog("Perk effect already exists - skipping");
      return [];
    }

    // Build Active Effect data
    const effectData = {
      name: this.name,
      icon: this.img || "icons/svg/upgrade.svg",
      origin: this.uuid,
      changes: changes.map((change) => ({
        key: change.key,
        mode: change.mode ?? 2, // Default to ADD mode
        value: String(change.value),
        priority: change.priority ?? null,
      })),
      flags: {
        vagabond: {
          perkEffect: true,
          perkName: this.name,
        },
      },
    };

    debugLog("Creating perk Active Effect:", {
      name: effectData.name,
      changes: effectData.changes,
    });

    const createdEffects = await this.actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    debugLog(`Created ${createdEffects.length} perk Active Effects`);

    return createdEffects;
  }

  /**
   * Remove all Active Effects originating from this perk.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _removePerkEffects() {
    if (!this.actor) return;

    const perkEffects = this.actor.effects.filter((e) => e.origin === this.uuid);
    if (perkEffects.length > 0) {
      debugLog(`Removing ${perkEffects.length} perk effects for "${this.name}"`);
      const ids = perkEffects.map((e) => e.id);
      await this.actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
  }

  /* -------------------------------------------- */
  /*  Ancestry Helpers                            */
  /* -------------------------------------------- */

  /**
   * Apply ancestry trait effects as Active Effects when ancestry is added to character.
   * Each trait with a changes[] array creates a separate Active Effect.
   * This method is idempotent - it won't create duplicate effects.
   *
   * @returns {Promise<ActiveEffect[]>} Created effects
   */
  async applyAncestryTraits() {
    debugLog(`applyAncestryTraits called for ancestry "${this.name}"`, {
      traitsCount: this.system.traits?.length || 0,
    });

    if (this.type !== "ancestry" || !this.actor) {
      debugWarn("applyAncestryTraits: Not an ancestry or no actor");
      return [];
    }

    const traits = this.system.traits || [];
    const traitsWithChanges = traits.filter((t) => t.changes?.length > 0);

    if (traitsWithChanges.length === 0) {
      debugLog("Ancestry has no traits with mechanical changes - skipping effect creation");
      return [];
    }

    // Check for existing effects (idempotent)
    const existingEffects = this.actor.effects.filter((e) => e.origin === this.uuid);
    const existingTraitNames = new Set(existingEffects.map((e) => e.flags?.vagabond?.traitName));

    const newTraits = traitsWithChanges.filter((t) => !existingTraitNames.has(t.name));
    if (newTraits.length === 0) {
      debugLog("All ancestry traits already applied - skipping");
      return [];
    }

    // Build Active Effect data for each trait
    const effectsData = newTraits.map((trait) => ({
      name: `${this.name}: ${trait.name}`,
      icon: this.img || "icons/svg/mystery-man.svg",
      origin: this.uuid,
      changes: trait.changes.map((change) => ({
        key: change.key,
        mode: change.mode ?? 2,
        value: String(change.value),
        priority: change.priority ?? null,
      })),
      flags: {
        vagabond: {
          ancestryTrait: true,
          ancestryName: this.name,
          traitName: trait.name,
        },
      },
    }));

    debugLog(
      "Creating ancestry trait Active Effects:",
      effectsData.map((e) => ({
        name: e.name,
        changes: e.changes,
      }))
    );

    const createdEffects = await this.actor.createEmbeddedDocuments("ActiveEffect", effectsData);
    debugLog(`Created ${createdEffects.length} ancestry trait Active Effects`);

    return createdEffects;
  }

  /**
   * Remove all Active Effects originating from this ancestry.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _removeAncestryEffects() {
    if (!this.actor) return;

    const ancestryEffects = this.actor.effects.filter((e) => e.origin === this.uuid);
    if (ancestryEffects.length > 0) {
      debugLog(`Removing ${ancestryEffects.length} ancestry effects for "${this.name}"`);
      const ids = ancestryEffects.map((e) => e.id);
      await this.actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    }
  }

  /**
   * Apply class progression stats (mana, casting max) to the actor.
   *
   * @private
   * @param {number} level - Character level
   * @returns {Promise<void>}
   */
  async _applyClassProgression(level) {
    if (!this.actor || !this.system.isCaster) return;

    // Calculate mana and casting max directly from progression data
    // (methods on data model may not be available on embedded items)
    const progression = this.system.progression || [];
    let mana = 0;
    let castingMax = 0;
    for (const prog of progression) {
      if (prog.level <= level) {
        mana += prog.mana || 0;
        castingMax += prog.castingMax || 0;
      }
    }

    // Update actor's mana pool
    const updates = {};
    if (mana > 0) {
      updates["system.resources.mana.max"] = mana;
      // Set current mana to max if it was 0 (initial grant)
      if (this.actor.system.resources.mana.value === 0) {
        updates["system.resources.mana.value"] = mana;
      }
    }
    if (castingMax > 0) {
      updates["system.resources.mana.castingMax"] = castingMax;
    }

    if (Object.keys(updates).length > 0) {
      await this.actor.update(updates);
    }
  }

  /**
   * Apply trained skills from class to the actor.
   *
   * @private
   * @returns {Promise<void>}
   */
  async _applyTrainedSkills() {
    if (!this.actor) return;

    const trainedSkills = this.system.trainedSkills || [];
    if (trainedSkills.length === 0) return;

    const updates = {};
    for (const skillId of trainedSkills) {
      if (this.actor.system.skills?.[skillId]) {
        updates[`system.skills.${skillId}.trained`] = true;
      }
    }

    if (Object.keys(updates).length > 0) {
      await this.actor.update(updates);
    }
  }

  /* -------------------------------------------- */
  /*  Equipment Helpers                           */
  /* -------------------------------------------- */

  /**
   * Handle item updates. Sync equipment Active Effects with equipped state.
   *
   * @override
   */
  async _onUpdate(changed, options, userId) {
    await super._onUpdate(changed, options, userId);

    // Only process for the updating user
    if (game.user.id !== userId) return;

    // Sync equipment effects with equipped state
    if (
      ["weapon", "armor", "equipment"].includes(this.type) &&
      changed.system?.equipped !== undefined &&
      this.actor
    ) {
      await this._syncEquippedEffects(changed.system.equipped);
    }
  }

  /**
   * Sync Active Effects' disabled state with equipped state.
   * Effects should be enabled when equipped, disabled when not.
   *
   * @private
   * @param {boolean} equipped - The new equipped state
   * @returns {Promise<void>}
   */
  async _syncEquippedEffects(equipped) {
    // Find effects on the actor that originated from this item
    const itemEffects = this.actor.effects.filter((e) => e.origin === this.uuid);
    if (itemEffects.length === 0) return;

    // Update disabled state: disabled = !equipped
    const updates = itemEffects.map((effect) => ({
      _id: effect.id,
      disabled: !equipped,
    }));

    await this.actor.updateEmbeddedDocuments("ActiveEffect", updates);
  }

  /**
   * Toggle the equipped state of this item.
   *
   * @returns {Promise<VagabondItem>} The updated item
   */
  async toggleEquipped() {
    if (!["weapon", "armor", "equipment"].includes(this.type)) {
      return this;
    }

    const equipped = !this.system.equipped;
    return this.update({ "system.equipped": equipped });
  }

  /**
   * Get the total value of this item in copper pieces.
   *
   * @returns {number} Value in copper
   */
  getValueInCopper() {
    const value = this.system.value || {};
    const gold = value.gold || 0;
    const silver = value.silver || 0;
    const copper = value.copper || 0;

    // 1 gold = 10 silver = 100 copper
    return gold * 100 + silver * 10 + copper;
  }
}
