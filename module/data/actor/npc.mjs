/**
 * NPC/Monster Data Model
 *
 * Defines the data schema for non-player characters and monsters in Vagabond RPG.
 * Uses a simplified stat block format common in OSR-style games.
 *
 * Key Attributes:
 * - HD (Hit Dice): Determines combat prowess
 * - HP: Hit points (separate from HD for flexibility)
 * - TL (Threat Level): Encounter balancing value (0.1 to 10+)
 * - Zone: AI behavior hint (Frontline, Midline, Backline)
 * - Morale: 2d6 check threshold for fleeing
 * - Actions: Attack actions with names and damage
 * - Abilities: Special abilities and traits
 *
 * @extends VagabondActorBase
 */
import VagabondActorBase from "./base-actor.mjs";

export default class NPCData extends VagabondActorBase {
  /**
   * Define the schema for NPC actors.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    const baseSchema = super.defineSchema();

    return {
      ...baseSchema,

      // Hit Dice - represents overall power level
      hd: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 1,
        min: 0,
      }),

      // Hit Points
      hp: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 4, min: 0 }),
        max: new fields.NumberField({ integer: true, initial: 4, min: 1 }),
      }),

      // Threat Level - used for encounter balancing
      // 0.1 = minion, 1.0 = standard, 2.0+ = elite/boss
      tl: new fields.NumberField({
        required: true,
        nullable: false,
        initial: 1,
        min: 0,
      }),

      // Armor value
      armor: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 0,
        min: 0,
      }),

      // Morale score - flee on 2d6 > Morale when triggered
      morale: new fields.NumberField({
        required: true,
        nullable: false,
        integer: true,
        initial: 7,
        min: 2,
        max: 12,
      }),

      // Number appearing (for random encounters)
      appearing: new fields.StringField({ initial: "1d6" }),

      // Preferred combat zone (AI hint)
      zone: new fields.StringField({
        required: true,
        initial: "frontline",
        choices: ["frontline", "midline", "backline"],
      }),

      // Size category
      size: new fields.StringField({ initial: "medium" }),

      // Being type (for targeting by certain effects)
      beingType: new fields.StringField({ initial: "beast" }),

      // Movement speed
      speed: new fields.SchemaField({
        value: new fields.NumberField({ integer: true, initial: 30 }),
        fly: new fields.NumberField({ integer: true, initial: 0 }),
        swim: new fields.NumberField({ integer: true, initial: 0 }),
        climb: new fields.NumberField({ integer: true, initial: 0 }),
      }),

      // Damage immunities
      immunities: new fields.ArrayField(new fields.StringField(), { initial: [] }),

      // Damage vulnerabilities (weaknesses)
      weaknesses: new fields.ArrayField(new fields.StringField(), { initial: [] }),

      // Damage resistances
      resistances: new fields.ArrayField(new fields.StringField(), { initial: [] }),

      // Attack actions
      actions: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true }),
          description: new fields.HTMLField({ required: false, blank: true }),
          attackType: new fields.StringField({ initial: "melee" }),
          damage: new fields.StringField({ initial: "1d6" }),
          damageType: new fields.StringField({ initial: "blunt" }),
          range: new fields.StringField({ required: false }),
          properties: new fields.ArrayField(new fields.StringField(), { initial: [] }),
        }),
        { initial: [] }
      ),

      // Special abilities
      abilities: new fields.ArrayField(
        new fields.SchemaField({
          name: new fields.StringField({ required: true }),
          description: new fields.HTMLField({ required: true }),
          passive: new fields.BooleanField({ initial: true }),
        }),
        { initial: [] }
      ),

      // Loot/treasure
      loot: new fields.HTMLField({ required: false, blank: true }),

      // Notes for GM
      gmNotes: new fields.HTMLField({ required: false, blank: true }),
    };
  }

  /**
   * Prepare derived data for the NPC.
   */
  prepareDerivedData() {
    super.prepareDerivedData();

    // Ensure HP max is at least HD if not set higher
    if (this.hp.max < this.hd) {
      this.hp.max = this.hd * 4; // Default HD to HP conversion
    }
  }

  /**
   * Get zone behavior description for the GM.
   *
   * @returns {string} Description of typical behavior for this zone
   */
  getZoneBehavior() {
    const behaviors = {
      frontline:
        "Engages in melee combat. Moves toward nearest enemy. Prioritizes blocking access to allies.",
      midline:
        "Maintains medium range. Uses ranged attacks or support abilities. Retreats if engaged in melee.",
      backline:
        "Stays at maximum range. Uses ranged attacks, magic, or support. Flees if enemies approach.",
    };
    return behaviors[this.zone] || behaviors.frontline;
  }

  /**
   * Check if morale check is needed.
   * Typically triggered when:
   * - First ally dies
   * - NPC reduced to half HP
   * - Leader dies
   *
   * @returns {boolean} True if morale should be checked
   */
  shouldCheckMorale() {
    // Check if at or below half HP
    return this.hp.value <= Math.floor(this.hp.max / 2);
  }

  /**
   * Get the roll data for this NPC.
   *
   * @returns {Object} Roll data object
   */
  getRollData() {
    const data = super.getRollData();

    // Add core stats for formulas
    data.hd = this.hd;
    data.armor = this.armor;
    data.morale = this.morale;

    return data;
  }
}
