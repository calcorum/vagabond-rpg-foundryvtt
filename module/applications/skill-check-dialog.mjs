/**
 * Skill Check Dialog for Vagabond RPG
 *
 * Extends VagabondRollDialog to handle skill check configuration:
 * - Skill selection (if not pre-selected)
 * - Displays calculated difficulty
 * - Displays crit threshold
 * - Shows trained/untrained status
 *
 * @extends VagabondRollDialog
 */

import VagabondRollDialog from "./base-roll-dialog.mjs";
import { skillCheck } from "../dice/rolls.mjs";

export default class SkillCheckDialog extends VagabondRollDialog {
  /**
   * @param {VagabondActor} actor - The actor making the roll
   * @param {Object} options - Dialog options
   * @param {string} [options.skillId] - Pre-selected skill ID
   */
  constructor(actor, options = {}) {
    super(actor, options);

    this.skillId = options.skillId || null;

    // Load automatic favor/hinder for this skill
    if (this.skillId) {
      this.rollConfig.autoFavorHinder = actor.getNetFavorHinder({ skillId: this.skillId });
    }
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: "vagabond-skill-check-dialog",
      window: {
        title: "VAGABOND.SkillCheck",
        icon: "fa-solid fa-dice-d20",
      },
    },
    { inplace: false }
  );

  /** @override */
  static PARTS = {
    form: {
      template: "systems/vagabond/templates/dialog/skill-check.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    if (this.skillId) {
      const skillLabel = CONFIG.VAGABOND?.skills?.[this.skillId]?.label || this.skillId;
      return `${game.i18n.localize(skillLabel)} ${game.i18n.localize("VAGABOND.Check")}`;
    }
    return game.i18n.localize("VAGABOND.SkillCheck");
  }

  /**
   * Get the current skill data.
   * @returns {Object|null} Skill data from actor
   */
  get skillData() {
    if (!this.skillId) return null;
    return this.actor.system.skills?.[this.skillId] || null;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareRollContext(_options) {
    const context = {};

    // Available skills for dropdown (if no skill pre-selected)
    context.skills = Object.entries(CONFIG.VAGABOND?.skills || {}).map(([id, config]) => {
      const skillData = this.actor.system.skills?.[id] || {};
      const statValue = this.actor.system.stats?.[config.stat]?.value || 0;
      const trained = skillData.trained || false;
      // Calculate difficulty directly: 20 - stat (untrained) or 20 - stat×2 (trained)
      const difficulty = trained ? 20 - statValue * 2 : 20 - statValue;
      return {
        id,
        label: game.i18n.localize(config.label),
        stat: config.stat,
        trained,
        difficulty,
        critThreshold: skillData.critThreshold || 20,
        selected: id === this.skillId,
      };
    });

    // Selected skill info
    context.selectedSkill = this.skillId;
    context.skillData = this.skillData;

    if (this.skillData) {
      // Get the associated stat and calculate difficulty
      const statKey = CONFIG.VAGABOND?.skills?.[this.skillId]?.stat;
      const statValue = this.actor.system.stats?.[statKey]?.value || 0;
      const trained = this.skillData.trained;
      // Calculate difficulty: 20 - stat (untrained) or 20 - stat×2 (trained)
      const difficulty = trained ? 20 - statValue * 2 : 20 - statValue;
      const critThreshold = this.skillData.critThreshold || 20;

      // Store on instance for use in _executeRoll
      this._calculatedDifficulty = difficulty;
      this._calculatedCritThreshold = critThreshold;

      context.difficulty = difficulty;
      context.critThreshold = critThreshold;
      context.trained = trained;

      if (statKey) {
        context.statLabel = game.i18n.localize(CONFIG.VAGABOND?.stats?.[statKey]?.label || statKey);
        context.statValue = statValue;
      }
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Skill selection dropdown
    const skillSelect = this.element.querySelector('[name="skillId"]');
    skillSelect?.addEventListener("change", (event) => {
      this.skillId = event.target.value;
      this.rollConfig.autoFavorHinder = this.actor.getNetFavorHinder({ skillId: this.skillId });
      this.render();
    });
  }

  /** @override */
  async _executeRoll() {
    if (!this.skillId) {
      ui.notifications.warn(game.i18n.localize("VAGABOND.SelectSkillFirst"));
      return;
    }

    // Perform the skill check with pre-calculated difficulty
    const result = await skillCheck(this.actor, this.skillId, {
      difficulty: this._calculatedDifficulty,
      critThreshold: this._calculatedCritThreshold,
      favorHinder: this.netFavorHinder,
      modifier: this.rollConfig.modifier,
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
    const skillLabel = game.i18n.localize(
      CONFIG.VAGABOND?.skills?.[this.skillId]?.label || this.skillId
    );

    // Prepare template data
    const templateData = {
      actor: this.actor,
      skillId: this.skillId,
      skillLabel,
      trained: this.skillData?.trained || false,
      difficulty: result.difficulty,
      critThreshold: result.critThreshold,
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
    };

    // Render the chat card template
    const content = await renderTemplate(
      "systems/vagabond/templates/chat/skill-roll.hbs",
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
   * Create and render a skill check dialog.
   *
   * @param {VagabondActor} actor - The actor making the roll
   * @param {string} [skillId] - Optional pre-selected skill
   * @param {Object} [options] - Additional options
   * @returns {Promise<SkillCheckDialog>}
   */
  static async prompt(actor, skillId = null, options = {}) {
    return this.create(actor, { ...options, skillId });
  }

  /**
   * Perform a quick roll without showing the dialog.
   * Used for Shift+click fast rolling.
   *
   * @param {VagabondActor} actor - The actor making the roll
   * @param {string} skillId - The skill to check
   * @param {Object} [options] - Roll options
   * @returns {Promise<VagabondRollResult>}
   */
  static async quickRoll(actor, skillId, options = {}) {
    // Get automatic favor/hinder
    const autoFavorHinder = actor.getNetFavorHinder({ skillId });

    // Perform the roll
    const result = await skillCheck(actor, skillId, {
      favorHinder: options.favorHinder ?? autoFavorHinder.net,
      modifier: options.modifier || 0,
    });

    // Create a temporary dialog instance just for chat output
    const tempDialog = new this(actor, { skillId });
    tempDialog.rollConfig.autoFavorHinder = autoFavorHinder;
    await tempDialog._sendToChat(result);

    return result;
  }
}
