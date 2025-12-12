/**
 * Vagabond RPG System for Foundry VTT
 * @module vagabond
 */

// Import configuration
import { VAGABOND } from "./helpers/config.mjs";

// Import document classes
// import { VagabondActor } from "./documents/actor.mjs";
// import { VagabondItem } from "./documents/item.mjs";

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

  // Define custom Document classes
  // CONFIG.Actor.documentClass = VagabondActor;
  // CONFIG.Item.documentClass = VagabondItem;

  // Register sheet application classes
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

  // Preload Handlebars templates
  // return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

/**
 * Ready hook - runs when Foundry is fully loaded
 */
Hooks.once("ready", () => {
  // eslint-disable-next-line no-console
  console.log("Vagabond RPG | System Ready");

  // Display welcome message for GMs
  if (game.user.isGM) {
    const version = game.system.version;
    ui.notifications.info(`Vagabond RPG v${version} - System loaded successfully!`);
  }
});

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
