/**
 * Base Item Sheet for Vagabond RPG
 *
 * Provides common functionality for all item sheets:
 * - Tab navigation (for complex items)
 * - Form handling with automatic updates
 * - Rich text editor integration
 * - Type-specific rendering via parts system
 *
 * Uses Foundry VTT v13 ItemSheetV2 API with HandlebarsApplicationMixin.
 *
 * @extends ItemSheetV2
 * @mixes HandlebarsApplicationMixin
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ItemSheetV2 } = foundry.applications.sheets;

export default class VagabondItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
  /**
   * @param {Object} options - Application options
   */
  constructor(options = {}) {
    super(options);

    // Active tab tracking (for items with tabs)
    this._activeTab = "details";
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "vagabond-item-sheet-{id}",
    classes: ["vagabond", "sheet", "item"],
    tag: "form",
    window: {
      title: "VAGABOND.ItemSheet",
      icon: "fa-solid fa-suitcase",
      resizable: true,
    },
    position: {
      width: 520,
      height: 480,
    },
    form: {
      handler: VagabondItemSheet.#onFormSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      changeTab: VagabondItemSheet.#onChangeTab,
      addArrayEntry: VagabondItemSheet.#onAddArrayEntry,
      deleteArrayEntry: VagabondItemSheet.#onDeleteArrayEntry,
      createEffect: VagabondItemSheet.#onCreateEffect,
      editEffect: VagabondItemSheet.#onEditEffect,
      deleteEffect: VagabondItemSheet.#onDeleteEffect,
      toggleEffect: VagabondItemSheet.#onToggleEffect,
    },
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/vagabond/templates/item/parts/item-header.hbs",
    },
    tabs: {
      template: "systems/vagabond/templates/item/parts/item-tabs.hbs",
    },
    body: {
      template: "systems/vagabond/templates/item/parts/item-body.hbs",
    },
    effects: {
      template: "systems/vagabond/templates/item/parts/item-effects.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Convenient alias for the item document.
   * @returns {VagabondItem}
   */
  get item() {
    return this.document;
  }

  /** @override */
  get title() {
    return this.document.name;
  }

  /**
   * Get the available tabs for this item type.
   * All items have Details and Effects tabs.
   * @returns {Object[]} Array of tab definitions
   */
  get tabs() {
    return [
      {
        id: "details",
        label: "VAGABOND.TabDetails",
        icon: "fas fa-list",
      },
      {
        id: "effects",
        label: "VAGABOND.TabEffects",
        icon: "fas fa-bolt",
      },
    ];
  }

  /**
   * Whether this item type uses tabs.
   * @returns {boolean}
   */
  get hasTabs() {
    return this.tabs !== null && this.tabs.length > 0;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Basic item data
    context.item = this.item;
    context.system = this.item.system;
    context.source = this.item.toObject().system;

    // Sheet state
    context.hasTabs = this.hasTabs;
    context.activeTab = this._activeTab;
    if (this.hasTabs) {
      context.tabs = this.tabs.map((tab) => ({
        ...tab,
        active: tab.id === this._activeTab,
        cssClass: tab.id === this._activeTab ? "active" : "",
      }));
    }

    // Roll data for formulas in templates
    context.rollData = this.item.getRollData();

    // Editable state
    context.editable = this.isEditable;
    context.owner = this.item.isOwner;
    context.limited = this.item.limited;

    // System configuration
    context.config = CONFIG.VAGABOND;

    // Item type for conditional rendering
    context.itemType = this.item.type;

    // Active Effects on this item
    context.effects = this._prepareEffects();

    // Type-specific context
    await this._prepareTypeContext(context, options);

    return context;
  }

  /**
   * Prepare Active Effects for display.
   * @returns {Object[]} Array of effect data for rendering
   * @protected
   */
  _prepareEffects() {
    return this.item.effects.map((effect) => ({
      id: effect.id,
      name: effect.name,
      icon: effect.icon,
      disabled: effect.disabled,
      duration: effect.duration,
      source: effect.sourceName,
    }));
  }

  /**
   * Prepare type-specific context data.
   * Subclasses should override this.
   *
   * @param {Object} context - The context object to augment
   * @param {Object} options - Render options
   * @protected
   */
  async _prepareTypeContext(_context, _options) {
    // Override in subclasses
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Clean up inactive tabs if using tabs
    if (this.hasTabs) {
      this._cleanupInactiveTabs();
    }

    // Initialize rich text editors
    this._initializeEditors();
  }

  /**
   * Remove tab content sections that don't match the active tab.
   * ApplicationV2's parts rendering appends new parts without removing old ones.
   * @protected
   */
  _cleanupInactiveTabs() {
    if (!this.element) return;

    const activeTabClass = `${this._activeTab}-tab`;
    const tabContents = this.element.querySelectorAll(".tab-content");

    for (const tabContent of tabContents) {
      if (!tabContent.classList.contains(activeTabClass)) {
        tabContent.remove();
      }
    }
  }

  /**
   * Initialize rich text editors for description fields.
   * @protected
   */
  _initializeEditors() {
    // Foundry automatically handles ProseMirror/TinyMCE for HTMLField inputs
    // Additional initialization can be added here if needed
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  /**
   * Handle form submission.
   * @param {Event} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onFormSubmit(event, form, formData) {
    const sheet = this;
    const updateData = foundry.utils.expandObject(formData.object);

    // Clean up array data that may have gaps from deletions
    sheet._cleanArrayData(updateData);

    await sheet.item.update(updateData);
  }

  /**
   * Clean array data to remove gaps from deleted entries.
   * Converts { "0": {...}, "2": {...} } to [ {...}, {...} ]
   * @param {Object} data - The update data object
   * @protected
   */
  _cleanArrayData(data) {
    // Handle system-level arrays
    if (data.system) {
      this._cleanArraysRecursive(data.system);
    }
  }

  /**
   * Recursively clean arrays in an object.
   * @param {Object} obj - Object to clean
   * @protected
   */
  _cleanArraysRecursive(obj) {
    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        // Check if this looks like an indexed object (array-like)
        const keys = Object.keys(value);
        const isIndexed = keys.every((k) => /^\d+$/.test(k));

        if (isIndexed && keys.length > 0) {
          // Convert to array, filtering out nulls/undefined
          obj[key] = Object.values(value).filter((v) => v != null);
        } else {
          // Recurse into nested objects
          this._cleanArraysRecursive(value);
        }
      }
    }
  }

  /**
   * Handle tab change action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onChangeTab(event, target) {
    event.preventDefault();
    const tab = target.dataset.tab;
    if (!tab) return;

    this._activeTab = tab;
    this.render();
  }

  /**
   * Handle adding a new entry to an array field.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddArrayEntry(event, target) {
    event.preventDefault();
    const field = target.dataset.field;
    if (!field) return;

    const currentArray = foundry.utils.getProperty(this.item, field) || [];
    const template = this._getArrayEntryTemplate(field);

    await this.item.update({
      [field]: [...currentArray, template],
    });
  }

  /**
   * Handle deleting an entry from an array field.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onDeleteArrayEntry(event, target) {
    event.preventDefault();
    const field = target.dataset.field;
    const index = parseInt(target.dataset.index, 10);
    if (!field || isNaN(index)) return;

    const currentArray = foundry.utils.getProperty(this.item, field) || [];
    const newArray = [...currentArray];
    newArray.splice(index, 1);

    await this.item.update({
      [field]: newArray,
    });
  }

  /**
   * Get the default template for a new array entry.
   * Subclasses should override for their specific array fields.
   * @param {string} field - The field path
   * @returns {Object} Default entry object
   * @protected
   */
  _getArrayEntryTemplate(_field) {
    // Default template - subclasses override for specific fields
    return { name: "", description: "" };
  }

  /* -------------------------------------------- */
  /*  Active Effect Actions                       */
  /* -------------------------------------------- */

  /**
   * Handle creating a new Active Effect on this item.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onCreateEffect(event, _target) {
    event.preventDefault();

    // Create a new effect with default values
    const effectData = {
      name: game.i18n.localize("VAGABOND.NewEffect"),
      icon: "icons/svg/aura.svg",
      origin: this.item.uuid,
      disabled: false,
    };

    const [created] = await this.item.createEmbeddedDocuments("ActiveEffect", [effectData]);

    // Open the effect config sheet
    if (created) {
      created.sheet.render(true);
    }
  }

  /**
   * Handle editing an existing Active Effect.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onEditEffect(event, target) {
    event.preventDefault();
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if (!effectId) return;

    const effect = this.item.effects.get(effectId);
    if (effect) {
      effect.sheet.render(true);
    }
  }

  /**
   * Handle deleting an Active Effect.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onDeleteEffect(event, target) {
    event.preventDefault();
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if (!effectId) return;

    const effect = this.item.effects.get(effectId);
    if (!effect) return;

    // Confirm deletion
    const confirmed = await Dialog.confirm({
      title: game.i18n.localize("VAGABOND.DeleteEffect"),
      content: `<p>${game.i18n.format("VAGABOND.DeleteEffectConfirm", { name: effect.name })}</p>`,
    });

    if (confirmed) {
      await effect.delete();
    }
  }

  /**
   * Handle toggling an Active Effect's disabled state.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onToggleEffect(event, target) {
    event.preventDefault();
    const effectId = target.closest("[data-effect-id]")?.dataset.effectId;
    if (!effectId) return;

    const effect = this.item.effects.get(effectId);
    if (effect) {
      await effect.update({ disabled: !effect.disabled });
    }
  }
}
