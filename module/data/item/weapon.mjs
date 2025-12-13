/**
 * Weapon Item Data Model
 *
 * Defines the data schema for weapons in Vagabond RPG.
 *
 * Key properties:
 * - Damage dice (e.g., "1d6", "2d6")
 * - Grip type (1H, 2H, Versatile)
 * - Attack skill (Melee, Brawl, Ranged, Finesse)
 * - Weapon properties (Finesse, Thrown, Cleave, Reach, etc.)
 * - Slot cost for inventory management
 *
 * @extends VagabondItemBase
 */
import VagabondItemBase from "./base-item.mjs";

export default class WeaponData extends VagabondItemBase {
  /**
   * Define the schema for weapon items.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Damage dice formula
      damage: new fields.StringField({
        required: true,
        initial: "1d6",
      }),

      // Damage type (physical: blunt/piercing/slashing, elemental: fire/cold/shock/acid/poison)
      damageType: new fields.StringField({
        required: true,
        initial: "blunt",
        choices: ["blunt", "piercing", "slashing", "fire", "cold", "shock", "acid", "poison"],
      }),

      // Bonus damage (from magic, etc.)
      bonusDamage: new fields.NumberField({
        integer: true,
        initial: 0,
      }),

      // Grip type (1h, 2h, versatile, fist)
      grip: new fields.StringField({
        required: true,
        initial: "1h",
        choices: ["1h", "2h", "versatile", "fist"],
      }),

      // Versatile damage (when wielded 2H)
      versatileDamage: new fields.StringField({
        required: false,
        blank: true,
      }),

      // Attack skill used
      attackType: new fields.StringField({
        required: true,
        initial: "melee",
        choices: ["melee", "brawl", "ranged", "finesse"],
      }),

      // Range (for ranged/thrown weapons)
      range: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 0 }),
        units: new fields.StringField({ initial: "ft" }),
      }),

      // Weapon properties
      properties: new fields.SchemaField({
        finesse: new fields.BooleanField({ initial: false }),
        thrown: new fields.BooleanField({ initial: false }),
        cleave: new fields.BooleanField({ initial: false }),
        reach: new fields.BooleanField({ initial: false }),
        loading: new fields.BooleanField({ initial: false }),
        brawl: new fields.BooleanField({ initial: false }),
        crude: new fields.BooleanField({ initial: false }),
        versatile: new fields.BooleanField({ initial: false }),
      }),

      // Weapon material (affects damage vs certain creatures)
      material: new fields.StringField({
        initial: "mundane",
        choices: ["mundane", "silvered", "adamantine", "magical"],
      }),

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

      // Is this weapon equipped?
      equipped: new fields.BooleanField({ initial: false }),

      // Which hand is this weapon equipped in? (for dual-wielding, null = not equipped)
      equippedHand: new fields.StringField({
        required: false,
        nullable: true,
        blank: false,
        initial: null,
        choices: ["main", "off", "both"],
      }),

      // Quantity (for ammunition, thrown weapons)
      quantity: new fields.NumberField({
        integer: true,
        initial: 1,
        min: 0,
      }),

      // Attack bonus (from magic, etc.)
      attackBonus: new fields.NumberField({
        integer: true,
        initial: 0,
      }),

      // Critical threshold override (if different from skill default)
      critThreshold: new fields.NumberField({
        integer: true,
        nullable: true,
        initial: null,
        min: 1,
        max: 20,
      }),

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
   * Get the effective attack stat for this weapon.
   * Accounts for Finesse property allowing DEX for melee.
   *
   * @returns {string} The stat key to use for attack rolls
   */
  getAttackStat() {
    const attackStats = {
      melee: "might",
      brawl: "might",
      ranged: "awareness",
      finesse: "dexterity",
    };

    // Finesse weapons can use DEX for melee
    if (this.properties.finesse && this.attackType === "melee") {
      return "dexterity";
    }

    return attackStats[this.attackType] || "might";
  }

  /**
   * Get the active weapon properties as an array.
   *
   * @returns {Array<string>} Array of active property keys
   */
  getActiveProperties() {
    return Object.entries(this.properties)
      .filter(([, active]) => active)
      .map(([prop]) => prop);
  }

  /**
   * Get the effective damage formula.
   *
   * @param {boolean} twoHanded - Whether using two-handed grip for versatile
   * @returns {string} Damage formula
   */
  getDamageFormula(twoHanded = false) {
    // Use versatile damage if 2H and available
    if (twoHanded && this.properties.versatile && this.versatileDamage) {
      return this.bonusDamage > 0
        ? `${this.versatileDamage}+${this.bonusDamage}`
        : this.versatileDamage;
    }

    return this.bonusDamage > 0 ? `${this.damage}+${this.bonusDamage}` : this.damage;
  }

  /**
   * Calculate the slot cost when equipped.
   *
   * @returns {number} Slot cost
   */
  getEquippedSlots() {
    return this.equipped ? this.slots : 0;
  }

  /**
   * Get chat card data for displaying weapon information.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    const data = super.getChatData();

    data.damage = this.damage;
    data.damageType = this.damageType;
    data.grip = this.grip;
    data.attackType = this.attackType;
    data.properties = this.getActiveProperties();
    data.range = this.range.value > 0 ? `${this.range.value} ${this.range.units}` : null;

    return data;
  }
}
