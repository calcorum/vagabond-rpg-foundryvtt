/**
 * Class Item Data Model
 *
 * Defines the data schema for character classes in Vagabond RPG.
 * Classes are designed as draggable items that can be added to characters.
 *
 * Each class provides:
 * - Key stat recommendation
 * - Action style (casting skill for casters)
 * - Preferred combat zone
 * - Training grants (skills trained)
 * - Starting equipment pack
 * - Progression table (level 1-10)
 *
 * @extends VagabondItemBase
 */
import VagabondItemBase from "./base-item.mjs";

export default class ClassData extends VagabondItemBase {
  /**
   * Define the schema for class items.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Key stat recommendation for this class
      keyStat: new fields.StringField({
        required: true,
        initial: "might",
      }),

      // Action style / casting skill (for casters)
      // e.g., "arcana" for Wizard, "mysticism" for Druid, "influence" for Sorcerer
      actionStyle: new fields.StringField({
        required: false,
        blank: true,
      }),

      // Preferred combat zone
      zone: new fields.StringField({
        required: true,
        initial: "frontline",
        choices: ["frontline", "midline", "backline"],
      }),

      // Skills trained by this class (array of skill IDs)
      trainedSkills: new fields.ArrayField(new fields.StringField(), { initial: [] }),

      // Starting equipment pack description
      startingPack: new fields.HTMLField({ required: false, blank: true }),

      // Is this a spellcasting class?
      isCaster: new fields.BooleanField({ initial: false }),

      // Progression table - level-by-level benefits
      progression: new fields.ArrayField(
        new fields.SchemaField({
          level: new fields.NumberField({ integer: true, min: 1, max: 10 }),
          mana: new fields.NumberField({ integer: true, initial: 0 }),
          castingMax: new fields.NumberField({ integer: true, initial: 0 }),
          spellsKnown: new fields.NumberField({ integer: true, initial: 0 }),
          features: new fields.ArrayField(new fields.StringField(), { initial: [] }),
        }),
        { initial: [] }
      ),

      // Class features - detailed definitions
      features: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true }),
          level: new fields.NumberField({ integer: true, min: 1, max: 10 }),
          description: new fields.HTMLField({ required: true }),
          passive: new fields.BooleanField({ initial: true }),
          // Active Effect changes this feature applies
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

      // Resource this class uses (if any) - e.g., "Studied Dice" for Alchemist
      customResource: new fields.SchemaField({
        name: new fields.StringField({ required: false }),
        max: new fields.StringField({ required: false }), // Can be a formula like "@level"
      }),
    };
  }

  /**
   * Get the features available at a given level.
   *
   * @param {number} level - Character level to check
   * @returns {Array} Array of features available at or before this level
   */
  getFeaturesAtLevel(level) {
    return this.features.filter((f) => f.level <= level);
  }

  /**
   * Get the progression entry for a given level.
   *
   * @param {number} level - Character level to check
   * @returns {Object|null} Progression data for the level
   */
  getProgressionAtLevel(level) {
    return this.progression.find((p) => p.level === level) || null;
  }

  /**
   * Get cumulative mana pool at a given level.
   *
   * @param {number} level - Character level
   * @returns {number} Total mana pool
   */
  getManaAtLevel(level) {
    let totalMana = 0;
    for (const prog of this.progression) {
      if (prog.level <= level) {
        totalMana += prog.mana || 0;
      }
    }
    return totalMana;
  }

  /**
   * Get casting max at a given level.
   *
   * @param {number} level - Character level
   * @returns {number} Casting max (max mana per spell)
   */
  getCastingMaxAtLevel(level) {
    let castingMax = 0;
    for (const prog of this.progression) {
      if (prog.level <= level && prog.castingMax > castingMax) {
        castingMax = prog.castingMax;
      }
    }
    return castingMax;
  }

  /**
   * Get chat card data for displaying class information.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    const data = super.getChatData();

    data.keyStat = this.keyStat;
    data.zone = this.zone;
    data.isCaster = this.isCaster;
    data.trainedSkills = this.trainedSkills;

    return data;
  }
}
