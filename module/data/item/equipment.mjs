/**
 * Equipment Item Data Model
 *
 * Defines the data schema for generic equipment/gear in Vagabond RPG.
 * This covers adventuring gear, tools, consumables, and miscellaneous items.
 *
 * Examples: Rope, Torches, Potions, Lockpicks, Rations
 *
 * @extends VagabondItemBase
 */
import VagabondItemBase from "./base-item.mjs";

export default class EquipmentData extends VagabondItemBase {
  /**
   * Define the schema for equipment items.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Item quantity
      quantity: new fields.NumberField({
        required: true,
        integer: true,
        initial: 1,
        min: 0,
      }),

      // Inventory slot cost (per item or per stack)
      slots: new fields.NumberField({
        integer: true,
        initial: 1,
        min: 0,
      }),

      // Slot cost when equipped (null means same as slots)
      // Used for items like backpacks that cost 0 slots when worn
      slotsWhenEquipped: new fields.NumberField({
        integer: true,
        initial: null,
        nullable: true,
        min: 0,
      }),

      // Whether slots are per-item or for the whole stack
      slotsPerItem: new fields.BooleanField({ initial: false }),

      // Monetary value per item (in copper)
      value: new fields.NumberField({
        integer: true,
        initial: 0,
        min: 0,
      }),

      // Is this a consumable item?
      consumable: new fields.BooleanField({ initial: false }),

      // For consumables: uses remaining
      uses: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 0 }),
        max: new fields.NumberField({ integer: true, initial: 0 }),
        autoDestroy: new fields.BooleanField({ initial: true }),
      }),

      // Equipment category for organization
      category: new fields.StringField({
        initial: "gear",
        choices: ["gear", "tool", "consumable", "container", "treasure", "misc"],
      }),

      // Is this item currently equipped/active?
      equipped: new fields.BooleanField({ initial: false }),

      // Container capacity (if this is a container)
      containerCapacity: new fields.NumberField({
        integer: true,
        initial: 0,
        min: 0,
      }),

      // Tags for filtering/searching
      tags: new fields.ArrayField(new fields.StringField(), { initial: [] }),

      // Is this item a valid spell casting trinket?
      isTrinket: new fields.BooleanField({ initial: false }),

      // Can spells be cast through this item? (for Familiars, Gish weapons)
      canCastThrough: new fields.BooleanField({ initial: false }),

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
   * Calculate the total slot cost for this item stack.
   * Respects slotsWhenEquipped for items like backpacks that cost
   * less (or zero) slots when worn.
   *
   * @returns {number} Total slots used
   */
  getTotalSlots() {
    // Use slotsWhenEquipped if item is equipped and the field is set
    const baseSlots =
      this.equipped && this.slotsWhenEquipped !== null ? this.slotsWhenEquipped : this.slots;

    if (this.slotsPerItem) {
      return baseSlots * this.quantity;
    }
    return baseSlots;
  }

  /**
   * Calculate the total value of this item stack.
   *
   * @returns {number} Total value in copper
   */
  getTotalValue() {
    return this.value * this.quantity;
  }

  /**
   * Consume one use of a consumable item.
   *
   * @returns {Object} Result with new values
   */
  consume() {
    if (!this.consumable) {
      return { consumed: false, reason: "Not consumable" };
    }

    if (this.uses.max > 0) {
      // Uses-based consumable
      if (this.uses.value <= 0) {
        return { consumed: false, reason: "No uses remaining" };
      }
      return {
        consumed: true,
        newUses: this.uses.value - 1,
        depleted: this.uses.value - 1 <= 0,
      };
    }
    // Quantity-based consumable
    if (this.quantity <= 0) {
      return { consumed: false, reason: "No items remaining" };
    }
    return {
      consumed: true,
      newQuantity: this.quantity - 1,
      depleted: this.quantity - 1 <= 0,
    };
  }

  /**
   * Get chat card data for displaying equipment information.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    const data = super.getChatData();

    data.quantity = this.quantity;
    data.category = this.category;
    data.consumable = this.consumable;

    if (this.consumable && this.uses.max > 0) {
      data.uses = `${this.uses.value}/${this.uses.max}`;
    }

    return data;
  }
}
