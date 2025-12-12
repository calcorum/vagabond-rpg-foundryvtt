/**
 * Base Actor Data Model
 *
 * Provides shared data fields and methods for all actor types in Vagabond RPG.
 * This is an abstract base class - use CharacterData or NPCData for actual actors.
 *
 * @extends foundry.abstract.TypeDataModel
 */
export default class VagabondActorBase extends foundry.abstract.TypeDataModel {
  /**
   * Define the base schema shared by all actors.
   * Subclasses should call super.defineSchema() and extend the result.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      // Biography/description - rich text HTML content
      biography: new fields.HTMLField({ required: false, blank: true }),
    };
  }

  /**
   * Prepare base data for the actor.
   * Called before derived data calculation.
   * Override in subclasses to add type-specific base preparation.
   */
  prepareBaseData() {
    // Base preparation - subclasses can override
  }

  /**
   * Prepare derived data for the actor.
   * Called after base data and before render.
   * Override in subclasses to calculate derived values.
   */
  prepareDerivedData() {
    // Derived data calculation - subclasses should override
  }

  /**
   * Get the roll data for this actor for use in Roll formulas.
   *
   * @returns {Object} Roll data object with actor's stats and values
   */
  getRollData() {
    const data = { ...this };
    return data;
  }
}
