/**
 * Vagabond RPG System for Foundry VTT
 * @module vagabond
 */

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
} from "./data/item/_module.mjs";

// Import document classes
import { VagabondActor, VagabondItem } from "./documents/_module.mjs";

// Import application classes
import {
  VagabondRollDialog,
  SkillCheckDialog,
  AttackRollDialog,
  SaveRollDialog,
  FavorHinderDebug,
} from "./applications/_module.mjs";

// Import sheet classes
// import { VagabondCharacterSheet } from "./sheets/actor-sheet.mjs";
// import { VagabondItemSheet } from "./sheets/item-sheet.mjs";

// Import helper functions
// import { preloadHandlebarsTemplates } from "./helpers/templates.mjs";

// Import test registration (for Quench)
import { registerQuenchTests } from "./tests/quench-init.mjs";

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/**
 * Init hook - runs once when Foundry initializes
 */
Hooks.once("init", () => {
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
      FavorHinderDebug,
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
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = VagabondActor;
  CONFIG.Item.documentClass = VagabondItem;

  // Register sheet application classes (TODO: Phase 3-4)
  // Actors.unregisterSheet("core", ActorSheet);
  // Actors.registerSheet("vagabond", VagabondCharacterSheet, {
  //   types: ["character"],
  //   makeDefault: true,
  //   label: "VAGABOND.SheetCharacter"
  // });

  // Items.unregisterSheet("core", ItemSheet);
  // Items.registerSheet("vagabond", VagabondItemSheet, {
  //   makeDefault: true,
  //   label: "VAGABOND.SheetItem"
  // });

  // Preload Handlebars templates (TODO: Phase 3)
  // return preloadHandlebarsTemplates();
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
});

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
