/**
 * Armor Item Data Model
 *
 * Defines the data schema for armor in Vagabond RPG.
 *
 * Armor Types:
 * - Light: Basic protection, no dodge penalty
 * - Heavy: Better protection, may have dodge penalty
 * - Shield: Adds to armor, held in hand
 *
 * @extends VagabondItemBase
 */
import VagabondItemBase from "./base-item.mjs";

export default class ArmorData extends VagabondItemBase {
  /**
   * Define the schema for armor items.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Armor value provided
      armorValue: new fields.NumberField({
        required: true,
        integer: true,
        initial: 1,
        min: 0,
      }),

      // Armor type (light, heavy, shield)
      armorType: new fields.StringField({
        required: true,
        initial: "light",
        choices: ["light", "heavy", "shield"],
      }),

      // Does this armor impose a dodge penalty?
      dodgePenalty: new fields.BooleanField({ initial: false }),

      // Inventory slot cost
      slots: new fields.NumberField({
        integer: true,
        initial: 1,
        min: 0,
      }),

      // Monetary value (in copper)
      value: new fields.NumberField({
        integer: true,
        initial: 0,
        min: 0,
      }),

      // Is this armor equipped?
      equipped: new fields.BooleanField({ initial: false }),

      // Bonus effects (magical armor)
      magicBonus: new fields.NumberField({
        integer: true,
        initial: 0,
      }),

      // Special properties or enchantments
      properties: new fields.ArrayField(new fields.StringField(), { initial: [] }),
    };
  }

  /**
   * Get the total armor value including magic bonus.
   *
   * @returns {number} Total armor value
   */
  getTotalArmorValue() {
    return this.armorValue + this.magicBonus;
  }

  /**
   * Get the effective armor when equipped.
   *
   * @returns {number} Armor value if equipped, 0 otherwise
   */
  getEquippedArmor() {
    return this.equipped ? this.getTotalArmorValue() : 0;
  }

  /**
   * Calculate slot cost when equipped.
   *
   * @returns {number} Slot cost
   */
  getEquippedSlots() {
    return this.equipped ? this.slots : 0;
  }

  /**
   * Check if this armor imposes dodge penalty when equipped.
   *
   * @returns {boolean} True if equipped and has dodge penalty
   */
  hasActiveDodgePenalty() {
    return this.equipped && this.dodgePenalty;
  }

  /**
   * Get chat card data for displaying armor information.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    const data = super.getChatData();

    data.armorValue = this.getTotalArmorValue();
    data.armorType = this.armorType;
    data.dodgePenalty = this.dodgePenalty;
    data.properties = this.properties;

    return data;
  }
}
