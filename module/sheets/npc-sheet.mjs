/**
 * NPC/Monster Sheet for Vagabond RPG
 *
 * Compact stat block format sheet for NPCs and monsters:
 * - Header with HD, HP, TL, Zone
 * - Combat stats (Armor, Morale, Speed)
 * - Immunities/Weaknesses/Resistances
 * - Actions list with attack buttons
 * - Abilities list
 * - GM notes
 *
 * @extends VagabondActorSheet
 */

import VagabondActorSheet from "./base-actor-sheet.mjs";

export default class VagabondNPCSheet extends VagabondActorSheet {
  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = foundry.utils.mergeObject(
    super.DEFAULT_OPTIONS,
    {
      classes: ["vagabond", "sheet", "actor", "npc"],
      position: {
        width: 520,
        height: 600,
      },
      actions: {
        ...VagabondActorSheet.DEFAULT_OPTIONS.actions,
        rollMorale: VagabondNPCSheet.#onRollMorale,
        rollAction: VagabondNPCSheet.#onRollAction,
        rollAppearing: VagabondNPCSheet.#onRollAppearing,
        addAction: VagabondNPCSheet.#onAddAction,
        deleteAction: VagabondNPCSheet.#onDeleteAction,
        addAbility: VagabondNPCSheet.#onAddAbility,
        deleteAbility: VagabondNPCSheet.#onDeleteAbility,
      },
    },
    { inplace: false }
  );

  /** @override */
  static PARTS = {
    header: {
      template: "systems/vagabond/templates/actor/npc-header.hbs",
    },
    stats: {
      template: "systems/vagabond/templates/actor/npc-stats.hbs",
    },
    actions: {
      template: "systems/vagabond/templates/actor/npc-actions.hbs",
    },
    abilities: {
      template: "systems/vagabond/templates/actor/npc-abilities.hbs",
    },
    notes: {
      template: "systems/vagabond/templates/actor/npc-notes.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /** @override */
  get tabs() {
    // NPC sheets don't use tabs - all content on one page
    return [];
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareTypeContext(context, _options) {
    const system = this.actor.system;

    // Core combat stats
    context.hd = system.hd;
    context.hp = {
      value: system.hp.value,
      max: system.hp.max,
      percent: Math.round((system.hp.value / system.hp.max) * 100) || 0,
      isHalf: system.hp.value <= Math.floor(system.hp.max / 2),
      isDead: system.hp.value <= 0,
    };
    context.tl = system.tl;
    context.armor = system.armor;
    context.morale = system.morale;
    context.moraleStatus = system.moraleStatus;

    // Zone with behavior hint
    context.zone = system.zone;
    context.zoneBehavior = system.getZoneBehavior?.() || "";
    context.zoneOptions = {
      frontline: "VAGABOND.ZoneFrontline",
      midline: "VAGABOND.ZoneMidline",
      backline: "VAGABOND.ZoneBackline",
    };

    // Size and being type
    context.size = system.size;
    context.beingType = system.beingType;
    context.sizeOptions = CONFIG.VAGABOND?.sizes || {};
    context.beingTypeOptions = CONFIG.VAGABOND?.beingTypes || {};

    // Speed (base value only)
    context.speed = system.speed.value;

    // Movement capabilities (boolean toggles)
    context.movement = system.movement;
    context.hasMovement =
      system.movement.climb ||
      system.movement.cling ||
      system.movement.fly ||
      system.movement.phase ||
      system.movement.swim;

    // Senses
    context.senses = system.senses;
    context.hasSenses =
      system.senses.allsight ||
      system.senses.blindsight ||
      system.senses.darkvision ||
      system.senses.echolocation ||
      system.senses.seismicsense ||
      system.senses.telepathy;

    // Damage modifiers
    context.immunities = system.immunities || [];
    context.weaknesses = system.weaknesses || [];
    context.resistances = system.resistances || [];
    context.hasDamageModifiers =
      context.immunities.length > 0 ||
      context.weaknesses.length > 0 ||
      context.resistances.length > 0;

    // Actions with index for editing
    context.actions = (system.actions || []).map((action, index) => ({
      ...action,
      index,
    }));
    context.hasActions = context.actions.length > 0;

    // Abilities with index for editing
    context.abilities = (system.abilities || []).map((ability, index) => ({
      ...ability,
      index,
    }));
    context.hasAbilities = context.abilities.length > 0;

    // Appearing (encounter numbers)
    context.appearing = system.appearing;

    // Loot and GM notes
    context.loot = system.loot;
    context.gmNotes = system.gmNotes;

    // Damage type options for actions
    context.damageTypeOptions = CONFIG.VAGABOND?.damageTypes || {};
    context.attackTypeOptions = {
      melee: "VAGABOND.AttackMelee",
      ranged: "VAGABOND.AttackRanged",
    };
  }

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    // NPC sheets render all parts (no tabs)
    options.parts = ["header", "stats", "actions", "abilities", "notes"];
  }

  /* -------------------------------------------- */
  /*  Action Handlers                             */
  /* -------------------------------------------- */

  /**
   * Handle morale roll.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRollMorale(event, _target) {
    event.preventDefault();
    await this.actor.rollMorale({ trigger: "manual" });
  }

  /**
   * Handle action roll (attack).
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onRollAction(event, target) {
    event.preventDefault();
    const actionIndex = parseInt(target.dataset.actionIndex, 10);
    const action = this.actor.system.actions[actionIndex];
    if (!action) return;

    // Roll the damage for this action
    const roll = await new Roll(action.damage).evaluate();

    // Create chat message
    const content = `
      <div class="vagabond npc-action">
        <h3>${action.name}</h3>
        ${action.description ? `<p class="description">${action.description}</p>` : ""}
        <p class="damage">
          <strong>Damage:</strong> [[/r ${action.damage}]] ${action.damageType}
        </p>
        ${action.range ? `<p class="range"><strong>Range:</strong> ${action.range}</p>` : ""}
      </div>
    `;

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      content,
      rolls: [roll],
      sound: CONFIG.sounds.dice,
    });
  }

  /**
   * Handle appearing roll (# encountered).
   * @param {PointerEvent} event
   * @param {HTMLElement} _target
   */
  static async #onRollAppearing(event, _target) {
    event.preventDefault();
    const appearing = this.actor.system.appearing;
    if (!appearing) {
      ui.notifications.warn("No appearing dice formula set");
      return;
    }

    // Roll the appearing formula
    const roll = await new Roll(appearing).evaluate();

    // Create chat message
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `<strong>${this.actor.name}</strong> - # Appearing`,
    });
  }

  /**
   * Handle adding a new action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddAction(event, _target) {
    event.preventDefault();
    const actions = [...(this.actor.system.actions || [])];
    actions.push({
      name: "New Action",
      description: "",
      attackType: "melee",
      damage: "1d6",
      damageType: "blunt",
      range: "",
      properties: [],
    });
    await this.actor.update({ "system.actions": actions });
  }

  /**
   * Handle deleting an action.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onDeleteAction(event, target) {
    event.preventDefault();
    const actionIndex = parseInt(target.dataset.actionIndex, 10);
    const actions = [...(this.actor.system.actions || [])];
    actions.splice(actionIndex, 1);
    await this.actor.update({ "system.actions": actions });
  }

  /**
   * Handle adding a new ability.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onAddAbility(event, _target) {
    event.preventDefault();
    const abilities = [...(this.actor.system.abilities || [])];
    abilities.push({
      name: "New Ability",
      description: "",
      passive: true,
    });
    await this.actor.update({ "system.abilities": abilities });
  }

  /**
   * Handle deleting an ability.
   * @param {PointerEvent} event
   * @param {HTMLElement} target
   */
  static async #onDeleteAbility(event, target) {
    event.preventDefault();
    const abilityIndex = parseInt(target.dataset.abilityIndex, 10);
    const abilities = [...(this.actor.system.abilities || [])];
    abilities.splice(abilityIndex, 1);
    await this.actor.update({ "system.abilities": abilities });
  }
}
