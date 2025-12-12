/**
 * Perk Item Data Model
 *
 * Defines the data schema for perks (feats/talents) in Vagabond RPG.
 * Characters gain 1 perk at odd levels (1, 3, 5, 7, 9).
 *
 * Perks have prerequisites that may include:
 * - Minimum stat values
 * - Training in specific skills
 * - Knowledge of specific spells
 * - Other perks
 *
 * @extends VagabondItemBase
 */
import VagabondItemBase from "./base-item.mjs";

export default class PerkData extends VagabondItemBase {
  /**
   * Define the schema for perk items.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Prerequisites
      prerequisites: new fields.SchemaField({
        // Stat requirements (e.g., { might: 4, dexterity: 3 })
        stats: new fields.SchemaField({
          might: new fields.NumberField({ integer: true, nullable: true, initial: null }),
          dexterity: new fields.NumberField({ integer: true, nullable: true, initial: null }),
          awareness: new fields.NumberField({ integer: true, nullable: true, initial: null }),
          reason: new fields.NumberField({ integer: true, nullable: true, initial: null }),
          presence: new fields.NumberField({ integer: true, nullable: true, initial: null }),
          luck: new fields.NumberField({ integer: true, nullable: true, initial: null }),
        }),

        // Required skill training (array of skill IDs)
        trainedSkills: new fields.ArrayField(new fields.StringField(), { initial: [] }),

        // Required spells (array of spell names)
        spells: new fields.ArrayField(new fields.StringField(), { initial: [] }),

        // Required other perks (array of perk names)
        perks: new fields.ArrayField(new fields.StringField(), { initial: [] }),

        // Custom prerequisite text (for complex requirements)
        custom: new fields.StringField({ required: false, blank: true }),
      }),

      // Mechanical effects (as Active Effect changes)
      changes: new fields.ArrayField(
        new fields.SchemaField({
          key: new fields.StringField({ required: true }),
          mode: new fields.NumberField({ integer: true, initial: 2 }),
          value: new fields.StringField({ required: true }),
        }),
        { initial: [] }
      ),

      // Is this perk passive or does it require activation?
      passive: new fields.BooleanField({ initial: true }),

      // Usage tracking (for limited-use perks)
      uses: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 0 }),
        max: new fields.NumberField({ integer: true, initial: 0 }),
        per: new fields.StringField({ initial: "" }), // "short", "long", "day", ""
      }),

      // Tags for categorization
      tags: new fields.ArrayField(new fields.StringField(), { initial: [] }),
    };
  }

  /**
   * Check if a character meets this perk's prerequisites.
   *
   * @param {Object} actorData - The actor's system data
   * @returns {Object} Result with 'met' boolean and 'missing' array of unmet requirements
   */
  checkPrerequisites(actorData) {
    const missing = [];

    // Check stat requirements
    for (const [stat, required] of Object.entries(this.prerequisites.stats)) {
      if (required !== null && required > 0) {
        const actorStat = actorData.stats?.[stat]?.value || 0;
        if (actorStat < required) {
          missing.push(`${stat.charAt(0).toUpperCase() + stat.slice(1)} ${required}`);
        }
      }
    }

    // Check skill training requirements
    for (const skillId of this.prerequisites.trainedSkills) {
      const skill = actorData.skills?.[skillId];
      if (!skill?.trained) {
        missing.push(`Trained in ${skillId}`);
      }
    }

    // Note: Spell and perk prerequisites would need item checks on the parent actor
    // These are tracked but validation requires access to actor items

    if (this.prerequisites.spells.length > 0) {
      missing.push(`Spells: ${this.prerequisites.spells.join(", ")}`);
    }

    if (this.prerequisites.perks.length > 0) {
      missing.push(`Perks: ${this.prerequisites.perks.join(", ")}`);
    }

    if (this.prerequisites.custom) {
      missing.push(this.prerequisites.custom);
    }

    return {
      met: missing.length === 0,
      missing,
    };
  }

  /**
   * Get a formatted string of prerequisites for display.
   *
   * @returns {string} Formatted prerequisite string
   */
  getPrerequisiteString() {
    const parts = [];

    // Stat requirements
    for (const [stat, required] of Object.entries(this.prerequisites.stats)) {
      if (required !== null && required > 0) {
        const abbr = stat.substring(0, 3).toUpperCase();
        parts.push(`${abbr} ${required}`);
      }
    }

    // Skill training
    for (const skill of this.prerequisites.trainedSkills) {
      parts.push(`Trained: ${skill}`);
    }

    // Spells
    for (const spell of this.prerequisites.spells) {
      parts.push(`Spell: ${spell}`);
    }

    // Perks
    for (const perk of this.prerequisites.perks) {
      parts.push(`Perk: ${perk}`);
    }

    // Custom
    if (this.prerequisites.custom) {
      parts.push(this.prerequisites.custom);
    }

    return parts.length > 0 ? parts.join(", ") : "None";
  }

  /**
   * Get chat card data for displaying perk information.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    const data = super.getChatData();

    data.prerequisites = this.getPrerequisiteString();
    data.passive = this.passive;

    return data;
  }
}
