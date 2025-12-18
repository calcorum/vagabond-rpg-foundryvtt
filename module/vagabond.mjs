/**
 * Vagabond RPG System for Foundry VTT
 * @module vagabond
 */

/* global Actors, Items, AudioHelper */

// Import configuration
import { VAGABOND } from "./helpers/config.mjs";

// Import data models
import { CharacterData, NPCData } from "./data/actor/_module.mjs";
import {
  AncestryData,
  ClassData,
  SpellData,
  PerkData,
  WeaponData,
  ArmorData,
  EquipmentData,
  FeatureData,
  StatusData,
} from "./data/item/_module.mjs";

// Import document classes
import { VagabondActor, VagabondItem } from "./documents/_module.mjs";

// Import application classes
import {
  VagabondRollDialog,
  SkillCheckDialog,
  AttackRollDialog,
  SaveRollDialog,
  SpellCastDialog,
  FavorHinderDebug,
} from "./applications/_module.mjs";

// Import sheet classes
import {
  VagabondActorSheet,
  VagabondCharacterSheet,
  VagabondNPCSheet,
  VagabondItemSheet,
} from "./sheets/_module.mjs";

// Import test registration (for Quench)
import { registerQuenchTests } from "./tests/quench-init.mjs";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/**
 * Preload Handlebars templates.
 * @returns {Promise}
 */
async function preloadHandlebarsTemplates() {
  const templatePaths = [
    // Character sheet parts
    "systems/vagabond/templates/actor/character-header.hbs",
    "systems/vagabond/templates/actor/character-main.hbs",
    "systems/vagabond/templates/actor/character-inventory.hbs",
    "systems/vagabond/templates/actor/character-abilities.hbs",
    "systems/vagabond/templates/actor/character-magic.hbs",
    "systems/vagabond/templates/actor/character-biography.hbs",
    "systems/vagabond/templates/actor/parts/tabs.hbs",
    "systems/vagabond/templates/actor/parts/status-bar.hbs",
    // NPC sheet parts
    "systems/vagabond/templates/actor/npc-header.hbs",
    "systems/vagabond/templates/actor/npc-body.hbs",
    "systems/vagabond/templates/actor/npc-stats.hbs",
    "systems/vagabond/templates/actor/npc-actions.hbs",
    "systems/vagabond/templates/actor/npc-abilities.hbs",
    "systems/vagabond/templates/actor/npc-notes.hbs",
    // Item sheet parts
    "systems/vagabond/templates/item/parts/item-header.hbs",
    "systems/vagabond/templates/item/parts/item-tabs.hbs",
    "systems/vagabond/templates/item/parts/item-body.hbs",
    "systems/vagabond/templates/item/parts/item-effects.hbs",
    // Item type templates
    "systems/vagabond/templates/item/types/weapon.hbs",
    "systems/vagabond/templates/item/types/armor.hbs",
    "systems/vagabond/templates/item/types/equipment.hbs",
    "systems/vagabond/templates/item/types/ancestry.hbs",
    "systems/vagabond/templates/item/types/class.hbs",
    "systems/vagabond/templates/item/types/spell.hbs",
    "systems/vagabond/templates/item/types/perk.hbs",
    "systems/vagabond/templates/item/types/feature.hbs",
    "systems/vagabond/templates/item/types/status.hbs",
  ];

  return loadTemplates(templatePaths);
}

/**
 * Init hook - runs once when Foundry initializes
 */
Hooks.once("init", async () => {
  // eslint-disable-next-line no-console
  console.log("Vagabond RPG | Initializing Vagabond RPG System");

  // Add custom constants for configuration
  CONFIG.VAGABOND = VAGABOND;

  // Expose application classes globally for macro/API access
  game.vagabond = {
    applications: {
      VagabondRollDialog,
      SkillCheckDialog,
      AttackRollDialog,
      SaveRollDialog,
      SpellCastDialog,
      FavorHinderDebug,
    },
    sheets: {
      VagabondActorSheet,
      VagabondCharacterSheet,
      VagabondNPCSheet,
      VagabondItemSheet,
    },
  };

  // Register Actor data models
  CONFIG.Actor.dataModels = {
    character: CharacterData,
    npc: NPCData,
  };

  // Register Item data models
  CONFIG.Item.dataModels = {
    ancestry: AncestryData,
    class: ClassData,
    spell: SpellData,
    perk: PerkData,
    weapon: WeaponData,
    armor: ArmorData,
    equipment: EquipmentData,
    feature: FeatureData,
    status: StatusData,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = VagabondActor;
  CONFIG.Item.documentClass = VagabondItem;

  // Register Actor sheet classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("vagabond", VagabondCharacterSheet, {
    types: ["character"],
    makeDefault: true,
    label: "VAGABOND.SheetCharacter",
  });
  Actors.registerSheet("vagabond", VagabondNPCSheet, {
    types: ["npc"],
    makeDefault: true,
    label: "VAGABOND.SheetNPC",
  });

  // Register Item sheet classes
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("vagabond", VagabondItemSheet, {
    makeDefault: true,
    label: "VAGABOND.SheetItem",
  });

  // Preload Handlebars templates
  await preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

/**
 * Ready hook - runs when Foundry is fully loaded
 */
Hooks.once("ready", async () => {
  // eslint-disable-next-line no-console
  console.log("Vagabond RPG | System Ready");

  // Display welcome message for GMs
  if (game.user.isGM) {
    const version = game.system.version;
    ui.notifications.info(`Vagabond RPG v${version} - System loaded successfully!`);

    // Create development macros if they don't exist
    await _createDevMacros();
  }
});

/**
 * Create development/debug macros if they don't already exist.
 * @private
 */
async function _createDevMacros() {
  // Favor/Hinder Debug macro
  const debugMacroName = "Favor/Hinder Debug";
  const existingMacro = game.macros.find((m) => m.name === debugMacroName);

  if (!existingMacro) {
    await Macro.create({
      name: debugMacroName,
      type: "script",
      img: "icons/svg/bug.svg",
      command: "game.vagabond.applications.FavorHinderDebug.open();",
      flags: { vagabond: { systemMacro: true } },
    });
    // eslint-disable-next-line no-console
    console.log("Vagabond RPG | Created Favor/Hinder Debug macro");
  }

  // Skill Check macro
  const skillMacroName = "Skill Check";
  const existingSkillMacro = game.macros.find((m) => m.name === skillMacroName);

  if (!existingSkillMacro) {
    await Macro.create({
      name: skillMacroName,
      type: "script",
      img: "icons/svg/d20.svg",
      command: `// Opens skill check dialog for selected token or prompts to select actor
const actor = canvas.tokens.controlled[0]?.actor
  || game.actors.find(a => a.type === "character");

if (!actor) {
  ui.notifications.warn("Select a token or create a character first");
} else {
  game.vagabond.applications.SkillCheckDialog.prompt(actor);
}`,
      flags: { vagabond: { systemMacro: true } },
    });
    // eslint-disable-next-line no-console
    console.log("Vagabond RPG | Created Skill Check macro");
  }

  // Attack Roll macro
  const attackMacroName = "Attack Roll";
  const existingAttackMacro = game.macros.find((m) => m.name === attackMacroName);

  if (!existingAttackMacro) {
    await Macro.create({
      name: attackMacroName,
      type: "script",
      img: "icons/svg/sword.svg",
      command: `// Opens attack roll dialog for selected token
const actor = canvas.tokens.controlled[0]?.actor
  || game.actors.find(a => a.type === "character");

if (!actor) {
  ui.notifications.warn("Select a token or create a character first");
} else {
  game.vagabond.applications.AttackRollDialog.prompt(actor);
}`,
      flags: { vagabond: { systemMacro: true } },
    });
    // eslint-disable-next-line no-console
    console.log("Vagabond RPG | Created Attack Roll macro");
  }

  // Save Roll macro
  const saveMacroName = "Save Roll";
  const existingSaveMacro = game.macros.find((m) => m.name === saveMacroName);

  if (!existingSaveMacro) {
    await Macro.create({
      name: saveMacroName,
      type: "script",
      img: "icons/svg/shield.svg",
      command: `// Opens save roll dialog for selected token
const actor = canvas.tokens.controlled[0]?.actor
  || game.actors.find(a => a.type === "character");

if (!actor) {
  ui.notifications.warn("Select a token or create a character first");
} else {
  game.vagabond.applications.SaveRollDialog.prompt(actor);
}`,
      flags: { vagabond: { systemMacro: true } },
    });
    // eslint-disable-next-line no-console
    console.log("Vagabond RPG | Created Save Roll macro");
  }

  // Cast Spell macro
  const castMacroName = "Cast Spell";
  const existingCastMacro = game.macros.find((m) => m.name === castMacroName);

  if (!existingCastMacro) {
    await Macro.create({
      name: castMacroName,
      type: "script",
      img: "icons/svg/lightning.svg",
      command: `// Opens spell cast dialog for selected token
const actor = canvas.tokens.controlled[0]?.actor
  || game.actors.find(a => a.type === "character");

if (!actor) {
  ui.notifications.warn("Select a token or create a character first");
} else {
  game.vagabond.applications.SpellCastDialog.prompt(actor);
}`,
      flags: { vagabond: { systemMacro: true } },
    });
    // eslint-disable-next-line no-console
    console.log("Vagabond RPG | Created Cast Spell macro");
  }

  // Morale Check macro
  const moraleMacroName = "Morale Check";
  const existingMoraleMacro = game.macros.find((m) => m.name === moraleMacroName);

  if (!existingMoraleMacro) {
    await Macro.create({
      name: moraleMacroName,
      type: "script",
      img: "icons/svg/skull.svg",
      command: `// Roll morale for selected NPC tokens
// Uses lowest morale score if multiple NPCs selected (group check)
const VagabondActor = CONFIG.Actor.documentClass;
VagabondActor.rollGroupMorale({ trigger: "manual" });`,
      flags: { vagabond: { systemMacro: true } },
    });
    // eslint-disable-next-line no-console
    console.log("Vagabond RPG | Created Morale Check macro");
  }
}

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

/**
 * Define Handlebars helpers used throughout the system
 */
Hooks.once("init", () => {
  // Multiply helper for formulas
  Handlebars.registerHelper("multiply", (a, b) => Number(a) * Number(b));

  // Subtract helper
  Handlebars.registerHelper("subtract", (a, b) => Number(a) - Number(b));

  // Calculate difficulty (20 - stat or 20 - stat*2 if trained)
  Handlebars.registerHelper("difficulty", (stat, trained) => {
    const statValue = Number(stat) || 0;
    return trained ? 20 - statValue * 2 : 20 - statValue;
  });

  // Check if value equals comparison
  Handlebars.registerHelper("eq", (a, b) => a === b);

  // Check if value is greater than
  Handlebars.registerHelper("gt", (a, b) => Number(a) > Number(b));

  // Check if value is less than
  Handlebars.registerHelper("lt", (a, b) => Number(a) < Number(b));

  // Concatenate strings
  Handlebars.registerHelper("concat", (...args) => {
    // Remove the Handlebars options object from args
    args.pop();
    return args.join("");
  });

  // Capitalize first letter
  Handlebars.registerHelper("capitalize", (str) => {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Format number with sign (+/-)
  Handlebars.registerHelper("signedNumber", (num) => {
    const n = Number(num) || 0;
    return n >= 0 ? `+${n}` : `${n}`;
  });

  // Join array elements with separator
  Handlebars.registerHelper("join", (arr, separator) => {
    if (!Array.isArray(arr)) return "";
    return arr.join(separator);
  });
});

/* -------------------------------------------- */
/*  Class Feature Automation                    */
/* -------------------------------------------- */

/**
 * Class feature application is handled by VagabondItem._onCreate
 * which runs as part of the document creation flow.
 *
 * Class effect cleanup is handled by VagabondItem._preDelete
 * which runs before the document is deleted.
 */

/**
 * When a character's level changes, update class features.
 * This must be a Hook since level changes don't go through Item lifecycle.
 */
Hooks.on("updateActor", async (actor, changed, _options, userId) => {
  // Only process for the updating user
  if (game.user.id !== userId) return;

  // Only process character level changes
  if (actor.type !== "character") return;
  if (!foundry.utils.hasProperty(changed, "system.level")) return;

  const newLevel = changed.system.level;
  const oldLevel = actor._source.system.level; // Get previous value from source

  if (newLevel === oldLevel) return;

  // Update features for each class
  const classes = actor.items.filter((i) => i.type === "class");
  for (const classItem of classes) {
    await classItem.updateClassFeatures(newLevel, oldLevel);
  }
});

/* -------------------------------------------- */
/*  NPC Morale System                           */
/* -------------------------------------------- */

/**
 * When an NPC's HP drops to half or below, prompt a morale check.
 * Only triggers once per combat (until morale status is reset).
 */
Hooks.on("updateActor", async (actor, changed, options, userId) => {
  // Only process for the updating user (GM typically)
  if (game.user.id !== userId) return;

  // Only process NPC HP changes
  if (actor.type !== "npc") return;
  if (!foundry.utils.hasProperty(changed, "system.hp.value")) return;

  // Skip if already broken or already prompted this combat
  const moraleStatus = actor.system.moraleStatus;
  if (moraleStatus?.broken || moraleStatus?.checkedThisCombat) return;

  // Check if HP dropped to half or below
  const newHP = changed.system.hp.value;
  const maxHP = actor.system.hp.max;
  const halfHP = Math.floor(maxHP / 2);

  // Only trigger if crossing the half-HP threshold
  // (options._previousHP is set by _preUpdate if we had it, but we'll use current logic)
  if (newHP <= halfHP && newHP > 0) {
    // Prompt the GM with a morale check button
    await actor.promptMoraleCheck("half-hp");
  }
});

/**
 * Handle clicks on morale roll buttons in chat messages.
 * The button is created by VagabondActor.promptMoraleCheck().
 */
Hooks.on("renderChatMessage", (message, html) => {
  // Find morale roll buttons in this message
  html.find(".morale-roll-btn").on("click", async (event) => {
    event.preventDefault();

    const button = event.currentTarget;
    const actorId = button.dataset.actorId;
    const trigger = button.dataset.trigger;

    // Get the actor
    const actor = game.actors.get(actorId);
    if (!actor) {
      ui.notifications.error("Could not find actor for morale check");
      return;
    }

    // Roll morale
    await actor.rollMorale({ trigger });

    // Disable the button after rolling
    button.disabled = true;
    button.textContent = "Morale Checked";
  });
});

/* -------------------------------------------- */
/*  Attack Damage Roll Handling                 */
/* -------------------------------------------- */

/**
 * Handle clicks on "Roll Damage" buttons in attack chat cards.
 * Rolls damage using the stored weapon data and updates the message.
 */
Hooks.on("renderChatMessage", (message, html) => {
  // Find damage roll buttons in this message
  html.find(".roll-damage-btn").on("click", async (event) => {
    event.preventDefault();

    const button = event.currentTarget;
    const flags = message.flags?.vagabond;

    // Verify this is an attack roll message with pending damage
    if (!flags || flags.type !== "attack-roll" || flags.damageRolled) {
      ui.notifications.warn("Cannot roll damage for this message");
      return;
    }

    // Disable button immediately to prevent double-clicks
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rolling...';

    try {
      // Get the actor for roll data
      const actor = game.actors.get(flags.actorId);
      if (!actor) {
        ui.notifications.error("Could not find actor for damage roll");
        return;
      }

      // Import damageRoll function
      const { damageRoll } = await import("./dice/rolls.mjs");

      // Roll damage
      const roll = await damageRoll(flags.damageFormula, {
        isCrit: flags.isCrit,
        rollData: actor.getRollData(),
      });

      // Extract dice results for display
      const damageDiceResults = [];
      for (const term of roll.terms) {
        if (term instanceof foundry.dice.terms.Die) {
          for (const r of term.results) {
            damageDiceResults.push({
              faces: term.faces,
              result: r.result,
            });
          }
        }
      }

      // Render updated content with damage
      const content = await renderTemplate("systems/vagabond/templates/chat/attack-roll.hbs", {
        // Original attack data from message content
        ...(await _extractAttackDataFromMessage(message)),
        // Damage data
        hasDamage: true,
        damageTotal: roll.total,
        damageFormula: roll.formula,
        damageDiceResults,
        twoHanded: flags.twoHanded,
        isCrit: flags.isCrit,
        showDamageButton: false,
      });

      // Update the message with damage rolled
      await message.update({
        content,
        rolls: [...message.rolls, roll],
        "flags.vagabond.damageRolled": true,
      });

      // Play dice sound
      AudioHelper.play({ src: CONFIG.sounds.dice }, true);
    } catch (error) {
      console.error("Vagabond RPG | Error rolling damage:", error);
      ui.notifications.error("Failed to roll damage");
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-burst"></i> Roll Damage';
    }
  });
});

/**
 * Extract attack data from an existing chat message for re-rendering.
 * @param {ChatMessage} message - The chat message
 * @returns {Promise<Object>} Template data extracted from the message
 * @private
 */
async function _extractAttackDataFromMessage(message) {
  const flags = message.flags?.vagabond || {};
  const content = message.content;

  // Parse values from the message HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");

  // Extract weapon info
  const weaponImg = doc.querySelector(".weapon-icon")?.getAttribute("src") || "";
  const weaponName =
    doc.querySelector(".weapon-name")?.textContent || flags.weaponName || "Unknown";
  const attackLabel = doc.querySelector(".attack-type-badge")?.textContent || "";

  // Extract roll result
  const total = doc.querySelector(".roll-total")?.textContent || "0";
  const status = doc.querySelector(".roll-status .status")?.classList;
  const isCrit = status?.contains("critical") || false;
  const isFumble = status?.contains("fumble") || false;
  const success = status?.contains("success") || status?.contains("critical") || false;

  // Extract formula and breakdown
  const formula = doc.querySelector(".roll-formula .value")?.textContent || "";
  const d20Result = doc.querySelector(".d20-result")?.textContent?.replace(/[^\d]/g, "") || "0";
  const favorDieEl = doc.querySelector(".favor-die");
  const favorDie = favorDieEl?.textContent?.replace(/[^\d-]/g, "") || null;
  const netFavorHinder = favorDieEl?.classList.contains("favor")
    ? 1
    : favorDieEl?.classList.contains("hinder")
      ? -1
      : 0;
  const modifier = doc.querySelector(".modifier")?.textContent?.replace(/[^\d-]/g, "") || null;

  // Extract difficulty info
  const difficulty = doc.querySelector(".difficulty .value")?.textContent || "10";
  const critThreshold =
    doc.querySelector(".crit-threshold .value")?.textContent?.replace(/[^\d]/g, "") || "20";

  // Extract weapon properties
  const propertyTags = doc.querySelectorAll(".weapon-properties .property-tag");
  const properties = Array.from(propertyTags).map((el) => el.textContent);

  // Extract favor/hinder sources
  const favorSourcesEl = doc.querySelector(".favor-sources span");
  const hinderSourcesEl = doc.querySelector(".hinder-sources span");
  const favorSources =
    favorSourcesEl?.textContent
      ?.replace(/^[^:]+:\s*/, "")
      .split(", ")
      .filter(Boolean) || [];
  const hinderSources =
    hinderSourcesEl?.textContent
      ?.replace(/^[^:]+:\s*/, "")
      .split(", ")
      .filter(Boolean) || [];

  return {
    weapon: {
      id: flags.weaponId,
      name: weaponName,
      img: weaponImg,
      damageType: flags.damageType,
      damageTypeLabel: flags.damageTypeLabel,
      properties,
    },
    attackLabel,
    total,
    d20Result,
    favorDie: favorDie ? parseInt(favorDie) : null,
    modifier: modifier ? parseInt(modifier) : null,
    formula,
    difficulty,
    critThreshold,
    success,
    isCrit,
    isFumble,
    netFavorHinder,
    favorSources,
    hinderSources,
  };
}

/* -------------------------------------------- */
/*  Spell Damage Roll Handling                  */
/* -------------------------------------------- */

/**
 * Handle clicks on "Roll Damage" buttons in spell chat cards.
 * Rolls damage using the stored spell data and updates the message.
 */
Hooks.on("renderChatMessage", (message, html) => {
  // Only handle spell-cast messages
  const flags = message.flags?.vagabond;
  if (!flags || flags.type !== "spell-cast") return;

  // Find damage roll buttons in this message
  html.find(".roll-damage-btn").on("click", async (event) => {
    event.preventDefault();

    const button = event.currentTarget;

    // Verify damage hasn't been rolled yet
    if (flags.damageRolled) {
      ui.notifications.warn("Damage has already been rolled for this spell");
      return;
    }

    // Disable button immediately to prevent double-clicks
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Rolling...';

    try {
      // Get the actor for roll data
      const actor = game.actors.get(flags.actorId);
      if (!actor) {
        ui.notifications.error("Could not find actor for damage roll");
        return;
      }

      // Import damageRoll function
      const { damageRoll } = await import("./dice/rolls.mjs");

      // Roll damage
      const roll = await damageRoll(flags.damageFormula, {
        isCrit: flags.isCrit,
        rollData: actor.getRollData(),
      });

      // Render updated content with damage
      const content = await renderTemplate("systems/vagabond/templates/chat/spell-cast.hbs", {
        // Original spell data from message content
        ...(await _extractSpellDataFromMessage(message)),
        // Damage data
        hasDamage: true,
        damageTotal: roll.total,
        damageFormula: roll.formula,
        isCrit: flags.isCrit,
        showDamageButton: false,
      });

      // Update the message with damage rolled
      await message.update({
        content,
        rolls: [...message.rolls, roll],
        "flags.vagabond.damageRolled": true,
      });

      // Play dice sound
      AudioHelper.play({ src: CONFIG.sounds.dice }, true);
    } catch (error) {
      console.error("Vagabond RPG | Error rolling spell damage:", error);
      ui.notifications.error("Failed to roll damage");
      button.disabled = false;
      button.innerHTML = '<i class="fa-solid fa-burst"></i> Roll Damage';
    }
  });
});

/**
 * Extract spell data from an existing chat message for re-rendering.
 * @param {ChatMessage} message - The chat message
 * @returns {Promise<Object>} Template data extracted from the message
 * @private
 */
async function _extractSpellDataFromMessage(message) {
  const flags = message.flags?.vagabond || {};
  const content = message.content;

  // Parse values from the message HTML
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, "text/html");

  // Extract spell info
  const spellImg = doc.querySelector(".spell-icon")?.getAttribute("src") || "";
  const spellName = doc.querySelector(".spell-name")?.textContent || flags.spellName || "Unknown";
  const castingSkillLabel = doc.querySelector(".casting-skill-badge")?.textContent || "";

  // Extract cast config
  const deliveryLabel =
    doc.querySelector(".config-item.delivery .value")?.textContent?.trim() || "";
  const durationLabel =
    doc.querySelector(".config-item.duration .value")?.textContent?.trim() || "";
  const manaCost = doc.querySelector(".config-item.mana-cost .value")?.textContent?.trim() || "0";

  // Extract roll result
  const total = doc.querySelector(".roll-total")?.textContent || "0";
  const status = doc.querySelector(".roll-status .status")?.classList;
  const isCrit = status?.contains("critical") || false;
  const isFumble = status?.contains("fumble") || false;
  const success = status?.contains("success") || status?.contains("critical") || false;

  // Extract formula and breakdown
  const formula = doc.querySelector(".roll-formula .value")?.textContent || "";
  const d20Result = doc.querySelector(".d20-result")?.textContent?.replace(/[^\d]/g, "") || "0";
  const favorDieEl = doc.querySelector(".favor-die");
  const favorDie = favorDieEl?.textContent?.replace(/[^\d-]/g, "") || null;
  const netFavorHinder = favorDieEl?.classList.contains("favor")
    ? 1
    : favorDieEl?.classList.contains("hinder")
      ? -1
      : 0;
  const modifier = doc.querySelector(".modifier")?.textContent?.replace(/[^\d-]/g, "") || null;

  // Extract difficulty info
  const difficulty = doc.querySelector(".difficulty .value")?.textContent || "10";
  const critThreshold =
    doc.querySelector(".crit-threshold .value")?.textContent?.replace(/[^\d]/g, "") || "20";

  // Extract spell effect
  const effectText = doc.querySelector(".spell-effect-section .effect-text")?.innerHTML || "";
  const critEffectText = doc.querySelector(".spell-effect-section .crit-text")?.innerHTML || "";
  const hasEffect = !!effectText;
  const includeEffect = hasEffect;

  // Extract focus indicator
  const isFocus = !!doc.querySelector(".focus-indicator");

  // Extract favor/hinder sources
  const favorSourcesEl = doc.querySelector(".favor-sources span");
  const hinderSourcesEl = doc.querySelector(".hinder-sources span");
  const favorSources =
    favorSourcesEl?.textContent
      ?.replace(/^[^:]+:\s*/, "")
      .split(", ")
      .filter(Boolean) || [];
  const hinderSources =
    hinderSourcesEl?.textContent
      ?.replace(/^[^:]+:\s*/, "")
      .split(", ")
      .filter(Boolean) || [];

  return {
    spell: {
      id: flags.spellId,
      name: spellName,
      img: spellImg,
      damageType: flags.damageType,
      damageTypeLabel: flags.damageTypeLabel,
      effect: effectText,
      critEffect: critEffectText,
      isDamaging: !!flags.damageFormula,
    },
    castingSkillLabel,
    deliveryLabel,
    durationLabel,
    isFocus,
    manaCost,
    total,
    d20Result,
    favorDie: favorDie ? parseInt(favorDie) : null,
    modifier: modifier ? parseInt(modifier) : null,
    formula,
    difficulty,
    critThreshold,
    success,
    isCrit,
    isFumble,
    netFavorHinder,
    favorSources,
    hinderSources,
    hasEffect,
    includeEffect,
  };
}

/* -------------------------------------------- */
/*  Quench Test Registration                    */
/* -------------------------------------------- */

/**
 * Register tests with the Quench testing framework if available.
 * Quench provides in-Foundry testing using Mocha + Chai.
 * @see https://github.com/Ethaks/FVTT-Quench
 */
Hooks.once("quenchReady", (quenchRunner) => {
  registerQuenchTests(quenchRunner);
});

/* -------------------------------------------- */
/*  Hot Reload Support (Development)            */
/* -------------------------------------------- */

if (import.meta.hot) {
  import.meta.hot.accept((_newModule) => {
    // eslint-disable-next-line no-console
    console.log("Vagabond RPG | Hot reload triggered");
  });
}
