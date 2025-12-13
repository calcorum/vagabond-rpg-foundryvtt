/**
 * Quench Test Registration
 *
 * This module registers all Vagabond RPG test batches with the Quench testing framework.
 * Tests are organized by domain: actors, items, rolls, effects.
 *
 * @see https://github.com/Ethaks/FVTT-Quench
 */

// Import test modules
import { registerActorTests } from "./actor.test.mjs";
import { registerDiceTests } from "./dice.test.mjs";
// import { registerItemTests } from "./item.test.mjs";
// import { registerEffectTests } from "./effects.test.mjs";

/**
 * Register all Vagabond test batches with Quench
 * Called from the main system init when Quench is available
 * @param {Quench} quenchRunner - The Quench test runner instance
 */
export function registerQuenchTests(quenchRunner) {
  // Register placeholder test batch to verify Quench integration
  quenchRunner.registerBatch(
    "vagabond.sanity",
    (context) => {
      const { describe, it, expect } = context;

      describe("Vagabond System Sanity Checks", () => {
        it("should have CONFIG.VAGABOND defined", () => {
          expect(CONFIG.VAGABOND).to.exist;
        });

        it("should have all six stats configured", () => {
          const stats = CONFIG.VAGABOND.stats;
          expect(stats).to.have.property("might");
          expect(stats).to.have.property("dexterity");
          expect(stats).to.have.property("awareness");
          expect(stats).to.have.property("reason");
          expect(stats).to.have.property("presence");
          expect(stats).to.have.property("luck");
        });

        it("should have all twelve skills configured", () => {
          const skills = CONFIG.VAGABOND.skills;
          expect(Object.keys(skills)).to.have.length(12);
        });

        it("should have spell delivery types configured", () => {
          const delivery = CONFIG.VAGABOND.spellDelivery;
          expect(delivery.touch.cost).to.equal(0);
          expect(delivery.aura.cost).to.equal(2);
          expect(delivery.sphere.cost).to.equal(2);
        });

        it("should calculate correct speed by DEX", () => {
          const speedByDex = CONFIG.VAGABOND.speedByDex;
          expect(speedByDex[2]).to.equal(25);
          expect(speedByDex[4]).to.equal(30);
          expect(speedByDex[6]).to.equal(35);
        });
      });
    },
    { displayName: "Vagabond: Sanity Checks" }
  );

  // Register domain-specific test batches
  registerActorTests(quenchRunner);
  registerDiceTests(quenchRunner);
  // registerItemTests(quenchRunner);
  // registerEffectTests(quenchRunner);

  // eslint-disable-next-line no-console
  console.log("Vagabond RPG | Quench tests registered");
}
