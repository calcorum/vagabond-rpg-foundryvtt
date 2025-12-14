/**
 * Crit Threshold Modifier System Tests
 *
 * Tests that Active Effects can modify crit thresholds for:
 * - Individual skills (system.skills.<id>.critThreshold)
 * - Attack types (system.attacks.<type>.critThreshold)
 *
 * Use cases:
 * - Fighter's Valor: reduces melee crit threshold by 1/2/3
 * - Gunslinger's Deadeye: reduces ranged crit threshold dynamically
 *
 * @module tests/crit-threshold
 */

import { createCritReductionEffect, EFFECT_MODES } from "../helpers/effects.mjs";

/**
 * Register crit threshold tests with Quench
 * @param {Quench} quenchRunner - The Quench test runner
 */
export function registerCritThresholdTests(quenchRunner) {
  quenchRunner.registerBatch(
    "vagabond.critThreshold.skills",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe("Skill Crit Threshold Modifiers", () => {
        let actor;

        beforeEach(async () => {
          actor = await Actor.create({
            name: "Test Fighter",
            type: "character",
          });
        });

        afterEach(async () => {
          await actor?.delete();
        });

        it("should have default crit threshold of 20 for all skills", () => {
          expect(actor.system.skills.arcana.critThreshold).to.equal(20);
          expect(actor.system.skills.brawl.critThreshold).to.equal(20);
          expect(actor.system.skills.finesse.critThreshold).to.equal(20);
        });

        it("should reduce skill crit threshold with Active Effect", async () => {
          // Create an effect that reduces brawl crit by 2 (like Fighter's Valor at level 4)
          const effectData = createCritReductionEffect("brawl", 2, "Valor (Brawl)");
          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          // Foundry automatically prepares data after embedded document creation
          // Crit threshold should now be 18
          expect(actor.system.skills.brawl.critThreshold).to.equal(18);
          // Other skills should be unaffected
          expect(actor.system.skills.arcana.critThreshold).to.equal(20);
        });

        it("should stack multiple crit reductions on same skill", async () => {
          // Create two effects reducing brawl crit
          const effect1 = createCritReductionEffect("brawl", 1, "Effect 1");
          const effect2 = createCritReductionEffect("brawl", 2, "Effect 2");
          await actor.createEmbeddedDocuments("ActiveEffect", [effect1, effect2]);

          // Total reduction: 1 + 2 = 3, so threshold is 17
          expect(actor.system.skills.brawl.critThreshold).to.equal(17);
        });

        it("should allow different skills to have different thresholds", async () => {
          // Reduce brawl by 2, finesse by 1
          const brawlEffect = createCritReductionEffect("brawl", 2, "Brawl Crit");
          const finesseEffect = createCritReductionEffect("finesse", 1, "Finesse Crit");
          await actor.createEmbeddedDocuments("ActiveEffect", [brawlEffect, finesseEffect]);

          expect(actor.system.skills.brawl.critThreshold).to.equal(18);
          expect(actor.system.skills.finesse.critThreshold).to.equal(19);
          expect(actor.system.skills.arcana.critThreshold).to.equal(20);
        });

        it("should not reduce crit threshold below 1", async () => {
          // Create an absurd reduction
          const effectData = createCritReductionEffect("brawl", 25, "Overpowered");
          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          // Crit threshold should be clamped to minimum of 1
          expect(actor.system.skills.brawl.critThreshold).to.be.at.least(1);
        });

        it("should not affect threshold when effect is disabled", async () => {
          const effectData = createCritReductionEffect("brawl", 2, "Disabled Effect");
          effectData.disabled = true;
          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          // Should remain at default since effect is disabled
          expect(actor.system.skills.brawl.critThreshold).to.equal(20);
        });
      });
    },
    { displayName: "Vagabond: Skill Crit Thresholds" }
  );

  quenchRunner.registerBatch(
    "vagabond.critThreshold.attacks",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe("Attack Crit Threshold Modifiers", () => {
        let actor;

        beforeEach(async () => {
          actor = await Actor.create({
            name: "Test Fighter",
            type: "character",
          });
        });

        afterEach(async () => {
          await actor?.delete();
        });

        it("should have default crit threshold of 20 for all attack types", () => {
          expect(actor.system.attacks.melee.critThreshold).to.equal(20);
          expect(actor.system.attacks.brawl.critThreshold).to.equal(20);
          expect(actor.system.attacks.ranged.critThreshold).to.equal(20);
          expect(actor.system.attacks.finesse.critThreshold).to.equal(20);
        });

        it("should reduce attack crit threshold with Active Effect", async () => {
          // Create effect reducing melee crit by 1 (Fighter's Valor level 1)
          const effectData = createCritReductionEffect("attack.melee", 1, "Valor (Melee)");
          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          expect(actor.system.attacks.melee.critThreshold).to.equal(19);
          expect(actor.system.attacks.ranged.critThreshold).to.equal(20);
        });

        it("should reduce ranged crit threshold (Gunslinger style)", async () => {
          // Simulate Gunslinger's Deadeye reducing ranged crit
          const effectData = createCritReductionEffect("attack.ranged", 3, "Deadeye");
          await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);

          expect(actor.system.attacks.ranged.critThreshold).to.equal(17);
        });
      });
    },
    { displayName: "Vagabond: Attack Crit Thresholds" }
  );

  quenchRunner.registerBatch(
    "vagabond.critThreshold.effectHelpers",
    (context) => {
      const { describe, it, expect } = context;

      describe("Crit Effect Helper Functions", () => {
        it("should create valid crit reduction effect data", () => {
          const effectData = createCritReductionEffect("brawl", 2, "Test Effect");

          expect(effectData.name).to.equal("Test Effect");
          expect(effectData.changes).to.have.length(1);
          expect(effectData.changes[0].key).to.equal("system.skills.brawl.critThreshold");
          expect(effectData.changes[0].value).to.equal("-2");
          expect(effectData.changes[0].mode).to.equal(EFFECT_MODES.ADD);
        });

        it("should create attack crit reduction with correct key", () => {
          const effectData = createCritReductionEffect("attack.melee", 1, "Valor");

          expect(effectData.changes[0].key).to.equal("system.attacks.melee.critThreshold");
          expect(effectData.changes[0].value).to.equal("-1");
        });

        it("should always use negative value for reduction", () => {
          // Even if positive is passed, should be negative
          const effectData = createCritReductionEffect("brawl", 3, "Test");

          expect(effectData.changes[0].value).to.equal("-3");
        });
      });
    },
    { displayName: "Vagabond: Crit Effect Helpers" }
  );
}
