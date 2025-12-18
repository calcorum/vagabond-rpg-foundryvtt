/**
 * Spell Cast Dialog for Vagabond RPG
 *
 * Extends VagabondRollDialog to handle spell casting configuration:
 * - Spell selection from known spells
 * - Damage dice selection (0 to casting max)
 * - Delivery type selection (filtered to valid types)
 * - Duration type selection (filtered to valid types)
 * - Live mana cost calculation
 * - Focus tracking for Focus duration spells
 *
 * @extends VagabondRollDialog
 */

import VagabondRollDialog from "./base-roll-dialog.mjs";
import { skillCheck, damageRoll } from "../dice/rolls.mjs";

export default class SpellCastDialog extends VagabondRollDialog {
  /**
   * @param {VagabondActor} actor - The actor casting the spell
   * @param {Object} options - Dialog options
   * @param {string} [options.spellId] - Pre-selected spell ID
   */
  constructor(actor, options = {}) {
    super(actor, options);

    this.spellId = options.spellId || null;
    this.critThresholdModifier = 0; // Relative adjustment to base crit threshold

    // Casting configuration
    this.castConfig = {
      damageDice: 0,
      delivery: null,
      duration: null,
      includeEffect: true, // Whether to include the spell's effect (beyond damage)
    };

    // Auto-select first known spell if none specified
    if (!this.spellId) {
      const knownSpells = this._getKnownSpells();
      if (knownSpells.length > 0) {
        this.spellId = knownSpells[0].id;
      }
    }

    // Initialize cast config from selected spell
    this._initializeCastConfig();

    // Load automatic favor/hinder for spell casting
    const castingSkill = this._getCastingSkill();
    this.rollConfig.autoFavorHinder = actor.getNetFavorHinder({ skillId: castingSkill });
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      id: "vagabond-spell-cast-dialog",
      window: {
        title: "VAGABOND.CastSpell",
        icon: "fa-solid fa-wand-sparkles",
      },
      position: {
        width: 400,
      },
    },
    { inplace: false }
  );

  /** @override */
  static PARTS = {
    form: {
      template: "systems/vagabond/templates/dialog/spell-cast.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /** @override */
  get title() {
    if (this.spell) {
      return `${game.i18n.localize("VAGABOND.Cast")}: ${this.spell.name}`;
    }
    return game.i18n.localize("VAGABOND.CastSpell");
  }

  /**
   * Get the currently selected spell.
   * @returns {VagabondItem|null}
   */
  get spell() {
    if (!this.spellId) return null;
    return this.actor.items.get(this.spellId) || null;
  }

  /**
   * Get the actor's current mana.
   * @returns {number}
   */
  get currentMana() {
    return this.actor.system.resources?.mana?.value || 0;
  }

  /**
   * Get the actor's max mana.
   * @returns {number}
   */
  get maxMana() {
    return this.actor.system.resources?.mana?.max || 0;
  }

  /**
   * Get the actor's casting max (max dice in one spell).
   * @returns {number}
   */
  get castingMax() {
    return this.actor.system.resources?.mana?.castingMax || 3;
  }

  /**
   * Calculate the current mana cost based on cast config.
   * @returns {number}
   */
  get manaCost() {
    const spell = this.spell;
    if (!spell) return 0;

    return spell.system.calculateManaCost({
      damageDice: this.castConfig.damageDice,
      delivery: this.castConfig.delivery,
      duration: this.castConfig.duration,
      includeEffect: this.castConfig.includeEffect,
    });
  }

  /**
   * Check if the actor can afford to cast the spell.
   * @returns {boolean}
   */
  get canAfford() {
    return this.currentMana >= this.manaCost;
  }

  /**
   * Get the casting skill for this spell.
   * @returns {string}
   */
  _getCastingSkill() {
    const spell = this.spell;
    if (spell?.system.castingSkill) {
      return spell.system.castingSkill;
    }
    // Default to arcana, but could be overridden by class
    return "arcana";
  }

  /* -------------------------------------------- */
  /*  Helper Methods                              */
  /* -------------------------------------------- */

  /**
   * Get all known spells for this actor.
   * @returns {Array<VagabondItem>}
   * @private
   */
  _getKnownSpells() {
    return this.actor.items.filter((item) => item.type === "spell");
  }

  /**
   * Initialize cast config from the selected spell's defaults.
   * @private
   */
  _initializeCastConfig() {
    const spell = this.spell;
    if (!spell) return;

    // Default to 1 damage die if spell is damaging, 0 otherwise
    this.castConfig.damageDice = spell.system.isDamaging() ? 1 : 0;

    // Default to first valid delivery type
    const validDelivery = spell.system.getValidDeliveryTypes();
    this.castConfig.delivery = validDelivery[0] || "touch";

    // Default to first valid duration type
    const validDuration = spell.system.getValidDurationTypes();
    this.castConfig.duration = validDuration[0] || "instant";
  }

  /**
   * Get the maximum damage dice this spell can use.
   * @returns {number}
   * @private
   */
  _getMaxDamageDice() {
    const spell = this.spell;
    if (!spell) return 0;

    // Spell-specific max or actor's casting max
    const spellMax = spell.system.maxDice || 0;
    const castingMax = this.castingMax;

    // If spell has a specific max, use the lower of spell max and casting max
    if (spellMax > 0) {
      return Math.min(spellMax, castingMax);
    }

    return castingMax;
  }

  /**
   * Get the damage formula for the current config.
   * @returns {string}
   * @private
   */
  _getDamageFormula() {
    const spell = this.spell;
    if (!spell || !spell.system.isDamaging() || this.castConfig.damageDice <= 0) {
      return "";
    }

    const diceBase = spell.system.damageBase || "d6";
    return `${this.castConfig.damageDice}${diceBase}`;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareRollContext(_options) {
    const context = {};

    // Get all known spells for selection
    const knownSpells = this._getKnownSpells();
    context.spells = knownSpells.map((s) => ({
      id: s.id,
      name: s.name,
      img: s.img,
      damageType: s.system.damageType,
      isDamaging: s.system.isDamaging(),
      selected: s.id === this.spellId,
    }));

    context.hasSpells = knownSpells.length > 0;
    context.selectedSpellId = this.spellId;
    context.spell = this.spell;

    // Mana info
    context.currentMana = this.currentMana;
    context.maxMana = this.maxMana;
    context.castingMax = this.castingMax;
    context.manaCost = this.manaCost;
    context.canAfford = this.canAfford;

    // Spell-specific data when a spell is selected
    const spell = this.spell;
    if (spell) {
      // Casting skill
      const castingSkill = this._getCastingSkill();
      const skillConfig = CONFIG.VAGABOND?.skills?.[castingSkill];
      const skillData = this.actor.system.skills?.[castingSkill];
      const statKey = skillConfig?.stat || "reason";
      const statValue = this.actor.system.stats?.[statKey]?.value || 0;
      const trained = skillData?.trained || false;

      context.castingSkill = castingSkill;
      context.castingSkillLabel = game.i18n.localize(skillConfig?.label || castingSkill);
      context.statLabel = game.i18n.localize(CONFIG.VAGABOND?.stats?.[statKey] || statKey);
      context.statValue = statValue;
      context.trained = trained;
      context.difficulty = trained ? 20 - statValue * 2 : 20 - statValue;

      // Calculate base and effective crit threshold
      const baseCritThreshold = skillData?.critThreshold || 20;
      const effectiveCritThreshold = Math.clamp(
        baseCritThreshold + this.critThresholdModifier,
        1,
        20
      );
      context.baseCritThreshold = baseCritThreshold;
      context.effectiveCritThreshold = effectiveCritThreshold;
      context.critThresholdModifier = this.critThresholdModifier;

      // Damage configuration
      context.isDamaging = spell.system.isDamaging();
      context.damageDice = this.castConfig.damageDice;
      context.maxDamageDice = this._getMaxDamageDice();
      context.damageBase = spell.system.damageBase || "d6";
      context.damageType = spell.system.damageType;
      context.damageTypeLabel = game.i18n.localize(
        CONFIG.VAGABOND?.damageTypes?.[spell.system.damageType] || spell.system.damageType
      );
      context.damageFormula = this._getDamageFormula();

      // Delivery options (filtered to valid types)
      const validDelivery = spell.system.getValidDeliveryTypes();
      context.deliveryOptions = validDelivery.map((type) => {
        const config = CONFIG.VAGABOND?.spellDelivery?.[type] || {};
        return {
          value: type,
          label: game.i18n.localize(config.label || type),
          cost: config.cost || 0,
          selected: type === this.castConfig.delivery,
        };
      });

      // Duration options (filtered to valid types)
      const validDuration = spell.system.getValidDurationTypes();
      context.durationOptions = validDuration.map((type) => {
        const config = CONFIG.VAGABOND?.spellDuration?.[type] || {};
        return {
          value: type,
          label: game.i18n.localize(config.label || type),
          isFocus: config.focus || false,
          selected: type === this.castConfig.duration,
        };
      });

      // Current cast config
      context.delivery = this.castConfig.delivery;
      context.duration = this.castConfig.duration;

      // Effect description
      context.effect = spell.system.effect;
      context.critEffect = spell.system.critEffect;
      context.hasEffect = Boolean(spell.system.effect && spell.system.effect.trim());
      context.includeEffect = this.castConfig.includeEffect;

      // Focus warning if actor is already focusing
      const currentFocus = this.actor.system.focus?.active || [];
      context.isCurrentlyFocusing = currentFocus.length > 0;
      context.focusedSpells = currentFocus.map((f) => f.spellName);
      context.maxConcurrentFocus = this.actor.system.focus?.maxConcurrent || 1;
      context.canAddFocus = currentFocus.length < context.maxConcurrentFocus;
      context.willRequireFocus = this.castConfig.duration === "focus";
    }

    return context;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    super._onRender(context, options);

    // Spell selection dropdown
    const spellSelect = this.element.querySelector('[name="spellId"]');
    spellSelect?.addEventListener("change", (event) => {
      this.spellId = event.target.value;
      this._initializeCastConfig();
      this.critThresholdModifier = 0; // Reset crit modifier when changing spell
      this.render();
    });

    // Damage dice input/slider
    const damageDiceInput = this.element.querySelector('[name="damageDice"]');
    damageDiceInput?.addEventListener("input", (event) => {
      this.castConfig.damageDice = parseInt(event.target.value, 10) || 0;
      this.render();
    });

    // Delivery type dropdown
    const deliverySelect = this.element.querySelector('[name="delivery"]');
    deliverySelect?.addEventListener("change", (event) => {
      this.castConfig.delivery = event.target.value;
      this.render();
    });

    // Duration type dropdown
    const durationSelect = this.element.querySelector('[name="duration"]');
    durationSelect?.addEventListener("change", (event) => {
      this.castConfig.duration = event.target.value;
      this.render();
    });

    // Include effect toggle
    const includeEffectToggle = this.element.querySelector('[name="includeEffect"]');
    includeEffectToggle?.addEventListener("change", (event) => {
      this.castConfig.includeEffect = event.target.checked;
      this.render();
    });

    // Crit threshold stepper buttons
    const critIncrement = this.element.querySelector('[data-action="crit-increment"]');
    const critDecrement = this.element.querySelector('[data-action="crit-decrement"]');

    critIncrement?.addEventListener("click", () => {
      const castingSkill = this._getCastingSkill();
      const skillData = this.actor.system.skills?.[castingSkill];
      const baseCritThreshold = skillData?.critThreshold || 20;
      const effectiveCritThreshold = Math.clamp(
        baseCritThreshold + this.critThresholdModifier,
        1,
        20
      );
      if (effectiveCritThreshold < 20) {
        this.critThresholdModifier++;
        this.render();
      }
    });

    critDecrement?.addEventListener("click", () => {
      const castingSkill = this._getCastingSkill();
      const skillData = this.actor.system.skills?.[castingSkill];
      const baseCritThreshold = skillData?.critThreshold || 20;
      const effectiveCritThreshold = Math.clamp(
        baseCritThreshold + this.critThresholdModifier,
        1,
        20
      );
      if (effectiveCritThreshold > 1) {
        this.critThresholdModifier--;
        this.render();
      }
    });

    // Note: Favor/hinder toggles and modifier presets are handled by parent class
    // via super._onRender() - no need to add duplicate listeners here
  }

  /** @override */
  async _executeRoll() {
    const spell = this.spell;
    if (!spell) {
      ui.notifications.warn(game.i18n.localize("VAGABOND.SelectSpellFirst"));
      return;
    }

    // Check mana cost
    const manaCost = this.manaCost;
    if (!this.canAfford) {
      ui.notifications.warn(
        game.i18n.format("VAGABOND.InsufficientMana", {
          cost: manaCost,
          current: this.currentMana,
        })
      );
      return;
    }

    // Perform the casting skill check
    const castingSkill = this._getCastingSkill();
    const skillData = this.actor.system.skills?.[castingSkill];
    const skillConfig = CONFIG.VAGABOND?.skills?.[castingSkill];
    const statKey = skillConfig?.stat || "reason";
    const statValue = this.actor.system.stats?.[statKey]?.value || 0;
    const trained = skillData?.trained || false;
    const difficulty = trained ? 20 - statValue * 2 : 20 - statValue;

    // Calculate effective crit threshold with modifier
    const baseCritThreshold = skillData?.critThreshold || 20;
    const effectiveCritThreshold = Math.clamp(
      baseCritThreshold + this.critThresholdModifier,
      1,
      20
    );

    const result = await skillCheck(this.actor, castingSkill, {
      difficulty,
      critThreshold: effectiveCritThreshold,
      favorHinder: this.netFavorHinder,
      modifier: this.rollConfig.modifier,
    });

    // Damage is rolled separately via button click (like attacks)
    // Just pass null for damageResult - the button will handle it

    // Spend mana (regardless of success - mana is spent on attempt)
    await this.actor.update({
      "system.resources.mana.value": Math.max(0, this.currentMana - manaCost),
    });

    // Handle focus duration spells
    if (result.success && this.castConfig.duration === "focus") {
      const currentFocus = this.actor.system.focus?.active || [];
      const maxFocus = this.actor.system.focus?.maxConcurrent || 1;

      if (currentFocus.length < maxFocus) {
        // Add to focus list
        await this.actor.update({
          "system.focus.active": [
            ...currentFocus,
            {
              spellId: spell.id,
              spellName: spell.name,
              target: "", // Could be set via target selection
              manaCostPerRound: 0, // Could be defined per-spell
              requiresSaveCheck: false,
              canBeBroken: true,
            },
          ],
        });
        ui.notifications.info(game.i18n.format("VAGABOND.NowFocusing", { spell: spell.name }));
      } else {
        ui.notifications.warn(game.i18n.localize("VAGABOND.FocusLimitReached"));
      }
    }

    // Send to chat (damage is rolled separately via button click)
    await this._sendToChat(result);
  }

  /**
   * Send the spell cast result to chat.
   *
   * @param {VagabondRollResult} result - The casting skill check result
   * @param {Roll|null} damageResult - The damage roll (if already rolled, e.g., for updates)
   * @returns {Promise<ChatMessage>}
   * @private
   */
  async _sendToChat(result, damageResult = null) {
    const spell = this.spell;
    const castingSkill = this._getCastingSkill();
    const skillConfig = CONFIG.VAGABOND?.skills?.[castingSkill];

    // Prepare template data
    const templateData = {
      actor: this.actor,
      spell: {
        id: spell.id,
        name: spell.name,
        img: spell.img,
        effect: spell.system.effect,
        critEffect: spell.system.critEffect,
        damageType: spell.system.damageType,
        damageTypeLabel: game.i18n.localize(
          CONFIG.VAGABOND?.damageTypes?.[spell.system.damageType] || spell.system.damageType
        ),
        isDamaging: spell.system.isDamaging(),
      },
      castingSkillLabel: game.i18n.localize(skillConfig?.label || castingSkill),
      delivery: this.castConfig.delivery,
      deliveryLabel: game.i18n.localize(
        CONFIG.VAGABOND?.spellDelivery?.[this.castConfig.delivery]?.label ||
          this.castConfig.delivery
      ),
      duration: this.castConfig.duration,
      durationLabel: game.i18n.localize(
        CONFIG.VAGABOND?.spellDuration?.[this.castConfig.duration]?.label ||
          this.castConfig.duration
      ),
      isFocus: this.castConfig.duration === "focus",
      manaCost: this.manaCost,
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
      damageDice: this.castConfig.damageDice,
      // Show damage button if cast succeeded and there's a damage formula to roll
      pendingDamageFormula: this._getDamageFormula(),
      showDamageButton: result.success && !!this._getDamageFormula() && !damageResult,
      // Effect info
      includeEffect: this.castConfig.includeEffect,
      hasEffect: Boolean(spell.system.effect && spell.system.effect.trim()),
    };

    // Render the chat card template
    const content = await renderTemplate(
      "systems/vagabond/templates/chat/spell-cast.hbs",
      templateData
    );

    // Collect all rolls
    const rolls = [result.roll];
    if (damageResult) rolls.push(damageResult);

    // Create the chat message with flags for later damage rolling
    const damageFormula = this._getDamageFormula();
    const chatData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls,
      sound: CONFIG.sounds.dice,
      flags: {
        vagabond: {
          type: "spell-cast",
          actorId: this.actor.id,
          spellId: spell.id,
          spellName: spell.name,
          damageFormula,
          damageType: spell.system.damageType,
          damageTypeLabel: game.i18n.localize(
            CONFIG.VAGABOND?.damageTypes?.[spell.system.damageType] || spell.system.damageType
          ),
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
   * Create and render a spell cast dialog.
   *
   * @param {VagabondActor} actor - The actor casting the spell
   * @param {string} [spellId] - Optional pre-selected spell ID
   * @param {Object} [options] - Additional options
   * @returns {Promise<SpellCastDialog>}
   */
  static async prompt(actor, spellId = null, options = {}) {
    return this.create(actor, { ...options, spellId });
  }

  /**
   * Perform a quick spell cast without showing the dialog.
   * Uses default options for delivery and duration.
   *
   * @param {VagabondActor} actor - The actor casting the spell
   * @param {VagabondItem} spell - The spell to cast
   * @param {Object} [options] - Cast options
   * @returns {Promise<Object>} Cast and damage results
   */
  static async quickCast(actor, spell, options = {}) {
    // Create temporary dialog for calculations
    const tempDialog = new this(actor, { spellId: spell.id });

    // Apply any option overrides
    if (options.damageDice !== undefined) {
      tempDialog.castConfig.damageDice = options.damageDice;
    }
    if (options.delivery) {
      tempDialog.castConfig.delivery = options.delivery;
    }
    if (options.duration) {
      tempDialog.castConfig.duration = options.duration;
    }

    // Check mana
    if (!tempDialog.canAfford) {
      ui.notifications.warn(
        game.i18n.format("VAGABOND.InsufficientMana", {
          cost: tempDialog.manaCost,
          current: tempDialog.currentMana,
        })
      );
      return null;
    }

    // Get automatic favor/hinder
    const castingSkill = tempDialog._getCastingSkill();
    const autoFavorHinder = actor.getNetFavorHinder({ skillId: castingSkill });

    // Perform the skill check
    const result = await skillCheck(actor, castingSkill, {
      favorHinder: options.favorHinder ?? autoFavorHinder.net,
      modifier: options.modifier || 0,
    });

    // Roll damage if applicable
    let damageResult = null;
    if (result.success && spell.system.isDamaging() && tempDialog.castConfig.damageDice > 0) {
      const damageFormula = tempDialog._getDamageFormula();
      damageResult = await damageRoll(damageFormula, {
        isCrit: result.isCrit,
        rollData: actor.getRollData(),
      });
    }

    // Spend mana
    await actor.update({
      "system.resources.mana.value": Math.max(0, tempDialog.currentMana - tempDialog.manaCost),
    });

    // Send to chat
    tempDialog.rollConfig.autoFavorHinder = autoFavorHinder;
    await tempDialog._sendToChat(result, damageResult);

    return { cast: result, damage: damageResult };
  }
}
