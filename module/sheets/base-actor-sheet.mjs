/**
 * Base Actor Sheet for Vagabond RPG
 *
 * Provides common functionality for all actor sheets:
 * - Tab navigation
 * - Drag-and-drop handling
 * - Item management (create, edit, delete)
 * - Context menus
 * - Roll integration
 *
 * Uses Foundry VTT v13 ActorSheetV2 API with HandlebarsApplicationMixin.
 *
 * @extends ActorSheetV2
 * @mixes HandlebarsApplicationMixin
 */

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class VagabondActorSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
  /**
   * @param {Object} options - Application options
   */
  constructor(options = {}) {
    super(options);

    // Active tab tracking
    this._activeTab = "main";

    // Scroll position preservation
    this._scrollPositions = {};
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "vagabond-actor-sheet-{id}",
    classes: ["vagabond", "sheet", "actor", "themed"],
    tag: "form",
    window: {
      title: "VAGABOND.ActorSheet",
      icon: "fa-solid fa-user",
      resizable: true,
    },
    position: {
      width: 720,
      height: 800,
    },
    form: {
      handler: VagabondActorSheet.#onFormSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      editImage: VagabondActorSheet.#onEditImage,
      rollSkill: VagabondActorSheet.#onRollSkill,
      rollSave: VagabondActorSheet.#onRollSave,
      rollAttack: VagabondActorSheet.#onRollAttack,
      castSpell: VagabondActorSheet.#onCastSpell,
      itemEdit: VagabondActorSheet.#onItemEdit,
      itemDelete: VagabondActorSheet.#onItemDelete,
      itemCreate: VagabondActorSheet.#onItemCreate,
      itemToggleEquipped: VagabondActorSheet.#onItemToggleEquipped,
      changeTab: VagabondActorSheet.#onChangeTab,
      modifyResource: VagabondActorSheet.#onModifyResource,
      toggleTrained: VagabondActorSheet.#onToggleTrained,
      toggleAttackTrained: VagabondActorSheet.#onToggleAttackTrained,
      removeStatus: VagabondActorSheet.#onRemoveStatus,
    },
    // Drag-drop configuration - use Foundry's built-in system
    // Setting to empty array disables ActorSheetV2's default handling
    // so we can use our own _onDrop override
    dragDrop: [{ dropSelector: null }],
  };

  /** @override */
  static PARTS = {
    header: {
      template: "systems/vagabond/templates/actor/parts/header.hbs",
    },
    tabs: {
      template: "systems/vagabond/templates/actor/parts/tabs.hbs",
    },
    body: {
      template: "systems/vagabond/templates/actor/parts/body.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Convenient alias for the actor document.
   * @returns {VagabondActor}
   */
  get actor() {
    return this.document;
  }

  /** @override */
  get title() {
    return this.document.name;
  }

  /**
   * Get the available tabs for this sheet.
   * Subclasses should override to define their tabs.
   * @returns {Object[]} Array of tab definitions
   */
  get tabs() {
    return [
      { id: "main", label: "VAGABOND.TabMain", icon: "fa-solid fa-user" },
      { id: "inventory", label: "VAGABOND.TabInventory", icon: "fa-solid fa-suitcase" },
      { id: "abilities", label: "VAGABOND.TabAbilities", icon: "fa-solid fa-star" },
      { id: "biography", label: "VAGABOND.TabBiography", icon: "fa-solid fa-book" },
    ];
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    // Basic actor data
    context.actor = this.actor;
    context.system = this.actor.system;
    context.source = this.actor.toObject().system;
    context.items = this._prepareItems();
    context.effects = this._prepareActiveEffects();

    // Sheet state
    context.activeTab = this._activeTab;
    context.tabs = this.tabs.map((tab) => ({
      ...tab,
      active: tab.id === this._activeTab,
      cssClass: tab.id === this._activeTab ? "active" : "",
    }));

    // Roll data for formulas in templates
    context.rollData = this.actor.getRollData();

    // Editable state
    context.editable = this.isEditable;
    context.owner = this.actor.isOwner;
    context.limited = this.actor.limited;

    // System configuration
    context.config = CONFIG.VAGABOND;

    // Type-specific context
    await this._prepareTypeContext(context, options);

    return context;
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

  /**
   * Organize and classify items for the sheet.
   *
   * @returns {Object} Categorized items
   * @protected
   */
  _prepareItems() {
    const items = {
      weapons: [],
      armor: [],
      equipment: [],
      spells: [],
      features: [],
      perks: [],
      classes: [],
      statuses: [],
      ancestry: null,
    };

    for (const item of this.actor.items) {
      // Set common properties
      item.system.isEquipped = item.system.equipped ?? false;

      switch (item.type) {
        case "weapon":
          items.weapons.push(item);
          break;
        case "armor":
          items.armor.push(item);
          break;
        case "equipment":
          items.equipment.push(item);
          break;
        case "spell":
          items.spells.push(item);
          break;
        case "feature":
          items.features.push(item);
          break;
        case "perk": {
          // Add formatted prerequisite string for display (hide "None")
          const prereqStr = item.system.getPrerequisiteString?.() || "";
          item.prerequisiteString = prereqStr !== "None" ? prereqStr : "";
          items.perks.push(item);
          break;
        }
        case "class":
          items.classes.push(item);
          break;
        case "ancestry":
          items.ancestry = item;
          break;
        case "status":
          items.statuses.push(item);
          break;
      }
    }

    // Sort items by name
    for (const category of Object.keys(items)) {
      if (Array.isArray(items[category])) {
        items[category].sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    return items;
  }

  /**
   * Prepare active effects for display.
   *
   * @returns {Object} Categorized effects
   * @protected
   */
  _prepareActiveEffects() {
    const effects = {
      temporary: [],
      passive: [],
      inactive: [],
    };

    for (const effect of this.actor.effects) {
      if (effect.disabled) {
        effects.inactive.push(effect);
      } else if (effect.isTemporary) {
        effects.temporary.push(effect);
      } else {
        effects.passive.push(effect);
      }
    }

    return effects;
  }

  /* -------------------------------------------- */
  /*  Rendering                                   */
  /* -------------------------------------------- */

  /** @override */
  _preRender(context, options) {
    super._preRender(context, options);

    // Save scroll positions before re-render
    this._saveScrollPositions();
  }

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Apply theme class based on configured theme
    this._applyThemeClass();

    // Remove stale tab content (ApplicationV2 appends parts without removing old ones)
    this._cleanupInactiveTabs();

    // Restore scroll positions after re-render
    this._restoreScrollPositions();

    // Set up drag-and-drop for items
    this._setupDragDrop();

    // Initialize any content-editable fields
    this._initializeEditors();

    // Add keyboard accessibility for interactive rows
    this._setupKeyboardAccessibility();
  }

  /**
   * Set up keyboard event listeners for elements with role="button".
   * This enables Enter/Space key activation for accessibility.
   * @protected
   */
  _setupKeyboardAccessibility() {
    if (!this.element) return;

    // Find all elements with role="button" that have data-action
    const interactiveElements = this.element.querySelectorAll('[role="button"][data-action]');

    for (const el of interactiveElements) {
      el.addEventListener("keydown", (event) => {
        // Trigger click on Enter or Space
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          el.click();
        }
      });
    }
  }

  /**
   * Apply the configured theme class to the sheet element.
   * Foundry v13 doesn't automatically add theme classes to ApplicationV2 sheets,
   * so we handle it manually.
   * @protected
   */
  _applyThemeClass() {
    if (!this.element) return;

    // Remove any existing theme classes
    this.element.classList.remove("theme-light", "theme-dark");

    // Get the configured theme for this sheet
    // DocumentSheetConfig stores per-document and per-type theme preferences
    const sheetConfig = this.document.getFlag("core", "sheetTheme");
    const typeConfig = game.settings.get("core", "sheetClasses")?.[this.document.documentName]?.[
      this.document.type
    ];
    const defaultTheme = typeConfig?.defaultTheme;

    // Determine which theme to apply: document-specific > type default > global
    let theme = sheetConfig || defaultTheme;

    // If no specific theme, check global preference
    if (!theme) {
      const uiConfig = game.settings.get("core", "uiConfig");
      const colorScheme = uiConfig?.colorScheme?.applications;
      if (colorScheme === "dark") {
        theme = "dark";
      } else if (colorScheme === "light") {
        theme = "light";
      }
    }

    // Apply the theme class
    if (theme === "dark") {
      this.element.classList.add("theme-dark");
    } else if (theme === "light") {
      this.element.classList.add("theme-light");
    }
    // If still no theme, it will use body.theme-dark/light via CSS
  }

  /**
   * Remove tab content sections that don't match the active tab.
   * ApplicationV2's parts rendering appends new parts without removing old ones,
   * so we need to clean up inactive tabs after each render.
   * @protected
   */
  _cleanupInactiveTabs() {
    if (!this.element) return;

    const activeTabClass = `${this._activeTab}-tab`;
    const tabContents = this.element.querySelectorAll(".tab-content");

    for (const tabContent of tabContents) {
      // Check if this tab content matches the active tab
      if (!tabContent.classList.contains(activeTabClass)) {
        tabContent.remove();
      }
    }
  }

  /**
   * Save scroll positions of scrollable elements before re-render.
   * @protected
   */
  _saveScrollPositions() {
    if (!this.element) return;

    // Save main window scroll
    const windowEl = this.element.querySelector(".window-content");
    if (windowEl) {
      this._scrollPositions.window = windowEl.scrollTop;
    }

    // Save tab content scroll
    const tabContent = this.element.querySelector(".tab-content");
    if (tabContent) {
      this._scrollPositions.tabContent = tabContent.scrollTop;
    }
  }

  /**
   * Restore scroll positions of scrollable elements after re-render.
   * @protected
   */
  _restoreScrollPositions() {
    if (!this.element) return;

    // Restore main window scroll
    const windowEl = this.element.querySelector(".window-content");
    if (windowEl && this._scrollPositions.window !== undefined) {
      windowEl.scrollTop = this._scrollPositions.window;
    }

    // Restore tab content scroll
    const tabContent = this.element.querySelector(".tab-content");
    if (tabContent && this._scrollPositions.tabContent !== undefined) {
      tabContent.scrollTop = this._scrollPositions.tabContent;
    }
  }

  /**
   * Set up drag-and-drop handlers for dragging items FROM this sheet.
   * Drop handling is configured via DEFAULT_OPTIONS.dragDrop and uses
   * the _onDrop method override - we don't add manual listeners for drops.
   * @protected
   */
  _setupDragDrop() {
    // Enable dragging items from the sheet
    const draggables = this.element.querySelectorAll("[data-item-id]");
    for (const el of draggables) {
      el.setAttribute("draggable", "true");
      el.addEventListener("dragstart", this._onDragStart.bind(this));
    }
    // Note: Drop handling is managed by Foundry's dragDrop configuration
    // in DEFAULT_OPTIONS, which calls our _onDrop override. We don't add
    // manual drop listeners here to avoid duplicate item creation.
  }

  /**
   * Initialize rich text editors.
   * @protected
   */
  _initializeEditors() {
    // TinyMCE or ProseMirror editors would be initialized here
    // For now, we use simple textareas
  }

  /* -------------------------------------------- */
  /*  Drag and Drop                               */
  /* -------------------------------------------- */

  /**
   * Handle drag start for items.
   * @param {DragEvent} event
   * @protected
   */
  _onDragStart(event) {
    const itemId = event.currentTarget.dataset.itemId;
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const dragData = {
      type: "Item",
      uuid: item.uuid,
    };

    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /**
   * Handle drag over.
   * @param {DragEvent} event
   * @protected
   */
  _onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  /**
   * Handle drop onto the sheet.
   * @param {DragEvent} event
   * @protected
   */
  async _onDrop(event) {
    event.preventDefault();

    let data;
    try {
      data = JSON.parse(event.dataTransfer.getData("text/plain"));
    } catch (err) {
      return;
    }

    // Handle different drop types
    switch (data.type) {
      case "Item":
        return this._onDropItem(event, data);
      case "ActiveEffect":
        return this._onDropActiveEffect(event, data);
      case "Actor":
        return this._onDropActor(event, data);
    }
  }

  /**
   * Handle dropping an Item onto the sheet.
   * @param {DragEvent} event
   * @param {Object} data
   * @protected
   */
  async _onDropItem(event, data) {
    if (!this.actor.isOwner) return;

    const item = await Item.fromDropData(data);
    if (!item) return;

    // If the item is from this actor, it's a sort operation
    if (item.parent === this.actor) {
      return this._onSortItem(event, item);
    }

    // Create the item on this actor
    return this._onDropItemCreate(item);
  }

  /**
   * Handle creating an Item from a drop.
   * @param {VagabondItem} item
   * @protected
   */
  async _onDropItemCreate(item) {
    const itemData = item.toObject();

    // Special handling for ancestry (only one allowed)
    if (item.type === "ancestry") {
      const existingAncestry = this.actor.items.find((i) => i.type === "ancestry");
      if (existingAncestry) {
        await existingAncestry.delete();
      }
    }

    return this.actor.createEmbeddedDocuments("Item", [itemData]);
  }

  /**
   * Handle sorting items within the sheet.
   * @param {DragEvent} event
   * @param {VagabondItem} item
   * @protected
   */
  async _onSortItem(event, item) {
    // Get the drop target
    const dropTarget = event.target.closest("[data-item-id]");
    if (!dropTarget) return;

    const targetId = dropTarget.dataset.itemId;
    if (targetId === item.id) return;

    const target = this.actor.items.get(targetId);
    if (!target || target.type !== item.type) return;

    // Perform the sort
    const siblings = this.actor.items.filter((i) => i.type === item.type && i.id !== item.id);
    const sortUpdates = foundry.utils.SortingHelpers.performIntegerSort(item, {
      target,
      siblings,
    });

    const updateData = sortUpdates.map((u) => ({
      _id: u.target.id,
      sort: u.update.sort,
    }));

    return this.actor.updateEmbeddedDocuments("Item", updateData);
  }

  /**
   * Handle dropping an Active Effect.
   * @param {DragEvent} event
   * @param {Object} data
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const effect = await ActiveEffect.fromDropData(data);
    if (!effect) return;

    if (effect.parent === this.actor) {
      return; // No-op for effects already on this actor
    }

    return this.actor.createEmbeddedDocuments("ActiveEffect", [effect.toObject()]);
  }

  /**
   * Handle dropping an Actor (e.g., for summoning).
   * @param {DragEvent} event
   * @param {Object} data
   * @protected
   */
  async _onDropActor(_event, _data) {
    // Override in subclasses if needed (e.g., for companion/summon tracking)
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

    // Clean up numeric fields that may have empty string values
    // This can happen when number inputs are cleared by the user
    VagabondActorSheet.#cleanNumericFields(updateData);

    await sheet.actor.update(updateData);
  }

  /**
   * Recursively clean numeric fields in update data.
   * Empty strings are converted to 0 for numeric resource fields.
   * @param {Object} obj - Object to clean
   * @param {string} path - Current path for debugging
   * @private
   */
  static #cleanNumericFields(obj, path = "") {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === "object" && value !== null) {
        // Recurse into nested objects
        VagabondActorSheet.#cleanNumericFields(value, currentPath);
      } else if (value === "" || value === null) {
        // Check if this should be a numeric field based on common patterns
        const numericKeys = ["value", "max", "bonus", "min", "base", "level", "castingMax"];
        if (numericKeys.includes(key)) {
          obj[key] = 0;
        }
      }
    }
  }

  /**
   * Handle skill roll action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRollSkill(event, target) {
    event.preventDefault();
    const skillId = target.dataset.skill;
    if (!skillId) return;

    const { SkillCheckDialog } = game.vagabond.applications;
    await SkillCheckDialog.prompt(this.actor, skillId);
  }

  /**
   * Handle save roll action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRollSave(event, target) {
    event.preventDefault();
    const saveType = target.dataset.save;
    if (!saveType) return;

    const { SaveRollDialog } = game.vagabond.applications;
    await SaveRollDialog.prompt(this.actor, saveType);
  }

  /**
   * Handle attack roll action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRollAttack(event, target) {
    event.preventDefault();
    const weaponId = target.dataset.weaponId;

    const { AttackRollDialog } = game.vagabond.applications;
    await AttackRollDialog.prompt(this.actor, weaponId);
  }

  /**
   * Handle spell cast action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onCastSpell(event, target) {
    event.preventDefault();
    const spellId = target.dataset.spellId;
    if (!spellId) return;

    const { SpellCastDialog } = game.vagabond.applications;
    await SpellCastDialog.prompt(this.actor, spellId);
  }

  /**
   * Handle item edit action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onItemEdit(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    item.sheet.render(true);
  }

  /**
   * Handle item delete action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onItemDelete(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    // Confirm deletion
    const confirmed = await Dialog.confirm({
      title: game.i18n.format("VAGABOND.ItemDeleteTitle", { name: item.name }),
      content: game.i18n.format("VAGABOND.ItemDeleteConfirm", { name: item.name }),
    });

    if (confirmed) {
      await item.delete();
    }
  }

  /**
   * Handle item create action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onItemCreate(event, target) {
    event.preventDefault();
    const type = target.dataset.type;
    if (!type) return;

    const itemData = {
      name: game.i18n.format("VAGABOND.ItemNew", { type }),
      type,
    };

    const [item] = await this.actor.createEmbeddedDocuments("Item", [itemData]);
    item?.sheet.render(true);
  }

  /**
   * Handle item equipped toggle.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onItemToggleEquipped(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item) return;

    await item.update({ "system.equipped": !item.system.equipped });
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
   * Handle resource modification.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onModifyResource(event, target) {
    event.preventDefault();
    const resource = target.dataset.resource;
    const delta = parseInt(target.dataset.delta, 10);
    if (!resource || isNaN(delta)) return;

    await this.actor.modifyResource(resource, delta);
  }

  /**
   * Handle skill trained toggle.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onToggleTrained(event, target) {
    event.preventDefault();
    const skillId = target.dataset.skill;
    if (!skillId) return;

    const currentValue = this.actor.system.skills[skillId]?.trained ?? false;
    await this.actor.update({ [`system.skills.${skillId}.trained`]: !currentValue });
  }

  /**
   * Handle attack skill trained toggle.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onToggleAttackTrained(event, target) {
    event.preventDefault();
    event.stopPropagation(); // Prevent triggering the row's rollAttack action
    const attackId = target.dataset.attack;
    if (!attackId) return;

    const currentValue = this.actor.system.attacks[attackId]?.trained ?? false;
    await this.actor.update({ [`system.attacks.${attackId}.trained`]: !currentValue });
  }

  /**
   * Handle status removal action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRemoveStatus(event, target) {
    event.preventDefault();
    const itemId = target.closest("[data-item-id]")?.dataset.itemId;
    if (!itemId) return;

    const item = this.actor.items.get(itemId);
    if (!item || item.type !== "status") return;

    await item.delete();
  }

  /**
   * Handle image editing via FilePicker.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onEditImage(event, target) {
    event.preventDefault();
    const field = target.dataset.field || "img";
    const current = foundry.utils.getProperty(this.document, field);

    const fp = new FilePicker({
      type: "image",
      current,
      callback: async (path) => {
        await this.document.update({ [field]: path });
      },
    });
    fp.render(true);
  }
}
