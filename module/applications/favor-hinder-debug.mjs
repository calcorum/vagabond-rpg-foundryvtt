/**
 * Favor/Hinder Debug Application for Vagabond RPG
 *
 * A development/testing tool that allows setting and viewing
 * favor/hinder flags on actors. Useful for testing the roll system
 * without a full actor sheet implementation.
 *
 * @extends ApplicationV2
 * @mixes HandlebarsApplicationMixin
 */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class FavorHinderDebug extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor(options = {}) {
    super(options);

    // Default to selected token's actor, or first character actor
    this.selectedActorId = this._getDefaultActorId();
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "vagabond-favor-hinder-debug",
    classes: ["vagabond", "favor-hinder-debug"],
    tag: "div",
    window: {
      title: "Favor/Hinder Debug",
      icon: "fa-solid fa-bug",
      resizable: true,
    },
    position: {
      width: 500,
      height: "auto",
    },
  };

  /** @override */
  static PARTS = {
    main: {
      template: "systems/vagabond/templates/dialog/favor-hinder-debug.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Get the currently selected actor.
   * @returns {VagabondActor|null}
   */
  get actor() {
    return game.actors.get(this.selectedActorId) || null;
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /**
   * Get the default actor ID (selected token only, otherwise blank).
   * @returns {string|null}
   * @private
   */
  _getDefaultActorId() {
    // Only default to selected token's actor, otherwise blank
    const controlled = canvas.tokens?.controlled?.[0];
    if (controlled?.actor?.type === "character") {
      return controlled.actor.id;
    }

    return null;
  }

  /**
   * Get all current favor/hinder flags for an actor.
   * @param {VagabondActor} actor
   * @returns {Object} Organized flag data
   * @private
   */
  _getActorFlags(actor) {
    if (!actor) return { skills: {}, attacks: {}, saves: {} };

    const flags = {
      skills: {},
      attacks: { favor: false, hinder: false },
      saves: {},
    };

    // Skills
    for (const skillId of Object.keys(CONFIG.VAGABOND.skills)) {
      flags.skills[skillId] = {
        favor: actor.getFlag("vagabond", `favor.skills.${skillId}`) || false,
        hinder: actor.getFlag("vagabond", `hinder.skills.${skillId}`) || false,
      };
    }

    // Attacks
    flags.attacks.favor = actor.getFlag("vagabond", "favor.attacks") || false;
    flags.attacks.hinder = actor.getFlag("vagabond", "hinder.attacks") || false;

    // Saves
    for (const saveId of Object.keys(CONFIG.VAGABOND.saves)) {
      flags.saves[saveId] = {
        favor: actor.getFlag("vagabond", `favor.saves.${saveId}`) || false,
        hinder: actor.getFlag("vagabond", `hinder.saves.${saveId}`) || false,
      };
    }

    return flags;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(_options) {
    const context = {};

    // Get all character actors for dropdown
    context.actors = game.actors
      .filter((a) => a.type === "character")
      .map((a) => ({
        id: a.id,
        name: a.name,
        selected: a.id === this.selectedActorId,
      }));

    context.selectedActorId = this.selectedActorId;
    context.actor = this.actor;

    // Get current flags if actor selected
    if (this.actor) {
      const flags = this._getActorFlags(this.actor);

      // Skills with labels
      context.skills = Object.entries(CONFIG.VAGABOND.skills).map(([id, config]) => ({
        id,
        label: game.i18n.localize(config.label),
        stat: config.stat,
        favor: flags.skills[id]?.favor || false,
        hinder: flags.skills[id]?.hinder || false,
      }));

      // Attacks
      context.attacks = {
        favor: flags.attacks.favor,
        hinder: flags.attacks.hinder,
      };

      // Saves with labels
      context.saves = Object.entries(CONFIG.VAGABOND.saves).map(([id, config]) => ({
        id,
        label: game.i18n.localize(config.label),
        favor: flags.saves[id]?.favor || false,
        hinder: flags.saves[id]?.hinder || false,
      }));
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Actor selection dropdown
    const actorSelect = this.element.querySelector('[name="actorId"]');
    actorSelect?.addEventListener("change", (event) => {
      this.selectedActorId = event.target.value;
      this.render();
    });

    // Skill checkboxes
    const skillCheckboxes = this.element.querySelectorAll(".skill-flag");
    for (const checkbox of skillCheckboxes) {
      checkbox.addEventListener("change", (event) => this._onSkillFlagChange(event));
    }

    // Attack checkboxes
    const attackCheckboxes = this.element.querySelectorAll(".attack-flag");
    for (const checkbox of attackCheckboxes) {
      checkbox.addEventListener("change", (event) => this._onAttackFlagChange(event));
    }

    // Save checkboxes
    const saveCheckboxes = this.element.querySelectorAll(".save-flag");
    for (const checkbox of saveCheckboxes) {
      checkbox.addEventListener("change", (event) => this._onSaveFlagChange(event));
    }

    // Clear all button
    const clearBtn = this.element.querySelector('[data-action="clear-all"]');
    clearBtn?.addEventListener("click", () => this._onClearAll());

    // Test roll button
    const testRollBtn = this.element.querySelector('[data-action="test-roll"]');
    testRollBtn?.addEventListener("click", () => this._onTestRoll());
  }

  /**
   * Handle skill flag checkbox change.
   * @param {Event} event
   * @private
   */
  async _onSkillFlagChange(event) {
    if (!this.actor) return;

    const checkbox = event.currentTarget;
    const skillId = checkbox.dataset.skill;
    const flagType = checkbox.dataset.flagType; // "favor" or "hinder"
    const isChecked = checkbox.checked;

    const flagPath = `${flagType}.skills.${skillId}`;

    if (isChecked) {
      await this.actor.setFlag("vagabond", flagPath, true);
    } else {
      await this.actor.unsetFlag("vagabond", flagPath);
    }

    // Show notification
    const skillLabel = game.i18n.localize(CONFIG.VAGABOND.skills[skillId].label);
    const action = isChecked ? "added to" : "removed from";
    ui.notifications.info(
      `${flagType.charAt(0).toUpperCase() + flagType.slice(1)} ${action} ${this.actor.name} for ${skillLabel}`
    );
  }

  /**
   * Handle attack flag checkbox change.
   * @param {Event} event
   * @private
   */
  async _onAttackFlagChange(event) {
    if (!this.actor) return;

    const checkbox = event.currentTarget;
    const flagType = checkbox.dataset.flagType;
    const isChecked = checkbox.checked;

    const flagPath = `${flagType}.attacks`;

    if (isChecked) {
      await this.actor.setFlag("vagabond", flagPath, true);
    } else {
      await this.actor.unsetFlag("vagabond", flagPath);
    }

    const action = isChecked ? "added to" : "removed from";
    ui.notifications.info(`Attack ${flagType} ${action} ${this.actor.name}`);
  }

  /**
   * Handle save flag checkbox change.
   * @param {Event} event
   * @private
   */
  async _onSaveFlagChange(event) {
    if (!this.actor) return;

    const checkbox = event.currentTarget;
    const saveId = checkbox.dataset.save;
    const flagType = checkbox.dataset.flagType;
    const isChecked = checkbox.checked;

    const flagPath = `${flagType}.saves.${saveId}`;

    if (isChecked) {
      await this.actor.setFlag("vagabond", flagPath, true);
    } else {
      await this.actor.unsetFlag("vagabond", flagPath);
    }

    const saveLabel = game.i18n.localize(CONFIG.VAGABOND.saves[saveId].label);
    const action = isChecked ? "added to" : "removed from";
    ui.notifications.info(
      `${flagType.charAt(0).toUpperCase() + flagType.slice(1)} ${action} ${this.actor.name} for ${saveLabel} save`
    );
  }

  /**
   * Clear all favor/hinder flags from the selected actor.
   * @private
   */
  async _onClearAll() {
    if (!this.actor) return;

    // Clear all flags by unsetting the root favor/hinder objects
    await this.actor.unsetFlag("vagabond", "favor");
    await this.actor.unsetFlag("vagabond", "hinder");

    ui.notifications.info(`Cleared all favor/hinder flags from ${this.actor.name}`);
    this.render();
  }

  /**
   * Open a skill check dialog for testing.
   * @private
   */
  async _onTestRoll() {
    if (!this.actor) {
      ui.notifications.warn("Select an actor first");
      return;
    }

    // Import and open the skill check dialog
    const { SkillCheckDialog } = game.vagabond.applications;
    SkillCheckDialog.prompt(this.actor);
  }

  /* -------------------------------------------- */
  /*  Static Methods                              */
  /* -------------------------------------------- */

  /**
   * Open the debug panel.
   * @returns {Promise<FavorHinderDebug>}
   */
  static async open() {
    const app = new this();
    return app.render(true);
  }
}
