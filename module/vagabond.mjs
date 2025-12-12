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

/* -------------------------------------------- */
/*  Foundry VTT Initialization                  */
/* -------------------------------------------- */

/**
 * Init hook - runs once when Foundry initializes
 */
Hooks.once("init", function() {
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
Hooks.once("ready", function() {
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
Hooks.once("init", function() {
  // Multiply helper for formulas
  Handlebars.registerHelper("multiply", function(a, b) {
    return Number(a) * Number(b);
  });

  // Subtract helper
  Handlebars.registerHelper("subtract", function(a, b) {
    return Number(a) - Number(b);
  });

  // Calculate difficulty (20 - stat or 20 - stat*2 if trained)
  Handlebars.registerHelper("difficulty", function(stat, trained) {
    const statValue = Number(stat) || 0;
    return trained ? 20 - (statValue * 2) : 20 - statValue;
  });

  // Check if value equals comparison
  Handlebars.registerHelper("eq", function(a, b) {
    return a === b;
  });

  // Check if value is greater than
  Handlebars.registerHelper("gt", function(a, b) {
    return Number(a) > Number(b);
  });

  // Check if value is less than
  Handlebars.registerHelper("lt", function(a, b) {
    return Number(a) < Number(b);
  });

  // Concatenate strings
  Handlebars.registerHelper("concat", function(...args) {
    // Remove the Handlebars options object from args
    args.pop();
    return args.join("");
  });

  // Capitalize first letter
  Handlebars.registerHelper("capitalize", function(str) {
    if (typeof str !== "string") return "";
    return str.charAt(0).toUpperCase() + str.slice(1);
  });

  // Format number with sign (+/-)
  Handlebars.registerHelper("signedNumber", function(num) {
    const n = Number(num) || 0;
    return n >= 0 ? `+${n}` : `${n}`;
  });
});

/* -------------------------------------------- */
/*  Hot Reload Support (Development)            */
/* -------------------------------------------- */

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    console.log("Vagabond RPG | Hot reload triggered");
  });
}
