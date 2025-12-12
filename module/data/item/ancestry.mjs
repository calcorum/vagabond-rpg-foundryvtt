/**
 * Ancestry Item Data Model
 *
 * Defines the data schema for character ancestries (races) in Vagabond RPG.
 * Examples: Human, Dwarf, Elf, Halfling, Draken, Goblin, Orc
 *
 * Ancestries provide:
 * - Being type classification
 * - Size category
 * - Racial traits (abilities/features)
 *
 * @extends VagabondItemBase
 */
import VagabondItemBase from "./base-item.mjs";

export default class AncestryData extends VagabondItemBase {
  /**
   * Define the schema for ancestry items.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Being type (Humanlike, Fae, Cryptid, etc.)
      beingType: new fields.StringField({
        required: true,
        initial: "humanlike",
      }),

      // Size category
      size: new fields.StringField({
        required: true,
        initial: "medium",
      }),

      // Racial traits - abilities granted by this ancestry
      traits: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true }),
          description: new fields.HTMLField({ required: true }),
        }),
        { initial: [] }
      ),
    };
  }

  /**
   * Get chat card data for displaying ancestry information.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    const data = super.getChatData();

    data.beingType = this.beingType;
    data.size = this.size;
    data.traits = this.traits;

    return data;
  }
}
