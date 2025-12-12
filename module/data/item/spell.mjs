/**
 * Spell Item Data Model
 *
 * Defines the data schema for spells in Vagabond RPG.
 * Spells have dynamic mana costs based on:
 * - Damage dice selected (each d6 costs 1 mana)
 * - Delivery type (touch=0, remote=0, cube=1, aura/sphere/cone/line/glyph=2)
 * - Duration (instant=0, focus=0, continual=+2 if >0 damage)
 *
 * @extends VagabondItemBase
 */
import VagabondItemBase from "./base-item.mjs";

export default class SpellData extends VagabondItemBase {
  /**
   * Define the schema for spell items.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Damage type (fire, cold, shock, etc.) - null for non-damaging spells
      damageType: new fields.StringField({
        required: false,
        blank: true,
        initial: "",
      }),

      // Base damage dice (e.g., "d6" - number selected at cast time)
      damageBase: new fields.StringField({
        required: false,
        blank: true,
        initial: "d6",
      }),

      // Maximum damage dice that can be used
      maxDice: new fields.NumberField({
        integer: true,
        initial: 0, // 0 = no limit (use casting max)
        min: 0,
      }),

      // Base effect description (what the spell does)
      effect: new fields.HTMLField({
        required: true,
        blank: true,
      }),

      // Critical effect bonus
      critEffect: new fields.HTMLField({
        required: false,
        blank: true,
      }),

      // Valid delivery types for this spell
      deliveryTypes: new fields.SchemaField({
        touch: new fields.BooleanField({ initial: false }),
        remote: new fields.BooleanField({ initial: false }),
        imbue: new fields.BooleanField({ initial: false }),
        cube: new fields.BooleanField({ initial: false }),
        aura: new fields.BooleanField({ initial: false }),
        cone: new fields.BooleanField({ initial: false }),
        glyph: new fields.BooleanField({ initial: false }),
        line: new fields.BooleanField({ initial: false }),
        sphere: new fields.BooleanField({ initial: false }),
      }),

      // Valid duration types for this spell
      durationTypes: new fields.SchemaField({
        instant: new fields.BooleanField({ initial: true }),
        focus: new fields.BooleanField({ initial: false }),
        continual: new fields.BooleanField({ initial: false }),
      }),

      // Casting skill used (can be overridden per-spell if different from class)
      castingSkill: new fields.StringField({
        required: false,
        blank: true, // Empty = use class's actionStyle
      }),

      // Is this spell currently being focused?
      focusing: new fields.BooleanField({ initial: false }),

      // Tags for categorization/filtering
      tags: new fields.ArrayField(new fields.StringField(), { initial: [] }),
    };
  }

  /**
   * Calculate the mana cost for casting this spell with given options.
   *
   * @param {Object} options - Casting options
   * @param {number} options.damageDice - Number of damage dice (default 0)
   * @param {string} options.delivery - Delivery type (default "touch")
   * @param {string} options.duration - Duration type (default "instant")
   * @returns {number} Total mana cost
   */
  calculateManaCost({ damageDice = 0, delivery = "touch", duration = "instant" } = {}) {
    let cost = 0;

    // Damage dice cost (1 mana per die)
    cost += damageDice;

    // Delivery cost
    const deliveryCosts = {
      touch: 0,
      remote: 0,
      imbue: 0,
      cube: 1,
      aura: 2,
      cone: 2,
      glyph: 2,
      line: 2,
      sphere: 2,
    };
    cost += deliveryCosts[delivery] || 0;

    // Duration cost (continual adds +2 if dealing damage)
    if (duration === "continual" && damageDice > 0) {
      cost += 2;
    }

    return cost;
  }

  /**
   * Get valid delivery types as an array.
   *
   * @returns {Array<string>} Array of valid delivery type keys
   */
  getValidDeliveryTypes() {
    return Object.entries(this.deliveryTypes)
      .filter(([, valid]) => valid)
      .map(([type]) => type);
  }

  /**
   * Get valid duration types as an array.
   *
   * @returns {Array<string>} Array of valid duration type keys
   */
  getValidDurationTypes() {
    return Object.entries(this.durationTypes)
      .filter(([, valid]) => valid)
      .map(([type]) => type);
  }

  /**
   * Check if this is a damaging spell.
   *
   * @returns {boolean} True if spell deals damage
   */
  isDamaging() {
    return Boolean(this.damageType && this.damageBase);
  }

  /**
   * Get chat card data for displaying spell information.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    const data = super.getChatData();

    data.damageType = this.damageType;
    data.effect = this.effect;
    data.critEffect = this.critEffect;
    data.validDelivery = this.getValidDeliveryTypes();
    data.validDuration = this.getValidDurationTypes();
    data.isDamaging = this.isDamaging();

    return data;
  }
}
