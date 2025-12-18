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

      // Reference to equipped ancestry item (UUID)
      ancestryId: new fields.StringField({
        required: false,
        nullable: true,
        blank: true,
        initial: null,
      }),

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

      // 12 skills with training, difficulty (computed), and custom crit thresholds
      skills: new fields.SchemaField({
        arcana: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        brawl: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        craft: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        detect: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        finesse: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        influence: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        leadership: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        medicine: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        mysticism: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        performance: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        sneak: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        survival: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
      }),

      // Attack skills with trained status and crit thresholds
      attacks: new fields.SchemaField({
        melee: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        brawl: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        ranged: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
          critThreshold: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
        }),
        finesse: new fields.SchemaField({
          trained: new fields.BooleanField({ initial: false }),
          difficulty: new fields.NumberField({ integer: true, initial: 20, min: 1, max: 20 }),
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

        // Studied Dice pool (Scholar class feature - d8s that can replace d20 rolls)
        studiedDice: new fields.SchemaField({
          value: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
          max: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        }),
      }),

      // Custom resources (for class-specific tracking like Alchemist Formulae, Hunter's Mark, etc.)
      customResources: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true }),
          value: new fields.NumberField({ integer: true, initial: 0 }),
          max: new fields.NumberField({ integer: true, initial: 0 }),
          // Resource type for different tracking behaviors
          type: new fields.StringField({
            initial: "counter",
            choices: ["counter", "tracker", "toggle", "list"],
          }),
          // Subtype for specific mechanics (formulae, marked-target, crit-reduction, etc.)
          subtype: new fields.StringField({ required: false, blank: true }),
          // When this resource resets (null = manual/never)
          resetOn: new fields.StringField({
            required: false,
            nullable: true,
            blank: false,
            initial: null,
            choices: ["rest", "turn", "round", "day", "combat"],
          }),
          // Flexible data storage for complex resources (formulae lists, target IDs, etc.)
          data: new fields.ObjectField({ initial: {} }),
        })
      ),

      // Status Effects with Countdown Dice support
      // Countdown Dice: Track duration with shrinking dice (d6 -> d4 -> ends)
      statusEffects: new fields.ArrayField(
        new fields.SchemaField({
          // Effect name (e.g., "Burning", "Poisoned", "Blessed")
          name: new fields.StringField({ required: true }),
          // Effect description
          description: new fields.StringField({ required: false, blank: true }),
          // Source of the effect (item UUID, spell name, etc.)
          source: new fields.StringField({ required: false, blank: true }),
          // Icon path for display
          icon: new fields.StringField({ initial: "icons/svg/aura.svg" }),
          // Is this a beneficial or harmful effect?
          beneficial: new fields.BooleanField({ initial: false }),
          // Duration type: "countdown" (Cd4/Cd6), "rounds", "turns", "permanent"
          durationType: new fields.StringField({
            initial: "countdown",
            choices: ["countdown", "rounds", "turns", "permanent"],
          }),
          // Current countdown die size (6 = d6, 4 = d4, 0 = ended)
          countdownDie: new fields.NumberField({ integer: true, initial: 6, min: 0, max: 12 }),
          // For rounds/turns duration: remaining count
          durationValue: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
          // Active Effect changes to apply while this status is active
          changes: new fields.ArrayField(
            new fields.SchemaField({
              key: new fields.StringField({ required: true }),
              mode: new fields.NumberField({ integer: true, initial: 2 }),
              value: new fields.StringField({ required: true }),
            }),
            { initial: [] }
          ),
        }),
        { initial: [] }
      ),

      // Armor value (from equipped armor)
      armor: new fields.NumberField({ integer: true, initial: 0, min: 0 }),

      // Item slots tracking (8 + Might - Fatigue + bonuses)
      itemSlots: new fields.SchemaField({
        // Currently used slots (auto-calculated from inventory)
        used: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        // Maximum available slots (auto-calculated)
        max: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        // Total bonus from all sources (auto-calculated from bonuses array)
        bonus: new fields.NumberField({ integer: true, initial: 0 }),
        // Individual bonus sources for tracking (Orc Hulking, Pack Mule, etc.)
        bonuses: new fields.ArrayField(
          new fields.SchemaField({
            source: new fields.StringField({ required: true }), // "Orc Hulking", "Pack Mule"
            value: new fields.NumberField({ integer: true, initial: 0 }),
          }),
          { initial: [] }
        ),
        // Is the character overburdened (used > max)?
        overburdened: new fields.BooleanField({ initial: false }),
      }),

      // Movement speed - base walking speed plus bonus
      speed: new fields.SchemaField({
        // Walking speed (base from DEX, calculated in prepareDerivedData)
        walk: new fields.NumberField({ integer: true, initial: 30, min: 0 }),
        // Bonus to walking speed from effects
        bonus: new fields.NumberField({ integer: true, initial: 0 }),
      }),

      // Movement capabilities - boolean toggles for special movement types
      // All use base speed value when enabled per RAW
      movement: new fields.SchemaField({
        climb: new fields.BooleanField({ initial: false }), // Full Speed while climbing
        cling: new fields.BooleanField({ initial: false }), // As Climb, but can Move on ceilings
        fly: new fields.BooleanField({ initial: false }), // Move through the air at full Speed
        phase: new fields.BooleanField({ initial: false }), // Move in occupied space (5 dmg if ends turn there)
        swim: new fields.BooleanField({ initial: false }), // Full Speed while swimming
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
        // Size category with mechanical effects
        size: new fields.StringField({
          initial: "medium",
          choices: ["small", "medium", "large", "huge", "giant", "colossal"],
        }),
        // Units occupied on grid (derived from size)
        unitsOccupied: new fields.NumberField({ integer: true, initial: 1, min: 1 }),
        // Small creatures don't block movement through their space
        allowsMovementThrough: new fields.BooleanField({ initial: false }),
        // Being type for targeting effects
        beingType: new fields.StringField({
          initial: "humanlike",
          choices: [
            "humanlike",
            "fae",
            "cryptid",
            "artificial",
            "undead",
            "primordial",
            "hellspawn",
            "beast",
          ],
        }),
      }),

      // NOTE: Favor/Hinder is now handled via Active Effects flags instead of a data schema.
      // See DEVELOPMENT.md "Favor/Hinder via Active Effects" for the flag convention:
      // - flags.vagabond.favor.skills.<skillId>
      // - flags.vagabond.hinder.skills.<skillId>
      // - flags.vagabond.favor.attacks
      // - flags.vagabond.hinder.attacks
      // - flags.vagabond.favor.saves.<saveType>
      // - flags.vagabond.hinder.saves.<saveType>

      // Focus tracking for maintained spells
      focus: new fields.SchemaField({
        // Currently focused spell/effect
        active: new fields.ArrayField(
          new fields.SchemaField({
            spellId: new fields.StringField({ required: false, blank: true }),
            spellName: new fields.StringField({ required: true }),
            target: new fields.StringField({ required: false, blank: true }), // Target ID or description
            manaCostPerRound: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
            requiresSaveCheck: new fields.BooleanField({ initial: false }), // Cast Check each Round?
            canBeBroken: new fields.BooleanField({ initial: true }), // Can Focus be broken by damage?
          }),
          { initial: [] }
        ),
        // Maximum concurrent focus (usually 1, Ancient Growth = 2)
        maxConcurrent: new fields.NumberField({ integer: true, initial: 1, min: 1 }),
      }),

      // Progression tracking for leveling
      progression: new fields.SchemaField({
        // XP pacing determines XP required per level
        xpPacing: new fields.StringField({
          initial: "normal",
          choices: ["quick", "normal", "epic", "saga"],
        }),
        // Track which perks were gained at which level
        perksGainedByLevel: new fields.ObjectField({ initial: {} }), // { "3": ["perkId1"], "5": ["perkId2"] }
        // Track which stats were increased at which level
        statIncreasesByLevel: new fields.ObjectField({ initial: {} }), // { "2": "might", "4": "dexterity" }
      }),

      // Senses - binary toggles, may be granted by perks/traits
      senses: new fields.SchemaField({
        allsight: new fields.BooleanField({ initial: false }),
        blindsight: new fields.BooleanField({ initial: false }),
        darkvision: new fields.BooleanField({ initial: false }), // Dwarf, Goblin, Orc, Infravision perk
        echolocation: new fields.BooleanField({ initial: false }),
        seismicsense: new fields.BooleanField({ initial: false }),
        telepathy: new fields.BooleanField({ initial: false }),
      }),

      // Known languages
      languages: new fields.ArrayField(new fields.StringField(), { initial: ["Common"] }),

      // Rest and breather tracking
      restTracking: new fields.SchemaField({
        // Timestamp of last full rest
        lastRest: new fields.StringField({ required: false, blank: true }),
        // Number of breathers taken in current combat/scene
        breathersTaken: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        // Bonuses to rest (Song of Rest, Tricksy, etc.)
        restBonuses: new fields.ArrayField(
          new fields.SchemaField({
            source: new fields.StringField({ required: true }), // "Song of Rest", "Tricksy"
            effect: new fields.StringField({ required: true }), // "+PRS HP", "+1 Luck"
          }),
          { initial: [] }
        ),
      }),

      // Travel and exploration tracking
      travel: new fields.SchemaField({
        // Miles traveled today (for Padfoot perk)
        milesThisDay: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        // Current travel pace
        pace: new fields.StringField({
          initial: "normal",
          choices: ["slow", "normal", "fast"],
        }),
        // Can forage at normal pace (Hunter Survivalist)
        canForage: new fields.BooleanField({ initial: false }),
        // Shifts elapsed (time tracking for cooldowns)
        shiftsElapsed: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
      }),

      // Crafting projects in progress
      crafting: new fields.SchemaField({
        activeProjects: new fields.ArrayField(
          new fields.SchemaField({
            itemName: new fields.StringField({ required: true }),
            targetValue: new fields.NumberField({ integer: true, initial: 0 }), // In silver
            materialsCost: new fields.NumberField({ integer: true, initial: 0 }),
            shiftsRequired: new fields.NumberField({ integer: true, initial: 1 }),
            shiftsCompleted: new fields.NumberField({ integer: true, initial: 0 }),
            bonuses: new fields.ArrayField(
              new fields.SchemaField({
                source: new fields.StringField({ required: true }), // "Master Artisan"
                effect: new fields.StringField({ required: true }), // "2× Shifts"
              }),
              { initial: [] }
            ),
          }),
          { initial: [] }
        ),
      }),

      // Combat positioning and flanking
      combat: new fields.SchemaField({
        // Is this character currently flanked?
        isFlanked: new fields.BooleanField({ initial: false }),
        // IDs of allies providing flanking
        flankingAllies: new fields.ArrayField(new fields.StringField(), { initial: [] }),
        // Ignores flanking penalties (Situational Awareness perk)
        ignoresFlankingPenalty: new fields.BooleanField({ initial: false }),
        // Current combat zone (nullable - not in combat if null)
        currentZone: new fields.StringField({
          required: false,
          nullable: true,
          blank: false,
          initial: null,
          choices: ["frontline", "midline", "backline"],
        }),
        // Is dual-wielding?
        isDualWielding: new fields.BooleanField({ initial: false }),
        // Main hand weapon ID
        mainHandWeapon: new fields.StringField({ required: false, blank: true }),
        // Off hand weapon/shield ID
        offHandWeapon: new fields.StringField({ required: false, blank: true }),
      }),

      // Casting and spell component tracking
      casting: new fields.SchemaField({
        // Currently equipped trinket item ID
        equippedTrinket: new fields.StringField({ required: false, blank: true }),
        // Can cast through weapon (Gish perk)
        canCastThroughWeapon: new fields.BooleanField({ initial: false }),
        // Can cast through musical instrument (Harmonic Resonance)
        canCastThroughInstrument: new fields.BooleanField({ initial: false }),
      }),

      // Downtime activity tracking
      downtime: new fields.SchemaField({
        activities: new fields.ArrayField(
          new fields.SchemaField({
            type: new fields.StringField({
              initial: "work",
              choices: ["craft", "study", "carouse", "work", "research"],
            }),
            shiftsSpent: new fields.NumberField({ integer: true, initial: 0 }),
            result: new fields.StringField({ required: false, blank: true }),
          }),
          { initial: [] }
        ),
      }),

      // Quest tracking (for cooldowns like Medium perk)
      quests: new fields.SchemaField({
        activeQuests: new fields.ArrayField(new fields.StringField(), { initial: [] }),
        completedQuests: new fields.ArrayField(new fields.StringField(), { initial: [] }),
        // For Medium perk cooldown
        lastQuestCompleted: new fields.StringField({ required: false, blank: true }),
      }),

      // Death and dying state
      death: new fields.SchemaField({
        isDead: new fields.BooleanField({ initial: false }),
        deathCause: new fields.StringField({
          required: false,
          nullable: true,
          blank: false,
          initial: null,
          choices: ["hp-zero", "body-destroyed", "fatigue-five"],
        }),
        canBeRevived: new fields.BooleanField({ initial: true }),
        revivedCount: new fields.NumberField({ integer: true, initial: 0, min: 0 }),
        // Luminary Revivify used today?
        luminaryRevivifyUsed: new fields.BooleanField({ initial: false }),
        // Force of Nature used this combat?
        forceOfNatureUsed: new fields.BooleanField({ initial: false }),
      }),

      // Summoned creatures tracking
      summons: new fields.SchemaField({
        active: new fields.ArrayField(
          new fields.SchemaField({
            id: new fields.StringField({ required: true }),
            name: new fields.StringField({ required: true }),
            type: new fields.StringField({
              initial: "beast",
              choices: ["companion", "familiar", "primordial", "beast", "undead"],
            }),
            source: new fields.StringField({ required: true }), // "Animal Companion", "Familiar perk"
            hd: new fields.NumberField({ integer: true, initial: 1 }),
            currentHP: new fields.NumberField({ integer: true, initial: 4 }),
            maxHP: new fields.NumberField({ integer: true, initial: 4 }),
            usesSkill: new fields.StringField({ initial: "survival" }), // Which skill for checks
            commandMethod: new fields.StringField({
              initial: "action",
              choices: ["action", "skip-move", "automatic"],
            }),
            duration: new fields.StringField({
              initial: "permanent",
              choices: ["permanent", "focus", "shift", "scene"],
            }),
          }),
          { initial: [] }
        ),
        maxConcurrent: new fields.NumberField({ integer: true, initial: 1, min: 1 }),
      }),

      // Preferred combat zone (from class)
      preferredZone: new fields.StringField({
        initial: "frontline",
        choices: ["frontline", "midline", "backline", "flexible"],
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

    // Calculate Walking Speed based on Dexterity
    const speedByDex = CONFIG.VAGABOND?.speedByDex || { 2: 25, 3: 25, 4: 30, 5: 30, 6: 35, 7: 35 };
    const dexValue = Math.max(2, Math.min(7, stats.dexterity.value));
    this.speed.walk = (speedByDex[dexValue] || 30) + this.speed.bonus;

    // Calculate Item Slots: 8 + Might - Fatigue + bonus
    const baseSlots = CONFIG.VAGABOND?.baseItemSlots || 8;
    // Sum up all bonus sources
    const totalBonus = this.itemSlots.bonuses.reduce((sum, b) => sum + b.value, 0);
    this.itemSlots.bonus = totalBonus;
    this.itemSlots.max =
      baseSlots + stats.might.value - this.resources.fatigue.value + this.itemSlots.bonus;
    // Check if overburdened
    this.itemSlots.overburdened = this.itemSlots.used > this.itemSlots.max;

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

    // Calculate Skill Difficulties (also clamps skill crit thresholds)
    this._calculateSkillDifficulties();

    // Calculate Attack Difficulties (also clamps attack crit thresholds)
    this._calculateAttackDifficulties();
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

      // Clamp crit threshold after Active Effects (schema min doesn't apply to effect-modified data)
      skillData.critThreshold = Math.max(1, Math.min(20, skillData.critThreshold));
    }
  }

  /**
   * Calculate difficulty values for all attack skills.
   * Untrained: 20 - stat
   * Trained: 20 - (stat × 2)
   * Also clamps crit thresholds after Active Effects.
   *
   * @private
   */
  _calculateAttackDifficulties() {
    const attackStats = CONFIG.VAGABOND?.attackTypes || {};

    for (const [attackId, attackData] of Object.entries(this.attacks)) {
      const attackConfig = attackStats[attackId];
      if (!attackConfig) continue;

      const statKey = attackConfig.stat;
      const statValue = this.stats[statKey]?.value || 0;
      const trained = attackData.trained;

      // Calculate difficulty: 20 - stat (untrained) or 20 - stat×2 (trained)
      attackData.difficulty = trained ? 20 - statValue * 2 : 20 - statValue;

      // Clamp crit threshold after Active Effects (schema min doesn't apply to effect-modified data)
      attackData.critThreshold = Math.max(1, Math.min(20, attackData.critThreshold));
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
