/**
 * Character Sheet for Vagabond RPG
 *
 * Extended sheet for player characters with:
 * - Stats section with all six attributes
 * - Combat section (HP, Armor, Fatigue, Speed)
 * - Saves section (Reflex, Endure, Will)
 * - Skills section (12 skills with trained/difficulty)
 * - Attacks section (weapons and attack skills)
 * - Inventory tab
 * - Abilities tab (features, perks, ancestry)
 * - Magic tab (mana, spells, focus)
 * - Biography tab
 *
 * @extends VagabondActorSheet
 */

import VagabondActorSheet from "./base-actor-sheet.mjs";

export default class VagabondCharacterSheet extends VagabondActorSheet {
  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      classes: ["vagabond", "sheet", "actor", "character"],
      position: {
        width: 750,
        height: 850,
      },
    },
    { inplace: false }
  );

  /** @override */
  static PARTS = {
    header: {
      template: "systems/vagabond/templates/actor/character-header.hbs",
    },
    tabs: {
      template: "systems/vagabond/templates/actor/parts/tabs.hbs",
    },
    main: {
      template: "systems/vagabond/templates/actor/character-main.hbs",
    },
    inventory: {
      template: "systems/vagabond/templates/actor/character-inventory.hbs",
    },
    abilities: {
      template: "systems/vagabond/templates/actor/character-abilities.hbs",
    },
    magic: {
      template: "systems/vagabond/templates/actor/character-magic.hbs",
    },
    biography: {
      template: "systems/vagabond/templates/actor/character-biography.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /** @override */
  get tabs() {
    return [
      { id: "main", label: "VAGABOND.TabMain", icon: "fa-solid fa-user" },
      { id: "inventory", label: "VAGABOND.TabInventory", icon: "fa-solid fa-suitcase" },
      { id: "abilities", label: "VAGABOND.TabAbilities", icon: "fa-solid fa-star" },
      { id: "magic", label: "VAGABOND.TabMagic", icon: "fa-solid fa-wand-sparkles" },
      { id: "biography", label: "VAGABOND.TabBiography", icon: "fa-solid fa-book" },
    ];
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareTypeContext(context, _options) {
    // Stats with labels
    context.stats = this._prepareStats();

    // Skills organized by associated stat
    context.skills = this._prepareSkills();

    // Saves with calculated difficulties
    context.saves = this._prepareSaves();

    // Attack skills
    context.attackSkills = this._prepareAttackSkills();

    // Resources with display data
    context.resources = this._prepareResources();

    // Speed display
    context.speed = this._prepareSpeed();

    // Wealth display
    context.wealth = this.actor.system.wealth;

    // Item slots
    context.itemSlots = this.actor.system.itemSlots;

    // Character details
    context.details = this.actor.system.details;
    context.sizeOptions = CONFIG.VAGABOND?.sizes || {};
    context.beingTypeOptions = CONFIG.VAGABOND?.beingTypes || {};

    // Focus tracking
    context.focus = this.actor.system.focus;
    context.hasFocus = this.actor.system.focus?.active?.length > 0;

    // Class and ancestry info
    context.ancestry = context.items.ancestry;
    context.classes = context.items.classes;
    context.className = context.items.classes[0]?.name || "None";
    context.ancestryName = context.items.ancestry?.name || "None";

    // Prepare class features from class items for display
    context.classFeatures = this._prepareClassFeatures();
  }

  /**
   * Prepare class features for display on the abilities tab.
   * Extracts features from class items at or below the character's current level.
   * @returns {Object[]}
   * @private
   */
  _prepareClassFeatures() {
    const level = this.actor.system.level || 1;
    const classFeatures = [];

    for (const classItem of this.actor.items.filter((i) => i.type === "class")) {
      const features = classItem.system.features || [];
      for (const feature of features) {
        // Only include features at or below current level
        if (feature.level <= level) {
          classFeatures.push({
            name: feature.name,
            description: feature.description,
            passive: feature.passive,
            level: feature.level,
            sourceClass: classItem.name,
            img: classItem.img || "icons/svg/book.svg",
          });
        }
      }
    }

    // Sort by level, then alphabetically
    classFeatures.sort((a, b) => {
      if (a.level !== b.level) return a.level - b.level;
      return a.name.localeCompare(b.name);
    });

    return classFeatures;
  }

  /**
   * Prepare stats for display with labels and colors.
   * @returns {Object}
   * @private
   */
  _prepareStats() {
    const system = this.actor.system;
    const stats = {};

    const statConfig = {
      might: { label: "VAGABOND.StatMight", abbr: "MIT", color: "stat-might" },
      dexterity: { label: "VAGABOND.StatDexterity", abbr: "DEX", color: "stat-dexterity" },
      awareness: { label: "VAGABOND.StatAwareness", abbr: "AWR", color: "stat-awareness" },
      reason: { label: "VAGABOND.StatReason", abbr: "RSN", color: "stat-reason" },
      presence: { label: "VAGABOND.StatPresence", abbr: "PRS", color: "stat-presence" },
      luck: { label: "VAGABOND.StatLuck", abbr: "LUK", color: "stat-luck" },
    };

    for (const [key, config] of Object.entries(statConfig)) {
      stats[key] = {
        ...config,
        value: system.stats[key].value,
        path: `system.stats.${key}.value`,
      };
    }

    return stats;
  }

  /**
   * Prepare skills for display with associated stats and difficulties.
   * @returns {Object}
   * @private
   */
  _prepareSkills() {
    const system = this.actor.system;
    const skillConfig = CONFIG.VAGABOND?.skills || {};
    const skills = {};

    for (const [skillId, config] of Object.entries(skillConfig)) {
      const skillData = system.skills[skillId];
      if (!skillData) continue;

      skills[skillId] = {
        id: skillId,
        label: config.label || skillId,
        stat: config.stat,
        statAbbr: this._getStatAbbr(config.stat),
        trained: skillData.trained,
        difficulty: skillData.difficulty,
        critThreshold: skillData.critThreshold,
        hasCritBonus: skillData.critThreshold < 20,
      };
    }

    return skills;
  }

  /**
   * Prepare saves for display.
   * @returns {Object}
   * @private
   */
  _prepareSaves() {
    const system = this.actor.system;

    return {
      reflex: {
        id: "reflex",
        label: "VAGABOND.SaveReflex",
        stats: "DEX + AWR",
        difficulty: system.saves.reflex.difficulty,
        bonus: system.saves.reflex.bonus,
      },
      endure: {
        id: "endure",
        label: "VAGABOND.SaveEndure",
        stats: "MIT + MIT",
        difficulty: system.saves.endure.difficulty,
        bonus: system.saves.endure.bonus,
      },
      will: {
        id: "will",
        label: "VAGABOND.SaveWill",
        stats: "RSN + PRS",
        difficulty: system.saves.will.difficulty,
        bonus: system.saves.will.bonus,
      },
    };
  }

  /**
   * Prepare attack skills for display.
   * @returns {Object}
   * @private
   */
  _prepareAttackSkills() {
    const system = this.actor.system;
    const attackConfig = CONFIG.VAGABOND?.attackTypes || {};

    const attacks = {};

    for (const [key, config] of Object.entries(attackConfig)) {
      const attackData = system.attacks[key];
      if (!attackData) continue;

      attacks[key] = {
        id: key,
        label: config.label,
        stat: config.stat,
        statAbbr: this._getStatAbbr(config.stat),
        trained: attackData.trained,
        difficulty: attackData.difficulty,
        critThreshold: attackData.critThreshold || 20,
        hasCritBonus: (attackData.critThreshold || 20) < 20,
      };
    }

    return attacks;
  }

  /**
   * Prepare resources for display.
   * @returns {Object}
   * @private
   */
  _prepareResources() {
    const system = this.actor.system;

    return {
      hp: {
        label: "VAGABOND.ResourceHP",
        value: system.resources.hp.value,
        max: system.resources.hp.max,
        percent: Math.round((system.resources.hp.value / system.resources.hp.max) * 100) || 0,
        color: this._getResourceColor(system.resources.hp.value, system.resources.hp.max),
      },
      mana: {
        label: "VAGABOND.ResourceMana",
        value: system.resources.mana.value,
        max: system.resources.mana.max,
        castingMax: system.resources.mana.castingMax,
        percent: Math.round((system.resources.mana.value / system.resources.mana.max) * 100) || 0,
      },
      luck: {
        label: "VAGABOND.ResourceLuck",
        value: system.resources.luck.value,
        max: system.resources.luck.max,
      },
      fatigue: {
        label: "VAGABOND.ResourceFatigue",
        value: system.resources.fatigue.value,
        max: 5,
        isDangerous: system.resources.fatigue.value >= 4,
      },
    };
  }

  /**
   * Prepare speed display.
   * @returns {Object}
   * @private
   */
  _prepareSpeed() {
    const system = this.actor.system;

    return {
      walk: system.speed.walk,
      fly: system.speed.fly,
      swim: system.speed.swim,
      climb: system.speed.climb,
      hasSpecialMovement: system.speed.fly > 0 || system.speed.swim > 0 || system.speed.climb > 0,
    };
  }

  /**
   * Get stat abbreviation.
   * @param {string} stat
   * @returns {string}
   * @private
   */
  _getStatAbbr(stat) {
    const abbrs = {
      might: "MIT",
      dexterity: "DEX",
      awareness: "AWR",
      reason: "RSN",
      presence: "PRS",
      luck: "LUK",
    };
    return abbrs[stat] || stat.toUpperCase().slice(0, 3);
  }

  /**
   * Get color class for resource bar based on percentage.
   * @param {number} value
   * @param {number} max
   * @returns {string}
   * @private
   */
  _getResourceColor(value, max) {
    const percent = (value / max) * 100;
    if (percent <= 25) return "critical";
    if (percent <= 50) return "warning";
    return "healthy";
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);

    // Only render the active tab's content
    if (["main", "inventory", "abilities", "magic", "biography"].includes(partId)) {
      context.isActiveTab = partId === this._activeTab;
    }

    return context;
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    // Always render header and tabs
    options.parts = ["header", "tabs"];

    // Add the active tab's part
    if (this._activeTab && VagabondCharacterSheet.PARTS[this._activeTab]) {
      options.parts.push(this._activeTab);
    } else {
      options.parts.push("main");
    }
  }
}
