/**
 * Block Roll Dialog for Vagabond RPG
 *
 * Dialog for block defense rolls:
 * - Uses Endure save difficulty
 * - Has "vs Ranged Attack?" toggle that applies hinder when checked
 * - Requires shield to be equipped
 *
 * @extends VagabondRollDialog
 */

import VagabondRollDialog from "./base-roll-dialog.mjs";
import { saveRoll } from "../dice/rolls.mjs";

export default class BlockRollDialog extends VagabondRollDialog {
  /**
   * @param {VagabondActor} actor - The actor making the roll
   * @param {Object} options - Dialog options
   */
  constructor(actor, options = {}) {
    super(actor, options);

    // Block always uses Endure
    this.saveType = "endure";
    this.defenseType = "block";
    this.vsRanged = false; // Toggle state for ranged attack hinder

    // Load base favor/hinder for endure saves
    this.rollConfig.autoFavorHinder = actor.getNetFavorHinder({ saveType: "endure" });
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: "vagabond-block-roll-dialog",
      window: {
        title: "VAGABOND.Block",
        icon: "fa-solid fa-shield",
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
      template: "systems/vagabond/templates/dialog/block-roll.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    return game.i18n.localize("VAGABOND.Block");
  }

  /**
   * Get the difficulty for this block (Endure save difficulty).
   * @returns {number}
   */
  get difficulty() {
    return this.actor.system.saves.endure.difficulty;
  }

  /**
   * Get the net favor/hinder value including ranged toggle.
   * @override
   * @returns {number} -1, 0, or +1
   */
  get netFavorHinder() {
    const manual = this.rollConfig.favorHinder;
    let auto = this.rollConfig.autoFavorHinder.net;

    // Apply ranged hinder if toggled
    if (this.vsRanged) {
      auto = Math.max(-1, auto - 1);
    }

    return Math.clamp(manual + auto, -1, 1);
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareRollContext(_options) {
    // Build hinder sources including ranged if toggled
    const hinderSources = [...this.rollConfig.autoFavorHinder.hinderSources];
    if (this.vsRanged) {
      hinderSources.push(game.i18n.localize("VAGABOND.HinderedByRanged"));
    }

    return {
      difficulty: this.difficulty,
      vsRanged: this.vsRanged,
      saveStats: "MIT + MIT",
      hinderSources,
    };
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // vs Ranged toggle
    const rangedToggle = this.element.querySelector('[name="vsRanged"]');
    rangedToggle?.addEventListener("change", (event) => {
      this.vsRanged = event.target.checked;
      this.render();
    });
  }

  /* -------------------------------------------- */
  /*  Roll Execution                              */
  /* -------------------------------------------- */

  /** @override */
  async _executeRoll() {
    const result = await saveRoll(this.actor, "endure", this.difficulty, {
      favorHinder: this.netFavorHinder,
      modifier: this.rollConfig.modifier,
      isBlock: true,
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
    // Build hinder sources including ranged
    const hinderSources = [...this.rollConfig.autoFavorHinder.hinderSources];
    if (this.vsRanged) {
      hinderSources.push(game.i18n.localize("VAGABOND.HinderedByRanged"));
    }

    const templateData = {
      actor: this.actor,
      saveType: "endure",
      saveLabel: game.i18n.localize("VAGABOND.SaveEndure"),
      stats: ["MIT", "MIT"],
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
      hinderSources,
      isDefense: true,
      defenseType: "block",
      defenseLabel: game.i18n.localize("VAGABOND.Block"),
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
   * Create and render a block roll dialog.
   *
   * @param {VagabondActor} actor - The actor making the roll
   * @param {Object} [options] - Additional options
   * @returns {Promise<BlockRollDialog>}
   */
  static async prompt(actor, options = {}) {
    return this.create(actor, options);
  }
}
