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

      // Armor type (none, light, medium, heavy, shield)
      armorType: new fields.StringField({
        required: true,
        initial: "light",
        choices: ["none", "light", "medium", "heavy", "shield"],
      }),

      // Does this armor impose a dodge penalty? (auto-set based on type for heavy)
      dodgePenalty: new fields.BooleanField({ initial: false }),

      // Hinders dodge saves (heavy armor hinders, medium may partially)
      hindersDodge: new fields.BooleanField({ initial: false }),

      // Prevents certain abilities (Barbarian Rage requires light or no armor)
      preventsRage: new fields.BooleanField({ initial: false }),

      // Inventory slot cost
      slots: new fields.NumberField({
        integer: true,
        initial: 1,
        min: 0,
      }),

      // Slot cost when equipped (null means same as slots)
      // Allows magic armor to reduce slot cost when worn
      slotsWhenEquipped: new fields.NumberField({
        integer: true,
        initial: null,
        nullable: true,
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

      // Relic System - Powerful magic items with unique abilities
      relic: new fields.SchemaField({
        // Is this item a relic?
        isRelic: new fields.BooleanField({ initial: false }),

        // Relic tier (determines power level)
        tier: new fields.NumberField({
          integer: true,
          initial: 1,
          min: 1,
          max: 5,
        }),

        // Unique ability name
        abilityName: new fields.StringField({ required: false, blank: true }),

        // Unique ability description
        abilityDescription: new fields.HTMLField({ required: false, blank: true }),

        // Activation cost (mana, luck, etc.)
        activationCost: new fields.StringField({ required: false, blank: true }),

        // Uses per day (0 = unlimited or passive)
        usesPerDay: new fields.NumberField({ integer: true, initial: 0, min: 0 }),

        // Current uses remaining
        usesRemaining: new fields.NumberField({ integer: true, initial: 0, min: 0 }),

        // Attunement required?
        requiresAttunement: new fields.BooleanField({ initial: false }),

        // Currently attuned?
        attuned: new fields.BooleanField({ initial: false }),

        // Lore/history of the relic
        lore: new fields.HTMLField({ required: false, blank: true }),
      }),
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
   * Calculate the total inventory slot cost for this armor.
   * Respects slotsWhenEquipped for magic armor that reduces slot cost when worn.
   *
   * @returns {number} Total slots used
   */
  getTotalSlots() {
    if (this.equipped && this.slotsWhenEquipped !== null) {
      return this.slotsWhenEquipped;
    }
    return this.slots || 0;
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
