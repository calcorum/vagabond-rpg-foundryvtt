/**
 * Status Item Data Model
 *
 * Defines the data schema for status conditions in Vagabond RPG.
 * Statuses represent temporary conditions like Blinded, Prone, Frightened, etc.
 * that can be applied to actors and modify their capabilities.
 *
 * Core Rulebook Reference: Status conditions (p.36)
 *
 * @extends VagabondItemBase
 */
import VagabondItemBase from "./base-item.mjs";

export default class StatusData extends VagabondItemBase {
  /**
   * Define the schema for status items.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Icon for display on actor sheets and tokens
      // Uses Foundry's built-in icon path format
      icon: new fields.StringField({
        required: false,
        blank: true,
        initial: "icons/svg/hazard.svg",
      }),

      // Active Effect changes this status applies when added to an actor
      // These are the mechanical effects that can be automated
      changes: new fields.ArrayField(
        new fields.SchemaField({
          key: new fields.StringField({ required: true }),
          mode: new fields.NumberField({
            integer: true,
            initial: 2, // CONST.ACTIVE_EFFECT_MODES.ADD
          }),
          value: new fields.StringField({ required: true }),
          priority: new fields.NumberField({ integer: true, nullable: true }),
        }),
        { initial: [] }
      ),

      // Statuses that this status includes (composite statuses)
      // e.g., Unconscious includes Blinded, Incapacitated, Prone
      // Store as array of status names for lookup
      includesStatuses: new fields.ArrayField(new fields.StringField(), { initial: [] }),

      // Special flags for rules that can't be expressed as Active Effects
      // These serve as hints for the GM and can be checked programmatically
      flags: new fields.SchemaField({
        // Movement restrictions
        cantMove: new fields.BooleanField({ initial: false }),
        cantRush: new fields.BooleanField({ initial: false }),
        speedZero: new fields.BooleanField({ initial: false }),
        crawlOnly: new fields.BooleanField({ initial: false }),

        // Action restrictions
        cantFocus: new fields.BooleanField({ initial: false }),
        cantUseActions: new fields.BooleanField({ initial: false }),
        onlyAttackMoveRush: new fields.BooleanField({ initial: false }),

        // Sense restrictions
        cantSee: new fields.BooleanField({ initial: false }),

        // Combat modifiers
        isVulnerable: new fields.BooleanField({ initial: false }),
        closeAttacksAutoCrit: new fields.BooleanField({ initial: false }),
        failsMightDexChecks: new fields.BooleanField({ initial: false }),

        // Morale
        noMoraleChecks: new fields.BooleanField({ initial: false }),
        immuneToFrightened: new fields.BooleanField({ initial: false }),

        // Other
        cantAttackCharmer: new fields.BooleanField({ initial: false }),
        reducesItemSlots: new fields.BooleanField({ initial: false }),
      }),

      // Favor/Hinder modifiers (for roll dialogs to check)
      favorHinder: new fields.SchemaField({
        // Applies Hinder to the afflicted creature's rolls
        hinderChecks: new fields.BooleanField({ initial: false }),
        hinderSaves: new fields.BooleanField({ initial: false }),
        hinderAttacks: new fields.BooleanField({ initial: false }),

        // Applies Favor to rolls against the afflicted creature
        favorAgainstChecks: new fields.BooleanField({ initial: false }),
        favorAgainstSaves: new fields.BooleanField({ initial: false }),
        favorAgainstAttacks: new fields.BooleanField({ initial: false }),

        // Specific contexts (for conditional application)
        context: new fields.StringField({
          required: false,
          blank: true,
          initial: "",
        }),
      }),

      // Damage or healing modifiers (flat bonuses/penalties)
      modifiers: new fields.SchemaField({
        damageDealt: new fields.NumberField({ integer: true, initial: 0 }),
        healingReceived: new fields.NumberField({ integer: true, initial: 0 }),
      }),

      // Periodic effects (for statuses like Burning, Suffocating)
      periodic: new fields.SchemaField({
        // When does the effect trigger?
        trigger: new fields.StringField({
          required: false,
          nullable: true,
          blank: false,
          initial: null,
          choices: ["startOfTurn", "endOfTurn", "eachRound"],
        }),
        // What type of effect?
        type: new fields.StringField({
          required: false,
          nullable: true,
          blank: false,
          initial: null,
          choices: ["damage", "fatigue", "healing", "check"],
        }),
        // Dice formula or flat value
        value: new fields.StringField({ required: false, blank: true }),
        // Description of what happens
        effectDescription: new fields.StringField({ required: false, blank: true }),
      }),

      // Duration tracking (for time-limited statuses)
      duration: new fields.SchemaField({
        type: new fields.StringField({
          required: false,
          nullable: true,
          blank: false,
          initial: null,
          choices: ["rounds", "minutes", "hours", "untilRest", "untilRemoved", "special"],
        }),
        value: new fields.NumberField({ integer: true, nullable: true }),
        remaining: new fields.NumberField({ integer: true, nullable: true }),
      }),

      // Stacking behavior
      stackable: new fields.BooleanField({ initial: false }),
      maxStacks: new fields.NumberField({ integer: true, initial: 1, min: 1 }),

      // Reference to the rulebook page for quick lookup
      reference: new fields.StringField({
        required: false,
        blank: true,
        initial: "Core Rulebook p.36",
      }),
    };
  }

  /**
   * Get a summary of this status's effects for display.
   *
   * @returns {string[]} Array of effect descriptions
   */
  getEffectSummary() {
    const effects = [];

    // Movement effects
    if (this.flags.speedZero) effects.push("Speed is 0");
    if (this.flags.cantMove) effects.push("Cannot move");
    if (this.flags.cantRush) effects.push("Cannot Rush");
    if (this.flags.crawlOnly) effects.push("Can only crawl");

    // Action effects
    if (this.flags.cantFocus) effects.push("Cannot Focus");
    if (this.flags.cantUseActions) effects.push("Cannot use Actions");
    if (this.flags.onlyAttackMoveRush) effects.push("Can only Attack, Move, and Rush");

    // Sense effects
    if (this.flags.cantSee) effects.push("Cannot see");

    // Combat effects
    if (this.flags.isVulnerable) effects.push("Is Vulnerable");
    if (this.flags.closeAttacksAutoCrit) effects.push("Close Attacks auto-crit");
    if (this.flags.failsMightDexChecks) effects.push("Fails Might and Dexterity Checks");

    // Favor/Hinder
    if (this.favorHinder.hinderChecks) effects.push("Hinder on Checks");
    if (this.favorHinder.hinderSaves) effects.push("Hinder on Saves");
    if (this.favorHinder.favorAgainstAttacks) effects.push("Attacks against have Favor");
    if (this.favorHinder.favorAgainstSaves) effects.push("Saves against have Favor");

    // Modifiers
    if (this.modifiers.damageDealt !== 0) {
      effects.push(`${this.modifiers.damageDealt} to damage dealt`);
    }
    if (this.modifiers.healingReceived !== 0) {
      effects.push(`${this.modifiers.healingReceived} to healing received`);
    }

    // Periodic effects
    if (this.periodic.trigger && this.periodic.effectDescription) {
      effects.push(this.periodic.effectDescription);
    }

    // Included statuses
    if (this.includesStatuses.length > 0) {
      effects.push(`Includes: ${this.includesStatuses.join(", ")}`);
    }

    return effects;
  }

  /**
   * Check if this status has any Active Effect changes.
   *
   * @returns {boolean} True if status has mechanical effects
   */
  hasActiveEffects() {
    return this.changes.length > 0;
  }

  /**
   * Check if this status is a composite (includes other statuses).
   *
   * @returns {boolean} True if this status includes other statuses
   */
  isComposite() {
    return this.includesStatuses.length > 0;
  }

  /**
   * Check if this status has periodic effects.
   *
   * @returns {boolean} True if status has periodic effects
   */
  hasPeriodic() {
    return this.periodic.trigger !== null && this.periodic.type !== null;
  }

  /**
   * Get chat card data for displaying status information.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    const data = super.getChatData();

    data.icon = this.icon;
    data.effects = this.getEffectSummary();
    data.reference = this.reference;

    if (this.duration.type) {
      data.duration =
        this.duration.type === "special"
          ? "Special"
          : `${this.duration.value} ${this.duration.type}`;
    }

    return data;
  }
}
