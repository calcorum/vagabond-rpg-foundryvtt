/**
 * Attack Roll Dialog for Vagabond RPG
 *
 * Extends VagabondRollDialog to handle attack roll configuration:
 * - Weapon selection from equipped weapons
 * - Attack type display (Melee/Brawl/Ranged/Finesse)
 * - Difficulty/crit threshold calculation
 * - Two-handed toggle for versatile weapons
 * - Damage roll on hit
 *
 * @extends VagabondRollDialog
 */

import VagabondRollDialog from "./base-roll-dialog.mjs";
import { attackCheck, damageRoll } from "../dice/rolls.mjs";

export default class AttackRollDialog extends VagabondRollDialog {
  /**
   * @param {VagabondActor} actor - The actor making the roll
   * @param {Object} options - Dialog options
   * @param {string} [options.weaponId] - Pre-selected weapon ID
   */
  constructor(actor, options = {}) {
    super(actor, options);

    this.weaponId = options.weaponId || null;
    this.twoHanded = false;
    this.critThresholdModifier = 0; // Relative adjustment to base crit threshold

    // Auto-select first equipped weapon if none specified, otherwise default to unarmed
    if (!this.weaponId) {
      const equippedWeapons = this._getEquippedWeapons();
      if (equippedWeapons.length > 0) {
        this.weaponId = equippedWeapons[0].id;
      } else {
        this.weaponId = "unarmed";
      }
    }

    // Load automatic favor/hinder for attacks
    this.rollConfig.autoFavorHinder = actor.getNetFavorHinder({ isAttack: true });
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: "vagabond-attack-roll-dialog",
      window: {
        title: "VAGABOND.AttackRoll",
        icon: "fa-solid fa-swords",
      },
      position: {
        width: 380,
      },
    },
    { inplace: false }
  );

  /** @override */
  static PARTS = {
    form: {
      template: "systems/vagabond/templates/dialog/attack-roll.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    if (this.weapon) {
      return `${game.i18n.localize("VAGABOND.Attack")}: ${this.weapon.name}`;
    }
    return game.i18n.localize("VAGABOND.AttackRoll");
  }

  /**
   * Get the currently selected weapon.
   * Returns a virtual "Unarmed" weapon object if weaponId is "unarmed".
   * @returns {VagabondItem|Object|null}
   */
  get weapon() {
    if (!this.weaponId) return null;

    // Return virtual unarmed weapon
    if (this.weaponId === "unarmed") {
      return this._getUnarmedWeapon();
    }

    return this.actor.items.get(this.weaponId) || null;
  }

  /**
   * Get the virtual unarmed strike weapon.
   * All characters have access to this attack.
   * @returns {Object} Virtual weapon object matching weapon item interface
   * @private
   */
  _getUnarmedWeapon() {
    return {
      id: "unarmed",
      name: game.i18n.localize("VAGABOND.Unarmed"),
      img: "icons/skills/melee/unarmed-punch-fist.webp",
      type: "weapon",
      system: {
        damage: "1",
        damageType: "blunt",
        bonusDamage: 0,
        grip: "fist",
        attackType: "brawl",
        range: { value: 0, units: "ft" },
        properties: {
          finesse: false,
          thrown: false,
          cleave: false,
          reach: false,
          loading: false,
          brawl: true,
          crude: false,
          versatile: false,
        },
        equipped: true,
        slots: 0,
        value: 0,
        critThreshold: null,
        // Methods to match weapon item interface
        getAttackStat: () => "might",
        getDamageFormula: () => "1",
        getActiveProperties: () => ["brawl"],
      },
    };
  }

  /**
   * Get the attack data for the current weapon.
   * @returns {Object|null}
   */
  get attackData() {
    const weapon = this.weapon;
    if (!weapon) return null;

    const attackType = weapon.system.attackType || "melee";
    const attackConfig = CONFIG.VAGABOND?.attackTypes?.[attackType];
    if (!attackConfig) return null;

    const statKey = weapon.system.getAttackStat?.() || attackConfig.stat;
    const statValue = this.actor.system.stats?.[statKey]?.value || 0;

    // Attacks use trained difficulty (20 - stat × 2)
    const difficulty = 20 - statValue * 2;

    // Get base crit threshold from actor's attack data or weapon override
    const actorCritThreshold = this.actor.system.attacks?.[attackType]?.critThreshold || 20;
    const weaponCritThreshold = weapon.system.critThreshold;
    const baseCritThreshold = weaponCritThreshold ?? actorCritThreshold;

    // Calculate effective crit threshold with modifier, clamped to 1-20
    const effectiveCritThreshold = Math.clamp(
      baseCritThreshold + this.critThresholdModifier,
      1,
      20
    );

    return {
      attackType,
      attackLabel: game.i18n.localize(attackConfig.label),
      statKey,
      statLabel: game.i18n.localize(CONFIG.VAGABOND?.stats?.[statKey] || statKey),
      statValue,
      difficulty,
      baseCritThreshold,
      effectiveCritThreshold,
      critThresholdModifier: this.critThresholdModifier,
    };
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /**
   * Get all equipped weapons for this actor.
   * @returns {Array<VagabondItem>}
   * @private
   */
  _getEquippedWeapons() {
    return this.actor.items.filter((item) => item.type === "weapon" && item.system.equipped);
  }

  /**
   * Get all weapons (equipped or not) for this actor.
   * @returns {Array<VagabondItem>}
   * @private
   */
  _getAllWeapons() {
    return this.actor.items.filter((item) => item.type === "weapon");
  }

  /**
   * Get the damage formula for the current weapon.
   * @returns {string}
   * @private
   */
  _getDamageFormula() {
    const weapon = this.weapon;
    if (!weapon) return "1d6";

    return weapon.system.getDamageFormula?.(this.twoHanded) || weapon.system.damage || "1d6";
  }

  /**
   * Extract dice results from a Roll for display.
   * @param {Roll|null} roll - The roll to extract results from
   * @returns {Array<{faces: number, result: number}>} Array of dice results
   * @private
   */
  _extractDiceResults(roll) {
    if (!roll) return [];

    const results = [];
    for (const term of roll.terms) {
      if (term instanceof foundry.dice.terms.Die) {
        for (const r of term.results) {
          results.push({
            faces: term.faces,
            result: r.result,
          });
        }
      }
    }
    return results;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareRollContext(_options) {
    const context = {};

    // Get all weapons for selection (including unarmed)
    const allWeapons = this._getAllWeapons();
    const unarmed = this._getUnarmedWeapon();

    // Build weapons list with unarmed always first
    context.weapons = [
      {
        id: "unarmed",
        name: unarmed.name,
        img: unarmed.img,
        equipped: true,
        attackType: unarmed.system.attackType,
        damage: unarmed.system.damage,
        grip: unarmed.system.grip,
        isVersatile: false,
        isUnarmed: true,
        selected: this.weaponId === "unarmed",
      },
      ...allWeapons.map((w) => ({
        id: w.id,
        name: w.name,
        img: w.img,
        equipped: w.system.equipped,
        attackType: w.system.attackType,
        damage: w.system.damage,
        grip: w.system.grip,
        isVersatile: w.system.properties?.versatile || false,
        isUnarmed: false,
        selected: w.id === this.weaponId,
      })),
    ];

    context.hasWeapons = true; // Always true now since unarmed is always available
    context.selectedWeaponId = this.weaponId;
    context.weapon = this.weapon;

    // Attack data
    const attackData = this.attackData;
    if (attackData) {
      context.attackType = attackData.attackType;
      context.attackLabel = attackData.attackLabel;
      context.statLabel = attackData.statLabel;
      context.statValue = attackData.statValue;
      context.difficulty = attackData.difficulty;
      context.baseCritThreshold = attackData.baseCritThreshold;
      context.effectiveCritThreshold = attackData.effectiveCritThreshold;
      context.critThresholdModifier = attackData.critThresholdModifier;
    }

    // Versatile weapon handling
    const weapon = this.weapon;
    if (weapon) {
      context.isVersatile = weapon.system.properties?.versatile || false;
      context.twoHanded = this.twoHanded;
      context.damageFormula = this._getDamageFormula();
      context.damageType = weapon.system.damageType;
      context.damageTypeLabel = game.i18n.localize(
        CONFIG.VAGABOND?.damageTypes?.[weapon.system.damageType] || weapon.system.damageType
      );

      // Weapon properties
      context.properties = weapon.system.getActiveProperties?.() || [];
      context.propertyLabels = context.properties.map((p) =>
        game.i18n.localize(CONFIG.VAGABOND?.weaponProperties?.[p] || p)
      );
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Weapon selection dropdown
    const weaponSelect = this.element.querySelector('[name="weaponId"]');
    weaponSelect?.addEventListener("change", (event) => {
      this.weaponId = event.target.value;
      this.twoHanded = false; // Reset two-handed when changing weapon
      this.critThresholdModifier = 0; // Reset crit modifier when changing weapon
      this.render();
    });

    // Two-handed toggle for versatile weapons
    const twoHandedToggle = this.element.querySelector('[name="twoHanded"]');
    twoHandedToggle?.addEventListener("change", (event) => {
      this.twoHanded = event.target.checked;
      this.render();
    });

    // Crit threshold stepper buttons
    const critIncrement = this.element.querySelector('[data-action="crit-increment"]');
    const critDecrement = this.element.querySelector('[data-action="crit-decrement"]');

    critIncrement?.addEventListener("click", () => {
      const attackData = this.attackData;
      if (!attackData) return;
      const newEffective = attackData.effectiveCritThreshold + 1;
      if (newEffective <= 20) {
        this.critThresholdModifier++;
        this.render();
      }
    });

    critDecrement?.addEventListener("click", () => {
      const attackData = this.attackData;
      if (!attackData) return;
      const newEffective = attackData.effectiveCritThreshold - 1;
      if (newEffective >= 1) {
        this.critThresholdModifier--;
        this.render();
      }
    });
  }

  /** @override */
  async _executeRoll() {
    const weapon = this.weapon;
    if (!weapon) {
      ui.notifications.warn(game.i18n.localize("VAGABOND.SelectWeaponFirst"));
      return;
    }

    // Get effective crit threshold from attack data
    const attackData = this.attackData;
    const effectiveCritThreshold = attackData?.effectiveCritThreshold ?? 20;

    // Perform the attack check
    const result = await attackCheck(this.actor, weapon, {
      favorHinder: this.netFavorHinder,
      modifier: this.rollConfig.modifier,
      critThreshold: effectiveCritThreshold,
    });

    // Send to chat (damage is rolled separately via button click)
    await this._sendToChat(result);
  }

  /**
   * Send the roll result to chat.
   *
   * @param {VagabondRollResult} result - The attack roll result
   * @param {Roll|null} damageResult - The damage roll (if hit)
   * @returns {Promise<ChatMessage>}
   * @private
   */
  async _sendToChat(result, damageResult = null) {
    const weapon = this.weapon;
    const attackData = this.attackData;
    const damageFormula = this._getDamageFormula();

    // Prepare template data
    const templateData = {
      actor: this.actor,
      weapon: {
        id: weapon.id,
        name: weapon.name,
        img: weapon.img,
        attackType: weapon.system.attackType,
        damageType: weapon.system.damageType,
        damageTypeLabel: game.i18n.localize(
          CONFIG.VAGABOND?.damageTypes?.[weapon.system.damageType] || weapon.system.damageType
        ),
        properties: weapon.system.getActiveProperties?.() || [],
      },
      attackLabel: attackData?.attackLabel,
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
      // Damage info (only present if damage was rolled)
      hasDamage: !!damageResult,
      damageTotal: damageResult?.total,
      damageFormula: damageResult?.formula,
      damageDiceResults: this._extractDiceResults(damageResult),
      twoHanded: this.twoHanded,
      // Show damage button if hit but damage not yet rolled
      showDamageButton: result.success && !damageResult,
      pendingDamageFormula: damageFormula,
    };

    // Render the chat card template
    const content = await renderTemplate(
      "systems/vagabond/templates/chat/attack-roll.hbs",
      templateData
    );

    // Collect all rolls
    const rolls = [result.roll];
    if (damageResult) rolls.push(damageResult);

    // Create the chat message with flags for later damage rolling
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls,
      sound: CONFIG.sounds.dice,
      flags: {
        vagabond: {
          type: "attack-roll",
          actorId: this.actor.id,
          weaponId: weapon.id,
          weaponName: weapon.name,
          damageFormula,
          damageType: weapon.system.damageType,
          damageTypeLabel: game.i18n.localize(
            CONFIG.VAGABOND?.damageTypes?.[weapon.system.damageType] || weapon.system.damageType
          ),
          twoHanded: this.twoHanded,
          isCrit: result.isCrit,
          success: result.success,
          damageRolled: !!damageResult,
        },
      },
    };

    return ChatMessage.create(chatData);
  }

  /* -------------------------------------------- */
  /*  Static Methods                              */
  /* -------------------------------------------- */

  /**
   * Create and render an attack roll dialog.
   *
   * @param {VagabondActor} actor - The actor making the roll
   * @param {string} [weaponId] - Optional pre-selected weapon ID
   * @param {Object} [options] - Additional options
   * @returns {Promise<AttackRollDialog>}
   */
  static async prompt(actor, weaponId = null, options = {}) {
    return this.create(actor, { ...options, weaponId });
  }

  /**
   * Perform a quick attack roll without showing the dialog.
   *
   * @param {VagabondActor} actor - The actor making the roll
   * @param {VagabondItem} weapon - The weapon to attack with
   * @param {Object} [options] - Roll options
   * @returns {Promise<Object>} Attack and damage results
   */
  static async quickRoll(actor, weapon, options = {}) {
    // Get automatic favor/hinder
    const autoFavorHinder = actor.getNetFavorHinder({ isAttack: true });

    // Perform the attack
    const result = await attackCheck(actor, weapon, {
      favorHinder: options.favorHinder ?? autoFavorHinder.net,
      modifier: options.modifier || 0,
    });

    // Roll damage if hit
    let damageResult = null;
    if (result.success) {
      const damageFormula =
        weapon.system.getDamageFormula?.(options.twoHanded) || weapon.system.damage || "1d6";
      damageResult = await damageRoll(damageFormula, {
        isCrit: result.isCrit,
        rollData: actor.getRollData(),
      });
    }

    // Create temporary dialog for chat output
    const tempDialog = new this(actor, { weaponId: weapon.id });
    tempDialog.rollConfig.autoFavorHinder = autoFavorHinder;
    tempDialog.twoHanded = options.twoHanded || false;
    await tempDialog._sendToChat(result, damageResult);

    return { attack: result, damage: damageResult };
  }
}
