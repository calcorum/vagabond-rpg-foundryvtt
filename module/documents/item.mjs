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
    await super._onCreate(data, options, userId);

    // Only process for the creating user
    if (game.user.id !== userId) return;

    // Apply class features when class is added to a character
    // Check that actor still exists (may be deleted in tests)
    if (this.type === "class" && this.parent?.type === "character" && this.actor?.id) {
      try {
        await this.applyClassFeatures();
      } catch (err) {
        // Actor may have been deleted during tests - silently ignore
        if (!err.message?.includes("does not exist")) throw err;
      }
    }
  }

  /**
   * Handle item deletion. For class items, remove associated Active Effects.
   *
   * @override
   */
  async _preDelete(options, userId) {
    // Remove class effects before deletion
    if (this.type === "class" && this.parent?.type === "character") {
      await this._removeClassEffects();
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
    if (!system.attackSkill) {
      if (system.properties?.includes("finesse")) {
        system.attackSkill = "finesse";
      } else if (system.properties?.includes("brawl")) {
        system.attackSkill = "brawl";
      } else if (system.gripType === "ranged" || system.properties?.includes("thrown")) {
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

    const prereqs = this.system.prerequisites || [];
    const missing = [];

    for (const prereq of prereqs) {
      let met = false;

      switch (prereq.type) {
        case "stat": {
          // Check stat minimum
          const statValue = actor.system.stats?.[prereq.stat]?.value || 0;
          met = statValue >= (prereq.value || 0);
          break;
        }

        case "training": {
          // Check if trained in skill
          const skillData = actor.system.skills?.[prereq.skill];
          met = skillData?.trained === true;
          break;
        }

        case "spell": {
          // Check if actor knows the spell
          const knownSpells = actor.getSpells?.() || [];
          met = knownSpells.some((s) => s.name === prereq.spellName);
          break;
        }

        case "perk": {
          // Check if actor has the prerequisite perk
          const perks = actor.getPerks?.() || [];
          met = perks.some((p) => p.name === prereq.perkName);
          break;
        }

        case "level":
          // Check minimum level
          met = (actor.system.level || 1) >= (prereq.value || 1);
          break;

        case "class": {
          // Check if actor has the class
          const classes = actor.getClasses?.() || [];
          met = classes.some((c) => c.name === prereq.className);
          break;
        }
      }

      if (!met) {
        missing.push(prereq);
      }
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
   * @param {number} [targetLevel] - Level to apply features for (defaults to actor's level)
   * @returns {Promise<ActiveEffect[]>} Created effects
   */
  async applyClassFeatures(targetLevel = null) {
    if (this.type !== "class" || !this.actor) return [];

    const level = targetLevel ?? this.actor.system.level ?? 1;
    const features = this.system.features || [];

    // Get features at or below current level that have changes
    const applicableFeatures = features.filter((f) => f.level <= level && f.changes?.length > 0);

    if (applicableFeatures.length === 0) {
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
    const newFeatures = applicableFeatures.filter((f) => !existingFeatureNames.has(f.name));

    if (newFeatures.length === 0) {
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

    // Create the effects
    const createdEffects = await this.actor.createEmbeddedDocuments("ActiveEffect", effectsData);

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
    if (this.type !== "class" || !this.actor) return [];

    const features = this.system.features || [];

    // Find features gained between old and new level
    const newFeatures = features.filter(
      (f) => f.level > oldLevel && f.level <= newLevel && f.changes?.length > 0
    );

    if (newFeatures.length === 0) {
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

    const createdEffects = await this.actor.createEmbeddedDocuments("ActiveEffect", effectsData);

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
