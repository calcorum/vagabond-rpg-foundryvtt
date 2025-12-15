/**
 * Base Roll Dialog for Vagabond RPG
 *
 * Provides common UI elements for all roll dialogs:
 * - Favor/Hinder toggles
 * - Situational modifier input (presets + custom)
 * - Roll button
 *
 * Subclasses (SkillCheckDialog, AttackRollDialog, SaveRollDialog) extend this
 * to add roll-type-specific configuration.
 *
 * Uses Foundry VTT v13 ApplicationV2 API.
 *
 * @extends ApplicationV2
 * @mixes HandlebarsApplicationMixin
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class VagabondRollDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {VagabondActor} actor - The actor making the roll
   * @param {Object} options - Dialog options
   * @param {string} [options.title] - Dialog title
   * @param {Function} [options.onRoll] - Callback when roll is executed
   */
  constructor(actor, options = {}) {
    super(options);
    this.actor = actor;
    this.onRollCallback = options.onRoll || null;

    // Roll configuration state
    this.rollConfig = {
      favorHinder: 0, // -1, 0, or +1
      modifier: 0, // Situational modifier
      autoFavorHinder: { net: 0, favorSources: [], hinderSources: [] },
    };
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "vagabond-roll-dialog",
    classes: ["vagabond", "roll-dialog", "themed"],
    tag: "form",
    window: {
      title: "VAGABOND.RollDialog",
      icon: "fa-solid fa-dice-d20",
      resizable: false,
    },
    position: {
      width: 320,
      height: "auto",
    },
    form: {
      handler: VagabondRollDialog.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /** @override */
  static PARTS = {
    form: {
      template: "systems/vagabond/templates/dialog/roll-dialog-base.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Get the title for this dialog.
   * Subclasses should override this.
   * @returns {string}
   */
  get title() {
    return game.i18n.localize("VAGABOND.RollDialog");
  }

  /**
   * Get the net favor/hinder value (manual + automatic).
   * @returns {number} -1, 0, or +1
   */
  get netFavorHinder() {
    const manual = this.rollConfig.favorHinder;
    const auto = this.rollConfig.autoFavorHinder.net;
    return Math.clamp(manual + auto, -1, 1);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);

    context.actor = this.actor;
    context.config = this.rollConfig;
    context.netFavorHinder = this.netFavorHinder;

    // Automatic favor/hinder from Active Effects
    context.autoFavorHinder = this.rollConfig.autoFavorHinder;
    context.hasAutoFavor = this.rollConfig.autoFavorHinder.favorSources.length > 0;
    context.hasAutoHinder = this.rollConfig.autoFavorHinder.hinderSources.length > 0;

    // Modifier presets
    context.modifierPresets = [
      { value: -5, label: "-5" },
      { value: -1, label: "-1" },
      { value: 1, label: "+1" },
      { value: 5, label: "+5" },
    ];

    // Subclass-specific context
    context.rollSpecific = await this._prepareRollContext(options);

    return context;
  }

  /**
   * Prepare roll-type-specific context data.
   * Subclasses should override this.
   *
   * @param {Object} options - Render options
   * @returns {Promise<Object>} Additional context data
   * @protected
   */
  async _prepareRollContext(_options) {
    return {};
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Apply theme class based on configured theme
    this._applyThemeClass();

    // Favor/Hinder toggle buttons
    const favorBtn = this.element.querySelector('[data-action="toggle-favor"]');
    const hinderBtn = this.element.querySelector('[data-action="toggle-hinder"]');

    favorBtn?.addEventListener("click", () => this._onToggleFavor());
    hinderBtn?.addEventListener("click", () => this._onToggleHinder());

    // Modifier preset buttons
    const presetBtns = this.element.querySelectorAll("[data-modifier-preset]");
    for (const btn of presetBtns) {
      btn.addEventListener("click", (event) => {
        const value = parseInt(event.currentTarget.dataset.modifierPreset, 10);
        this._onModifierPreset(value);
      });
    }

    // Custom modifier input
    const modifierInput = this.element.querySelector('[name="modifier"]');
    modifierInput?.addEventListener("change", (event) => {
      this.rollConfig.modifier = parseInt(event.target.value, 10) || 0;
    });
  }

  /**
   * Apply the configured theme class to the dialog element.
   * Foundry v13 doesn't automatically add theme classes to ApplicationV2,
   * so we handle it manually.
   * @protected
   */
  _applyThemeClass() {
    if (!this.element) return;

    // Remove any existing theme classes
    this.element.classList.remove("theme-light", "theme-dark");

    // Check global preference
    let theme = null;
    try {
      const uiConfig = game.settings.get("core", "uiConfig");
      const colorScheme = uiConfig?.colorScheme?.applications;
      if (colorScheme === "dark") {
        theme = "dark";
      } else if (colorScheme === "light") {
        theme = "light";
      }
    } catch {
      // Settings not available, use default
    }

    // Apply the theme class
    if (theme === "dark") {
      this.element.classList.add("theme-dark");
    } else if (theme === "light") {
      this.element.classList.add("theme-light");
    }
  }

  /**
   * Toggle favor on/off.
   * @private
   */
  _onToggleFavor() {
    if (this.rollConfig.favorHinder === 1) {
      this.rollConfig.favorHinder = 0;
    } else {
      this.rollConfig.favorHinder = 1;
    }
    this.render();
  }

  /**
   * Toggle hinder on/off.
   * @private
   */
  _onToggleHinder() {
    if (this.rollConfig.favorHinder === -1) {
      this.rollConfig.favorHinder = 0;
    } else {
      this.rollConfig.favorHinder = -1;
    }
    this.render();
  }

  /**
   * Apply a modifier preset.
   * @param {number} value - The preset value
   * @private
   */
  _onModifierPreset(value) {
    this.rollConfig.modifier += value;
    this.render();
  }

  /**
   * Handle form submission (roll button).
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    // 'this' is the dialog instance
    const dialog = this;
    const data = foundry.utils.expandObject(formData.object);

    // Update modifier from form
    dialog.rollConfig.modifier = parseInt(data.modifier, 10) || 0;

    // Execute the roll
    await dialog._executeRoll();

    // Call the callback if provided
    if (dialog.onRollCallback) {
      dialog.onRollCallback(dialog.rollConfig);
    }
  }

  /**
   * Execute the roll with current configuration.
   * Subclasses must override this.
   *
   * @returns {Promise<void>}
   * @protected
   */
  async _executeRoll() {
    throw new Error("Subclasses must implement _executeRoll()");
  }

  /* -------------------------------------------- */
  /*  Static Methods                              */
  /* -------------------------------------------- */

  /**
   * Create and render a roll dialog.
   *
   * @param {VagabondActor} actor - The actor making the roll
   * @param {Object} options - Dialog options
   * @returns {Promise<VagabondRollDialog>} The rendered dialog
   */
  static async create(actor, options = {}) {
    const dialog = new this(actor, options);
    return dialog.render(true);
  }
}
