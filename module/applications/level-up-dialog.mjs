/**
 * Level Up Dialog for Vagabond RPG
 *
 * Displays features gained when leveling up and handles choices:
 * - Shows automatic features with Active Effects
 * - Presents Perk selection when "Perk" appears in progression
 * - Handles choice features (e.g., Fighting Style)
 *
 * Uses Foundry VTT v13 ApplicationV2 API.
 *
 * @extends ApplicationV2
 * @mixes HandlebarsApplicationMixin
 */

// Debug logging for level-up workflow - set to false to disable
const DEBUG_LEVELUP = false;
const debugLog = (...args) => {
  if (DEBUG_LEVELUP) console.log("[LevelUpDialog]", ...args);
};
const debugWarn = (...args) => {
  if (DEBUG_LEVELUP) console.warn("[LevelUpDialog]", ...args);
};

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export default class LevelUpDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  /**
   * @param {VagabondActor} actor - The actor leveling up
   * @param {number} newLevel - The new level
   * @param {number} oldLevel - The previous level
   * @param {Object} options - Dialog options
   */
  constructor(actor, newLevel, oldLevel, options = {}) {
    super(options);
    this.actor = actor;
    this.newLevel = newLevel;
    this.oldLevel = oldLevel;

    // Collected choices (perk selections, etc.)
    this.choices = {
      perks: [],
      featureChoices: {},
    };

    debugLog(`Constructor called`, {
      actorName: actor.name,
      oldLevel,
      newLevel,
    });
  }

  /* -------------------------------------------- */
  /*  Static Properties                           */
  /* -------------------------------------------- */

  /** @override */
  static DEFAULT_OPTIONS = {
    id: "vagabond-level-up-dialog",
    classes: ["vagabond", "level-up-dialog", "themed"],
    tag: "form",
    window: {
      title: "VAGABOND.LevelUp",
      icon: "fa-solid fa-arrow-up",
      resizable: false,
    },
    position: {
      width: 500,
      height: "auto",
    },
    form: {
      handler: LevelUpDialog.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: true,
    },
  };

  /** @override */
  static PARTS = {
    form: {
      template: "systems/vagabond/templates/dialog/level-up.hbs",
    },
  };

  /* -------------------------------------------- */
  /*  Getters                                     */
  /* -------------------------------------------- */

  /**
   * Get the title for this dialog.
   * @returns {string}
   */
  get title() {
    return `${this.actor.name} - Level ${this.newLevel}`;
  }

  /* -------------------------------------------- */
  /*  Data Preparation                            */
  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    debugLog("_prepareContext called");
    const context = await super._prepareContext(options);

    context.actor = this.actor;
    context.newLevel = this.newLevel;
    context.oldLevel = this.oldLevel;

    // Get all class items
    const classes = this.actor.items.filter((i) => i.type === "class");
    debugLog(
      `Found ${classes.length} class(es):`,
      classes.map((c) => c.name)
    );

    // Gather features from all classes
    const allFeatures = [];
    const perkSlots = [];
    const choiceFeatures = [];

    for (const classItem of classes) {
      const features = classItem.system.features || [];
      const progression = classItem.system.progression || [];

      debugLog(`Processing class "${classItem.name}"`, {
        featuresCount: features.length,
        progressionLevels: progression.map((p) => p.level),
      });

      // Get progression data for the new level
      const levelProgression = progression.find((p) => p.level === this.newLevel);
      debugLog(`Level ${this.newLevel} progression:`, levelProgression);

      // Check for "Perk" in progression
      if (levelProgression?.features?.includes("Perk")) {
        debugLog(`Perk slot found at level ${this.newLevel}`);
        perkSlots.push({
          className: classItem.name,
          classId: classItem.id,
        });
      }

      // Get features gained at this level
      for (const feature of features) {
        if (feature.level > this.oldLevel && feature.level <= this.newLevel) {
          debugLog(`Feature gained: "${feature.name}" (level ${feature.level})`, {
            hasChanges: feature.changes?.length > 0,
            requiresChoice: feature.requiresChoice,
          });

          const featureData = {
            ...feature,
            className: classItem.name,
            classId: classItem.id,
            hasChanges: feature.changes?.length > 0,
          };

          // Check if this feature requires a choice
          if (feature.requiresChoice) {
            choiceFeatures.push(featureData);
          } else {
            allFeatures.push(featureData);
          }
        }
      }
    }

    context.features = allFeatures;
    context.perkSlots = perkSlots;
    context.choiceFeatures = choiceFeatures;
    context.hasPerks = perkSlots.length > 0;
    context.hasChoices = choiceFeatures.length > 0;

    debugLog("Context prepared", {
      featuresCount: allFeatures.length,
      features: allFeatures.map((f) => f.name),
      perkSlotsCount: perkSlots.length,
      choiceFeaturesCount: choiceFeatures.length,
      choiceFeatures: choiceFeatures.map((f) => f.name),
    });

    // Get available perks for selection
    if (perkSlots.length > 0) {
      debugLog("Loading available perks...");
      context.availablePerks = await this._getAvailablePerks();
      debugLog(`Loaded ${context.availablePerks?.length || 0} available perks`);
    }

    // Load filtered perks for each choice feature
    for (const choiceFeature of choiceFeatures) {
      if (choiceFeature.choiceType === "perk" && choiceFeature.choiceFilter) {
        debugLog(`Loading filtered perks for "${choiceFeature.name}"...`);
        // Fighting Style ignores all prerequisites per the feature rules
        const ignorePrereqs = choiceFeature.name === "Fighting Style";
        choiceFeature.filteredPerks = await this._getFilteredPerksForChoice(
          choiceFeature.choiceFilter,
          ignorePrereqs
        );
        debugLog(
          `Loaded ${choiceFeature.filteredPerks?.length || 0} filtered perks for "${choiceFeature.name}"`,
          choiceFeature.filteredPerks?.map((p) => ({ name: p.name, uuid: p.uuid, id: p.id }))
        );
      }
    }

    return context;
  }

  /**
   * Get perks available for selection (from compendium, filtered by prerequisites).
   *
   * @returns {Promise<Object[]>} Available perk data
   * @private
   */
  async _getAvailablePerks() {
    // Try to get perks from compendium
    const pack = game.packs.get("vagabond.perks");
    if (!pack) {
      // No compendium, return empty
      return [];
    }

    const index = await pack.getIndex();
    const perks = [];

    for (const entry of index) {
      const perk = await pack.getDocument(entry._id);
      if (!perk) continue;

      // Check prerequisites
      const prereqResult = perk.checkPrerequisites?.(this.actor);
      const met = prereqResult?.met ?? true;

      // Check if actor already has this perk
      const alreadyHas = this.actor.items.some((i) => i.type === "perk" && i.name === perk.name);

      if (!alreadyHas) {
        perks.push({
          id: perk.id,
          uuid: perk.uuid,
          name: perk.name,
          description: perk.system.description,
          prerequisites: perk.system.prerequisites || {},
          prerequisitesMet: met,
          missing: prereqResult?.missing || [],
        });
      }
    }

    // Sort: prerequisites met first, then alphabetically
    perks.sort((a, b) => {
      if (a.prerequisitesMet && !b.prerequisitesMet) return -1;
      if (!a.prerequisitesMet && b.prerequisitesMet) return 1;
      return a.name.localeCompare(b.name);
    });

    return perks;
  }

  /**
   * Get perks filtered for a specific choice feature.
   * Filters by the choiceFilter.prerequisite array (matches against perk's custom prerequisite text).
   *
   * @param {Object} choiceFilter - The filter from the feature (e.g., { prerequisite: ["Melee Training", "Ranged Training"] })
   * @param {boolean} ignorePrereqs - If true, mark all filtered perks as available (for features like Fighting Style)
   * @returns {Promise<Object[]>} Filtered perk data
   * @private
   */
  async _getFilteredPerksForChoice(choiceFilter, ignorePrereqs = false) {
    const pack = game.packs.get("vagabond.perks");
    if (!pack) return [];

    const index = await pack.getIndex();
    const perks = [];
    const filterValues = choiceFilter?.prerequisite || [];

    debugLog("Filtering perks for choice", { filterValues, ignorePrereqs });

    for (const entry of index) {
      const perk = await pack.getDocument(entry._id);
      if (!perk) continue;

      // Build the UUID from pack and entry info (more reliable than perk.uuid)
      const perkUuid = `Compendium.${pack.collection}.Item.${entry._id}`;

      // Check if perk matches the filter (by custom prerequisite text)
      const customPrereq = perk.system.prerequisites?.custom || "";
      const matchesFilter = filterValues.length === 0 || filterValues.includes(customPrereq);

      if (!matchesFilter) {
        debugLog(`Perk "${perk.name}" filtered out (custom: "${customPrereq}")`);
        continue;
      }

      // Check prerequisites (optionally ignoring all for features like Fighting Style)
      let met = true;
      let missing = [];

      if (ignorePrereqs) {
        // Feature allows ignoring prerequisites - all filtered perks are selectable
        met = true;
        missing = [];
      } else {
        const prereqResult = perk.checkPrerequisites?.(this.actor);
        met = prereqResult?.met ?? true;
        missing = prereqResult?.missing || [];
      }

      // Check if actor already has this perk
      const alreadyHas = this.actor.items.some((i) => i.type === "perk" && i.name === perk.name);

      if (!alreadyHas) {
        perks.push({
          id: entry._id,
          uuid: perkUuid,
          name: perk.name,
          description: perk.system.description,
          prerequisites: perk.system.prerequisites || {},
          prerequisitesMet: met,
          missing,
          customPrereq,
        });
        debugLog(`Perk "${perk.name}" added to choice list (met: ${met}, uuid: ${perkUuid})`);
      }
    }

    // Sort alphabetically (all should be selectable for Fighting Style)
    perks.sort((a, b) => a.name.localeCompare(b.name));

    return perks;
  }

  /* -------------------------------------------- */
  /*  Event Handlers                              */
  /* -------------------------------------------- */

  /** @override */
  _onRender(context, options) {
    debugLog("_onRender called");
    super._onRender(context, options);

    // Apply theme class
    this._applyThemeClass();

    // Handle perk selection changes
    const perkSelects = this.element.querySelectorAll("[data-perk-select]");
    debugLog(`Found ${perkSelects.length} perk select elements`);
    for (const select of perkSelects) {
      select.addEventListener("change", (event) => {
        const slotIndex = parseInt(event.currentTarget.dataset.perkSelect, 10);
        this.choices.perks[slotIndex] = event.currentTarget.value;
        debugLog(`Perk selection changed: slot ${slotIndex} = ${event.currentTarget.value}`);
      });
    }

    // Handle feature choice changes - use 'input' event as well as 'change' for better capture
    const choiceSelects = this.element.querySelectorAll("[data-feature-choice]");
    debugLog(`Found ${choiceSelects.length} feature choice select elements`);
    for (const select of choiceSelects) {
      // Log initial state
      debugLog(`Select initial state for "${select.dataset.featureChoice}":`, {
        value: select.value,
        selectedIndex: select.selectedIndex,
        optionsCount: select.options.length,
      });

      // Track both change and input events
      const handleSelection = (event) => {
        const featureName = event.currentTarget.dataset.featureChoice;
        const newValue = event.currentTarget.value;
        const selectedIndex = event.currentTarget.selectedIndex;
        const selectedText = event.currentTarget.options[selectedIndex]?.textContent;

        this.choices.featureChoices[featureName] = newValue;
        debugLog(
          `Feature choice ${event.type}: "${featureName}" = "${newValue}" (index: ${selectedIndex}, text: "${selectedText}")`
        );
      };

      select.addEventListener("change", handleSelection);
      select.addEventListener("input", handleSelection);

      // Also track focus/blur to see if something is resetting
      select.addEventListener("blur", (event) => {
        debugLog(
          `Select blur for "${event.currentTarget.dataset.featureChoice}": value="${event.currentTarget.value}"`
        );
      });
    }
  }

  /**
   * Apply the configured theme class to the dialog element.
   * @protected
   */
  _applyThemeClass() {
    if (!this.element) return;

    this.element.classList.remove("theme-light", "theme-dark");

    let theme = null;
    try {
      const uiConfig = game.settings.get("core", "uiConfig");
      const colorScheme = uiConfig?.colorScheme?.applications;
      if (colorScheme === "dark") {
        theme = "dark";
      } else if (colorScheme === "light") {
        theme = "light";
      }
    } catch {
      // Settings not available
    }

    if (theme === "dark") {
      this.element.classList.add("theme-dark");
    } else if (theme === "light") {
      this.element.classList.add("theme-light");
    }
  }

  /**
   * Handle form submission (confirm level up).
   * @param {Event} event - The form submission event
   * @param {HTMLFormElement} form - The form element
   * @param {FormDataExtended} formData - The form data
   * @private
   */
  static async #onSubmit(event, form, formData) {
    debugLog("#onSubmit called", {
      formData: formData.object,
    });

    const dialog = this;
    const data = foundry.utils.expandObject(formData.object);
    debugLog("Expanded form data:", data);

    // Also read feature choice selects directly from the form (backup method)
    const featureChoiceSelects = form.querySelectorAll("[data-feature-choice]");
    const directChoices = {};
    let missingRequiredChoice = false;

    for (const select of featureChoiceSelects) {
      const featureName = select.dataset.featureChoice;
      const selectedValue = select.value;
      const selectedIndex = select.selectedIndex;
      const selectedOption = select.options[selectedIndex];

      debugLog(`Direct select read: "${featureName}"`, {
        value: selectedValue,
        selectedIndex,
        selectedOptionText: selectedOption?.textContent,
        optionsCount: select.options.length,
      });

      directChoices[featureName] = selectedValue;

      // Check if this is a required choice with no selection
      if (!selectedValue) {
        missingRequiredChoice = true;
      }
    }

    // Warn if no choice was made
    if (missingRequiredChoice) {
      ui.notifications.warn("Please select a perk for Feature Choices before confirming.");
      return; // Don't proceed with level up
    }

    data.directFeatureChoices = directChoices;

    // Apply the level up
    await dialog._applyLevelUp(data);
  }

  /**
   * Apply the level up, including class features and chosen perks.
   *
   * @param {Object} formData - Form data with choices
   * @returns {Promise<void>}
   * @private
   */
  async _applyLevelUp(formData) {
    // Merge all sources of feature choices (direct DOM read takes priority)
    const featureChoicesFromForm = formData.featureChoice || {};
    const directFeatureChoices = formData.directFeatureChoices || {};
    const mergedFeatureChoices = {
      ...this.choices.featureChoices,
      ...featureChoicesFromForm,
      ...directFeatureChoices, // Direct DOM read is most reliable
    };

    debugLog("_applyLevelUp called", {
      actorName: this.actor.name,
      oldLevel: this.oldLevel,
      newLevel: this.newLevel,
      choices: this.choices,
      featureChoicesFromForm,
      directFeatureChoices,
      mergedFeatureChoices,
    });

    // 1. Update class features for all classes
    const classes = this.actor.items.filter((i) => i.type === "class");
    debugLog(`Updating features for ${classes.length} class(es)`);

    for (const classItem of classes) {
      debugLog(`Calling updateClassFeatures for "${classItem.name}"`);
      const effects = await classItem.updateClassFeatures(this.newLevel, this.oldLevel);
      debugLog(`updateClassFeatures returned ${effects.length} new effects`);
    }

    // 2. Add selected perks
    debugLog(`Processing ${this.choices.perks.length} perk selections:`, this.choices.perks);
    for (const perkUuid of this.choices.perks) {
      if (!perkUuid) {
        debugLog("Skipping empty perk selection");
        continue;
      }

      debugLog(`Adding perk from UUID: ${perkUuid}`);
      try {
        const perkDoc = await fromUuid(perkUuid);
        if (perkDoc) {
          debugLog(`Found perk document: "${perkDoc.name}"`);
          // Create a copy of the perk on the actor
          const created = await this.actor.createEmbeddedDocuments("Item", [perkDoc.toObject()]);
          debugLog(
            `Created perk on actor:`,
            created.map((i) => i.name)
          );
        } else {
          debugWarn(`Perk document not found for UUID: ${perkUuid}`);
        }
      } catch (err) {
        console.error(`Failed to add perk ${perkUuid}:`, err);
      }
    }

    // 3. Handle feature choices (using merged form data + event-tracked choices)
    debugLog(`Processing feature choices:`, mergedFeatureChoices);
    for (const [featureName, choice] of Object.entries(mergedFeatureChoices)) {
      debugLog(`Feature choice for "${featureName}": ${choice}`);

      // Handle Fighting Style specifically
      if (featureName === "Fighting Style") {
        await this._applyFightingStyle(choice);
      } else if (choice) {
        // Generic perk choice handling - add the selected perk
        try {
          const perkDoc = await fromUuid(choice);
          if (perkDoc) {
            debugLog(`Adding choice perk: "${perkDoc.name}"`);
            await this.actor.createEmbeddedDocuments("Item", [perkDoc.toObject()]);
          }
        } catch (err) {
          console.error(`Failed to add choice perk ${choice}:`, err);
        }
      }
    }

    // Log final actor state
    debugLog(
      "Level up complete. Actor effects:",
      this.actor.effects.map((e) => ({
        name: e.name,
        origin: e.origin,
        changes: e.changes,
      }))
    );

    // Notify user
    ui.notifications.info(`${this.actor.name} advanced to level ${this.newLevel}!`);
  }

  /**
   * Apply the Fighting Style feature.
   * Grants Situational Awareness perk AND the selected training perk.
   *
   * @param {string} selectedPerkUuid - UUID of the selected training perk
   * @returns {Promise<void>}
   * @private
   */
  async _applyFightingStyle(selectedPerkUuid) {
    debugLog("Applying Fighting Style feature");

    const pack = game.packs.get("vagabond.perks");
    if (!pack) {
      debugWarn("Perks compendium not found, cannot apply Fighting Style");
      return;
    }

    // 1. Auto-grant Situational Awareness
    const index = await pack.getIndex();
    const saEntry = index.find((e) => e.name === "Situational Awareness");

    if (saEntry) {
      const saPerk = await pack.getDocument(saEntry._id);
      if (saPerk) {
        // Check if actor already has it
        const alreadyHas = this.actor.items.some(
          (i) => i.type === "perk" && i.name === "Situational Awareness"
        );
        if (!alreadyHas) {
          debugLog("Granting Situational Awareness perk");
          await this.actor.createEmbeddedDocuments("Item", [saPerk.toObject()]);
        } else {
          debugLog("Actor already has Situational Awareness");
        }
      }
    } else {
      debugWarn("Situational Awareness perk not found in compendium");
    }

    // 2. Add the selected training perk
    if (selectedPerkUuid) {
      try {
        const perkDoc = await fromUuid(selectedPerkUuid);
        if (perkDoc) {
          debugLog(`Granting selected training perk: "${perkDoc.name}"`);
          await this.actor.createEmbeddedDocuments("Item", [perkDoc.toObject()]);
        }
      } catch (err) {
        console.error(`Failed to add training perk ${selectedPerkUuid}:`, err);
      }
    } else {
      debugWarn("No training perk selected for Fighting Style");
    }
  }

  /* -------------------------------------------- */
  /*  Static Methods                              */
  /* -------------------------------------------- */

  /**
   * Create and render a level up dialog.
   *
   * @param {VagabondActor} actor - The actor leveling up
   * @param {number} newLevel - The new level
   * @param {number} oldLevel - The previous level
   * @param {Object} options - Dialog options
   * @returns {Promise<LevelUpDialog>} The rendered dialog
   */
  static async create(actor, newLevel, oldLevel, options = {}) {
    debugLog(`static create() called`, {
      actorName: actor.name,
      oldLevel,
      newLevel,
    });

    const dialog = new this(actor, newLevel, oldLevel, options);
    debugLog("Rendering dialog...");
    const rendered = await dialog.render(true);
    debugLog("Dialog rendered successfully");
    return rendered;
  }
}
