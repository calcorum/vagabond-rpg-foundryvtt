/**
 * Base Item Data Model
 *
 * Provides shared data fields and methods for all item types in Vagabond RPG.
 * This is an abstract base class - use specific item data models for actual items.
 *
 * @extends foundry.abstract.TypeDataModel
 */
export default class VagabondItemBase extends foundry.abstract.TypeDataModel {
  /**
   * Define the base schema shared by all items.
   * Subclasses should call super.defineSchema() and extend the result.
   *
   * @returns {Object} The schema definition
   */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      // Rich text description
      description: new fields.HTMLField({ required: false, blank: true }),
    };
  }

  /**
   * Prepare base data for the item.
   * Called before derived data calculation.
   */
  prepareBaseData() {
    // Base preparation - subclasses can override
  }

  /**
   * Prepare derived data for the item.
   * Called after base data and before render.
   */
  prepareDerivedData() {
    // Derived data calculation - subclasses should override
  }

  /**
   * Get the roll data for this item for use in Roll formulas.
   *
   * @returns {Object} Roll data object with item's values
   */
  getRollData() {
    const data = { ...this };

    // Include parent actor's roll data if available
    if (this.parent?.actor) {
      data.actor = this.parent.actor.getRollData();
    }

    return data;
  }

  /**
   * Get a chat card data object for this item.
   * Override in subclasses for type-specific chat output.
   *
   * @returns {Object} Chat card data
   */
  getChatData() {
    return {
      description: this.description,
    };
  }
}
