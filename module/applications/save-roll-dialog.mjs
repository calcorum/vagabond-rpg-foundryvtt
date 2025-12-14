/**
 * Save Roll Dialog for Vagabond RPG
 *
 * Extends VagabondRollDialog to handle saving throw configuration:
 * - Save type selection (Reflex, Endure, Will)
 * - Displays calculated difficulty from stats
 * - Block/Dodge choice for Reflex saves (defense)
 * - Favor/Hinder toggles
 *
 * Save Difficulties:
 * - Reflex: 20 - DEX - AWR
 * - Endure: 20 - MIT - MIT (MIT counts twice)
 * - Will: 20 - RSN - PRS
 *
 * @extends VagabondRollDialog
 */

import VagabondRollDialog from "./base-roll-dialog.mjs";
import { saveRoll } from "../dice/rolls.mjs";

export default class SaveRollDialog extends VagabondRollDialog {
  /**
   * @param {VagabondActor} actor - The actor making the roll
   * @param {Object} options - Dialog options
   * @param {string} [options.saveType] - Pre-selected save type
   * @param {number} [options.difficulty] - Target difficulty (if known)
   * @param {boolean} [options.isDefense=false] - If true, this is a defensive save (show Block/Dodge)
   */
  constructor(actor, options = {}) {
    super(actor, options);

    this.saveType = options.saveType || null;
    this.targetDifficulty = options.difficulty || null;
    this.isDefense = options.isDefense || false;
    this.defenseType = null; // "block" or "dodge" for Reflex defense saves

    // Load automatic favor/hinder for this save type
    if (this.saveType) {
      this.rollConfig.autoFavorHinder = actor.getNetFavorHinder({ saveType: this.saveType });
    }
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: "vagabond-save-roll-dialog",
      window: {
        title: "VAGABOND.SaveRoll",
        icon: "fa-solid fa-shield-halved",
      },
      position: {
        width: 360,
      },
    },
    { inplace: false }
  );

  /** @override */
  static PARTS = {
    form: {
      template: "systems/vagabond/templates/dialog/save-roll.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    if (this.saveType) {
      const saveLabel = CONFIG.VAGABOND?.saves?.[this.saveType]?.label || this.saveType;
      return `${game.i18n.localize(saveLabel)} ${game.i18n.localize("VAGABOND.Save")}`;
    }
    return game.i18n.localize("VAGABOND.SaveRoll");
  }

  /**
   * Get the current save data from the actor.
   * @returns {Object|null}
   */
  get saveData() {
    if (!this.saveType) return null;
    return this.actor.system.saves?.[this.saveType] || null;
  }

  /**
   * Get the difficulty for this save.
   * Uses targetDifficulty if provided, otherwise uses actor's calculated difficulty.
   * @returns {number}
   */
  get difficulty() {
    // If a specific difficulty was provided (from an effect), use that
    if (this.targetDifficulty !== null) {
      return this.targetDifficulty;
    }
    // Otherwise use the actor's calculated save difficulty
    return this.saveData?.difficulty || 10;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareRollContext(_options) {
    const context = {};

    // Available saves for dropdown
    context.saves = Object.entries(CONFIG.VAGABOND?.saves || {}).map(([id, config]) => {
      const saveData = this.actor.system.saves?.[id] || {};
      const stats = config.stats || [];
      const statLabels = stats.map((s) => game.i18n.localize(CONFIG.VAGABOND?.statsAbbr?.[s] || s));

      return {
        id,
        label: game.i18n.localize(config.label),
        stats: statLabels.join(" + "),
        difficulty: saveData.difficulty || 10,
        selected: id === this.saveType,
      };
    });

    context.selectedSaveType = this.saveType;
    context.saveData = this.saveData;

    if (this.saveData) {
      context.difficulty = this.difficulty;

      // Get the associated stats
      const saveConfig = CONFIG.VAGABOND?.saves?.[this.saveType];
      if (saveConfig?.stats) {
        context.statLabels = saveConfig.stats.map((s) =>
          game.i18n.localize(CONFIG.VAGABOND?.stats?.[s] || s)
        );
        context.statValues = saveConfig.stats.map((s) => this.actor.system.stats?.[s]?.value || 0);
      }
    }

    // Defense options for Reflex saves
    context.isDefense = this.isDefense;
    context.showDefenseOptions = this.isDefense && this.saveType === "reflex";
    context.defenseType = this.defenseType;

    // Check if actor has a shield equipped for Block option
    context.hasShield = this._hasShieldEquipped();

    return context;
  }

  /**
   * Check if the actor has a shield equipped.
   * @returns {boolean}
   * @private
   */
  _hasShieldEquipped() {
    return this.actor.items.some(
      (item) => item.type === "armor" && item.system.armorType === "shield" && item.system.equipped
    );
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Save type selection dropdown
    const saveSelect = this.element.querySelector('[name="saveType"]');
    saveSelect?.addEventListener("change", (event) => {
      this.saveType = event.target.value;
      this.rollConfig.autoFavorHinder = this.actor.getNetFavorHinder({
        saveType: this.saveType,
      });
      this.defenseType = null; // Reset defense type when save changes
      this.render();
    });

    // Defense type selection (Block/Dodge)
    const defenseButtons = this.element.querySelectorAll("[data-defense]");
    for (const btn of defenseButtons) {
      btn.addEventListener("click", (event) => {
        this.defenseType = event.currentTarget.dataset.defense;
        this.render();
      });
    }
  }

  /** @override */
  async _executeRoll() {
    if (!this.saveType) {
      ui.notifications.warn(game.i18n.localize("VAGABOND.SelectSaveFirst"));
      return;
    }

    // Perform the save roll
    const result = await saveRoll(this.actor, this.saveType, this.difficulty, {
      favorHinder: this.netFavorHinder,
      modifier: this.rollConfig.modifier,
      isBlock: this.defenseType === "block",
      isDodge: this.defenseType === "dodge",
    });

    // Send to chat with custom template
    await this._sendToChat(result);
  }

  /**
   * Send the roll result to chat.
   *
   * @param {VagabondRollResult} result - The roll result
   * @returns {Promise<ChatMessage>}
   * @private
   */
  async _sendToChat(result) {
    const saveConfig = CONFIG.VAGABOND?.saves?.[this.saveType];
    const saveLabel = game.i18n.localize(saveConfig?.label || this.saveType);

    // Prepare template data
    const templateData = {
      actor: this.actor,
      saveType: this.saveType,
      saveLabel,
      stats: saveConfig?.stats?.map((s) =>
        game.i18n.localize(CONFIG.VAGABOND?.statsAbbr?.[s] || s)
      ),
      difficulty: result.difficulty,
      total: result.total,
      d20Result: result.d20Result,
      favorDie: result.favorDie,
      modifier: this.rollConfig.modifier,
      success: result.success,
      isCrit: result.isCrit,
      isFumble: result.isFumble,
      formula: result.roll.formula,
      netFavorHinder: this.netFavorHinder,
      favorSources: this.rollConfig.autoFavorHinder.favorSources,
      hinderSources: this.rollConfig.autoFavorHinder.hinderSources,
      // Defense info
      isDefense: this.isDefense,
      defenseType: this.defenseType,
      defenseLabel: this.defenseType
        ? game.i18n.localize(
            `VAGABOND.${this.defenseType.charAt(0).toUpperCase() + this.defenseType.slice(1)}`
          )
        : null,
    };

    // Render the chat card template
    const content = await renderTemplate(
      "systems/vagabond/templates/chat/save-roll.hbs",
      templateData
    );

    // Create the chat message
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [result.roll],
      sound: CONFIG.sounds.dice,
    };

    return ChatMessage.create(chatData);
  }

  /* -------------------------------------------- */
  /*  Static Methods                              */
  /* -------------------------------------------- */

  /**
   * Create and render a save roll dialog.
   *
   * @param {VagabondActor} actor - The actor making the roll
   * @param {string} [saveType] - Optional pre-selected save type
   * @param {Object} [options] - Additional options
   * @returns {Promise<SaveRollDialog>}
   */
  static async prompt(actor, saveType = null, options = {}) {
    return this.create(actor, { ...options, saveType });
  }

  /**
   * Prompt for a defensive save (Block or Dodge).
   *
   * @param {VagabondActor} actor - The actor making the defense
   * @param {number} difficulty - The attack roll to beat
   * @param {Object} [options] - Additional options
   * @returns {Promise<SaveRollDialog>}
   */
  static async promptDefense(actor, difficulty, options = {}) {
    return this.create(actor, {
      ...options,
      saveType: "reflex",
      difficulty,
      isDefense: true,
    });
  }

  /**
   * Perform a quick save roll without showing the dialog.
   *
   * @param {VagabondActor} actor - The actor making the roll
   * @param {string} saveType - The save type
   * @param {number} [difficulty] - Target difficulty (uses actor's save if not provided)
   * @param {Object} [options] - Roll options
   * @returns {Promise<VagabondRollResult>}
   */
  static async quickRoll(actor, saveType, difficulty = null, options = {}) {
    // Get automatic favor/hinder
    const autoFavorHinder = actor.getNetFavorHinder({ saveType });

    // Use provided difficulty or actor's calculated save difficulty
    const targetDifficulty = difficulty ?? actor.system.saves?.[saveType]?.difficulty ?? 10;

    // Perform the roll
    const result = await saveRoll(actor, saveType, targetDifficulty, {
      favorHinder: options.favorHinder ?? autoFavorHinder.net,
      modifier: options.modifier || 0,
    });

    // Create temporary dialog for chat output
    const tempDialog = new this(actor, { saveType, difficulty: targetDifficulty });
    tempDialog.rollConfig.autoFavorHinder = autoFavorHinder;
    await tempDialog._sendToChat(result);

    return result;
  }
}
