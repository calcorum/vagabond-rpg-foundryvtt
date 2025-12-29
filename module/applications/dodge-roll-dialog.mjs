/**
 * Dodge Roll Dialog for Vagabond RPG
 *
 * Simplified dialog for dodge defense rolls:
 * - Uses Reflex save difficulty
 * - Automatically applies hinder if wearing heavy armor
 * - Shows favor/hinder toggles and modifiers
 *
 * @extends VagabondRollDialog
 */

import VagabondRollDialog from "./base-roll-dialog.mjs";
import { saveRoll } from "../dice/rolls.mjs";

export default class DodgeRollDialog extends VagabondRollDialog {
  /**
   * @param {VagabondActor} actor - The actor making the roll
   * @param {Object} options - Dialog options
   */
  constructor(actor, options = {}) {
    super(actor, options);

    // Dodge always uses Reflex
    this.saveType = "reflex";
    this.defenseType = "dodge";

    // Check for heavy armor hinder
    this.hasHeavyArmor = actor.getEquippedArmor().some((a) => a.system.hindersDodge);

    // Build auto favor/hinder including heavy armor
    const baseFavorHinder = actor.getNetFavorHinder({ saveType: "reflex" });
    if (this.hasHeavyArmor) {
      baseFavorHinder.hinderSources.push(game.i18n.localize("VAGABOND.HinderedByHeavyArmor"));
      baseFavorHinder.net = Math.max(-1, baseFavorHinder.net - 1);
    }
    this.rollConfig.autoFavorHinder = baseFavorHinder;
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: "vagabond-dodge-roll-dialog",
      window: {
        title: "VAGABOND.Dodge",
        icon: "fa-solid fa-person-running",
      },
      position: {
        width: 340,
      },
    },
    { inplace: false }
  );

  /** @override */
  static PARTS = {
    form: {
      template: "systems/vagabond/templates/dialog/dodge-roll.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("VAGABOND.Dodge");
  }

  /**
   * Get the difficulty for this dodge (Reflex save difficulty).
   * @returns {number}
   */
  get difficulty() {
    return this.actor.system.saves.reflex.difficulty;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareRollContext(_options) {
    return {
      difficulty: this.difficulty,
      hasHeavyArmor: this.hasHeavyArmor,
      saveStats: "DEX + AWR",
    };
  }

  /* -------------------------------------------- */
  /*  Roll Execution                              */
  /* -------------------------------------------- */

  /** @override */
  async _executeRoll() {
    const result = await saveRoll(this.actor, "reflex", this.difficulty, {
      favorHinder: this.netFavorHinder,
      modifier: this.rollConfig.modifier,
      isDodge: true,
    });

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
    const templateData = {
      actor: this.actor,
      saveType: "reflex",
      saveLabel: game.i18n.localize("VAGABOND.SaveReflex"),
      stats: ["DEX", "AWR"],
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
      isDefense: true,
      defenseType: "dodge",
      defenseLabel: game.i18n.localize("VAGABOND.Dodge"),
    };

    const content = await renderTemplate(
      "systems/vagabond/templates/chat/save-roll.hbs",
      templateData
    );

    return ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [result.roll],
      sound: CONFIG.sounds.dice,
    });
  }

  /* -------------------------------------------- */
  /*  Static Methods                              */
  /* -------------------------------------------- */

  /**
   * Create and render a dodge roll dialog.
   *
   * @param {VagabondActor} actor - The actor making the roll
   * @param {Object} [options] - Additional options
   * @returns {Promise<DodgeRollDialog>}
   */
  static async prompt(actor, options = {}) {
    return this.create(actor, options);
  }
}
