/**
 * Character (PC) Data Model
 *
 * Defines the data schema for player characters in Vagabond RPG.
 * Includes stats, skills, saves, resources, and derived value calculations.
 *
 * Key Mechanics:
 * - Six stats: Might, Dexterity, Awareness, Reason, Presence, Luck
 * - Derived values: Max HP = Might × Level, Speed based on DEX
 * - 12 skills with trained/untrained status affecting difficulty
 * - 3 saves (Reflex, Endure, Will) calculated from stat pairs
 * - Resources: HP, Mana, Luck pool, Fatigue
 * - Item slots: 8 + Might - Fatigue
 *
 * @extends VagabondActorBase
 */
import VagabondActorBase from "./base-actor.mjs";

export default class CharacterData extends VagabondActorBase {
  /**
   * Define the schema for character actors.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Character level (1-10)
      level: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 1,
        max: 10,
      }),

      // Experience points
      xp: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),

      // Six core stats
      stats: new fields.SchemaField({
        might: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 2,
            min: 1,
            max: 10,
          }),
        }),
        dexterity: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 2,
            min: 1,
            max: 10,
          }),
        }),
        awareness: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 2,
            min: 1,
            max: 10,
          }),
        }),
        reason: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 2,
            min: 1,
            max: 10,
          }),
        }),
        presence: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 2,
            min: 1,
            max: 10,
          }),
        }),
        luck: new fields.SchemaField({
          value: new fields.NumberField({
            required: true,
            nullable: false,
            integer: true,
            initial: 2,
            min: 1,
            max: 10,
          }),
        }),
      }),

      // 12 skills with training and custom crit thresholds
      skills: new fields.SchemaField({
        arcana: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        brawl: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        craft: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        detect: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        finesse: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        influence: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        leadership: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        medicine: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        mysticism: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        performance: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        sneak: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        survival: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
      }),

      // Attack skills with crit thresholds
      attacks: new fields.SchemaField({
        melee: new fields.SchemaField({
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        brawl: new fields.SchemaField({
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        ranged: new fields.SchemaField({
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        finesse: new fields.SchemaField({
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
      }),

      // Resources (HP, Mana, Luck, Fatigue)
      resources: new fields.SchemaField({
        hp: new fields.SchemaField({
          value: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
          max: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
          bonus: new fields.NumberField({ integer: true, initial: 0 }),
        }),
        mana: new fields.SchemaField({
          value: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
          max: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
          castingMax: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
          bonus: new fields.NumberField({ integer: true, initial: 0 }),
        }),
        luck: new fields.SchemaField({
          value: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
          max: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        }),
        fatigue: new fields.SchemaField({
          value: new fields.NumberField({ integer: true, initial: 0, min: 0, max: 5 }),
        }),
      }),

      // Custom resources (for class-specific tracking like Studied Dice)
      customResources: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true }),
          value: new fields.NumberField({ integer: true, initial: 0 }),
          max: new fields.NumberField({ integer: true, initial: 0 }),
        })
      ),

      // Armor value (from equipped armor)
      armor: new fields.NumberField({ integer: true, initial: 0, min: 0 }),

      // Item slots tracking
      itemSlots: new fields.SchemaField({
        used: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        max: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        bonus: new fields.NumberField({ integer: true, initial: 0 }),
      }),

      // Movement speed
      speed: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 30 }),
        bonus: new fields.NumberField({ integer: true, initial: 0 }),
      }),

      // Saves - difficulties will be calculated
      saves: new fields.SchemaField({
        reflex: new fields.SchemaField({
          difficulty: new fields.NumberField({ integer: true, initial: 20 }),
          bonus: new fields.NumberField({ integer: true, initial: 0 }),
        }),
        endure: new fields.SchemaField({
          difficulty: new fields.NumberField({ integer: true, initial: 20 }),
          bonus: new fields.NumberField({ integer: true, initial: 0 }),
        }),
        will: new fields.SchemaField({
          difficulty: new fields.NumberField({ integer: true, initial: 20 }),
          bonus: new fields.NumberField({ integer: true, initial: 0 }),
        }),
      }),

      // Wealth tracking (Gold, Silver, Copper)
      wealth: new fields.SchemaField({
        gold: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        silver: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        copper: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
      }),

      // Character details
      details: new fields.SchemaField({
        size: new fields.StringField({ initial: "medium" }),
        beingType: new fields.StringField({ initial: "humanlike" }),
      }),
    };
  }

  /**
   * Prepare base data for the character.
   * Sets up initial values before items are processed.
   */
  prepareBaseData() {
    super.prepareBaseData();
  }

  /**
   * Prepare derived data for the character.
   * Calculates all values that depend on stats, level, and other factors.
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    const stats = this.stats;
    const level = this.level;

    // Calculate Max HP: Might × Level + bonus
    this.resources.hp.max = stats.might.value * level + this.resources.hp.bonus;

    // Calculate Speed based on Dexterity
    const speedByDex = CONFIG.VAGABOND?.speedByDex || { 2: 25, 3: 25, 4: 30, 5: 30, 6: 35, 7: 35 };
    const dexValue = Math.max(2, Math.min(7, stats.dexterity.value));
    this.speed.value = (speedByDex[dexValue] || 30) + this.speed.bonus;

    // Calculate Item Slots: 8 + Might - Fatigue + bonus
    const baseSlots = CONFIG.VAGABOND?.baseItemSlots || 8;
    this.itemSlots.max =
      baseSlots + stats.might.value - this.resources.fatigue.value + this.itemSlots.bonus;

    // Calculate Luck pool max (equals Luck stat)
    this.resources.luck.max = stats.luck.value;

    // Calculate Save Difficulties
    // Reflex = DEX + AWR, Difficulty = 20 - (DEX + AWR) + bonus
    this.saves.reflex.difficulty =
      20 - (stats.dexterity.value + stats.awareness.value) - this.saves.reflex.bonus;

    // Endure = MIT + MIT, Difficulty = 20 - (MIT × 2) + bonus
    this.saves.endure.difficulty = 20 - stats.might.value * 2 - this.saves.endure.bonus;

    // Will = RSN + PRS, Difficulty = 20 - (RSN + PRS) + bonus
    this.saves.will.difficulty =
      20 - (stats.reason.value + stats.presence.value) - this.saves.will.bonus;

    // Calculate Skill Difficulties
    this._calculateSkillDifficulties();
  }

  /**
   * Calculate difficulty values for all skills.
   * Untrained: 20 - stat
   * Trained: 20 - (stat × 2)
   *
   * @private
   */
  _calculateSkillDifficulties() {
    const skillStats = CONFIG.VAGABOND?.skills || {};

    for (const [skillId, skillData] of Object.entries(this.skills)) {
      const skillConfig = skillStats[skillId];
      if (!skillConfig) continue;

      const statKey = skillConfig.stat;
      const statValue = this.stats[statKey]?.value || 0;
      const trained = skillData.trained;

      // Calculate difficulty: 20 - stat (untrained) or 20 - stat×2 (trained)
      skillData.difficulty = trained ? 20 - statValue * 2 : 20 - statValue;

      // Store the associated stat for reference
      skillData.stat = statKey;
    }
  }

  /**
   * Get the roll data for this character.
   * Includes all stats, skills, and resources for use in Roll formulas.
   *
   * @returns {Object} Roll data object
   */
  getRollData() {
    const data = super.getRollData();

    // Add stat values at top level for easy access in formulas
    for (const [key, stat] of Object.entries(this.stats)) {
      data[key] = stat.value;
    }

    // Add level
    data.level = this.level;

    return data;
  }
}
