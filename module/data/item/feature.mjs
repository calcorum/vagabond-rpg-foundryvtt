/**
 * Feature Item Data Model
 *
 * Defines the data schema for class features and abilities in Vagabond RPG.
 * Features are granted by classes at specific levels and can provide
 * passive bonuses or active abilities.
 *
 * @extends VagabondItemBase
 */
import VagabondItemBase from "./base-item.mjs";

export default class FeatureData extends VagabondItemBase {
  /**
   * Define the schema for feature items.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Source class that grants this feature
      sourceClass: new fields.StringField({
        required: false,
        blank: true,
      }),

      // Level at which this feature is gained
      level: new fields.NumberField({
        required: true,
        integer: true,
        initial: 1,
        min: 1,
        max: 10,
      }),

      // Is this a passive or active feature?
      passive: new fields.BooleanField({ initial: true }),

      // For active features: activation type
      activation: new fields.SchemaField({
        type: new fields.StringField({
          initial: "",
          choices: ["", "action", "bonus", "reaction", "free", "special"],
        }),
        cost: new fields.StringField({ required: false, blank: true }),
      }),

      // Usage tracking (for limited-use features)
      uses: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 0 }),
        max: new fields.NumberField({ integer: true, initial: 0 }),
        per: new fields.StringField({
          initial: "",
          choices: ["", "short", "long", "day", "encounter"],
        }),
      }),

      // Active Effect changes this feature applies
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

      // Requirements beyond level (e.g., specific class choices)
      requirements: new fields.StringField({
        required: false,
        blank: true,
      }),

      // Tags for categorization
      tags: new fields.ArrayField(new fields.StringField(), { initial: [] }),
    };
  }

  /**
   * Check if this feature has uses that can be tracked.
   *
   * @returns {boolean} True if feature has limited uses
   */
  hasUses() {
    return this.uses.max > 0;
  }

  /**
   * Check if this feature has remaining uses.
   *
   * @returns {boolean} True if uses remain or feature is unlimited
   */
  hasRemainingUses() {
    if (!this.hasUses()) return true;
    return this.uses.value > 0;
  }

  /**
   * Use one charge of this feature.
   *
   * @returns {Object} Result with success and new value
   */
  use() {
    if (!this.hasUses()) {
      return { success: true, unlimited: true };
    }

    if (this.uses.value <= 0) {
      return { success: false, reason: "No uses remaining" };
    }

    return {
      success: true,
      newValue: this.uses.value - 1,
      remaining: this.uses.value - 1,
    };
  }

  /**
   * Get the recovery text for this feature's uses.
   *
   * @returns {string} Recovery description
   */
  getRecoveryText() {
    if (!this.hasUses()) return "";

    const perText = {
      short: "per short rest",
      long: "per long rest",
      day: "per day",
      encounter: "per encounter",
    };

    return perText[this.uses.per] || "";
  }

  /**
   * Get chat card data for displaying feature information.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    const data = super.getChatData();

    data.sourceClass = this.sourceClass;
    data.level = this.level;
    data.passive = this.passive;

    if (!this.passive && this.activation.type) {
      data.activation = this.activation.type;
    }

    if (this.hasUses()) {
      data.uses = `${this.uses.value}/${this.uses.max} ${this.getRecoveryText()}`;
    }

    return data;
  }
}
