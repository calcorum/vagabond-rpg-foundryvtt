/**
 * NPC Morale System Tests
 *
 * Tests the morale check system for NPCs including:
 * - Individual morale rolls (2d6 vs morale score)
 * - Group morale rolls (using lowest morale in group)
 * - Morale status tracking (broken, checkedThisCombat)
 * - Morale prompt creation
 *
 * Morale System Rules:
 * - Roll 2d6 against morale score (2-12, default 7)
 * - If 2d6 > morale, the check fails and the NPC breaks
 * - Triggers: first death, half HP, half group incapacitated, leader death
 *
 * @module tests/morale
 */

/**
 * Register morale tests with Quench
 * @param {Quench} quenchRunner - The Quench test runner
 */
export function registerMoraleTests(quenchRunner) {
  quenchRunner.registerBatch(
    "vagabond.morale",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe("NPC Morale Checks", () => {
        let npc;

        beforeEach(async () => {
          // Create a test NPC with known morale value
          npc = await Actor.create({
            name: "Test Goblin",
            type: "npc",
            system: {
              hp: { value: 10, max: 10 },
              morale: 7,
            },
          });
        });

        afterEach(async () => {
          await npc?.delete();
        });

        it("should roll 2d6 for morale check", async () => {
          /**
           * Unit test: Verifies rollMorale() returns a 2d6 roll result
           * with the correct structure.
           */
          const result = await npc.rollMorale({ skipMessage: true });

          expect(result).to.exist;
          expect(result.roll).to.exist;
          expect(result.roll.total).to.be.at.least(2);
          expect(result.roll.total).to.be.at.most(12);
          expect(result.morale).to.equal(7);
        });

        it("should pass morale when roll <= morale score", async () => {
          /**
           * Unit test: Verifies morale check passes when 2d6 roll is
           * less than or equal to the morale score.
           *
           * We test this by setting a very high morale (12) which guarantees
           * a pass since max 2d6 is 12.
           */
          await npc.update({ "system.morale": 12 });
          const result = await npc.rollMorale({ skipMessage: true });

          // With morale 12, any roll of 2-12 passes
          expect(result.passed).to.equal(true);
          expect(npc.system.moraleStatus.broken).to.equal(false);
        });

        it("should fail morale when roll > morale score", async () => {
          /**
           * Unit test: Verifies morale check fails when 2d6 roll exceeds
           * the morale score, marking the NPC as broken.
           *
           * We test this by setting morale to 1 (below minimum 2d6 of 2).
           */
          await npc.update({ "system.morale": 1 });
          const result = await npc.rollMorale({ skipMessage: true });

          // With morale 1, any roll of 2-12 fails
          expect(result.passed).to.equal(false);
          expect(npc.system.moraleStatus.broken).to.equal(true);
        });

        it("should track morale check status", async () => {
          /**
           * Unit test: Verifies rollMorale() updates the moraleStatus
           * tracking fields correctly.
           */
          expect(npc.system.moraleStatus.checkedThisCombat).to.equal(false);

          await npc.rollMorale({ trigger: "half-hp", skipMessage: true });

          expect(npc.system.moraleStatus.checkedThisCombat).to.equal(true);
          expect(npc.system.moraleStatus.lastTrigger).to.equal("half-hp");
          expect(npc.system.moraleStatus.lastResult).to.be.oneOf(["passed", "failed-retreat"]);
        });

        it("should record trigger in morale status", async () => {
          /**
           * Unit test: Verifies the trigger reason is stored in moraleStatus
           * for reference and potential UI display.
           */
          await npc.rollMorale({ trigger: "first-death", skipMessage: true });

          expect(npc.system.moraleStatus.lastTrigger).to.equal("first-death");
        });

        it("should only work for NPCs", async () => {
          /**
           * Unit test: Verifies rollMorale() returns null and shows
           * a warning when called on non-NPC actors.
           */
          const character = await Actor.create({
            name: "Test Hero",
            type: "character",
            system: { level: 1 },
          });

          const result = await character.rollMorale({ skipMessage: true });
          expect(result).to.be.null;

          await character.delete();
        });
      });

      describe("Group Morale Checks", () => {
        it("should return null when no NPC tokens selected", async () => {
          /**
           * Unit test: Verifies rollGroupMorale() returns null and shows
           * a warning when no NPC tokens are selected.
           *
           * Note: We deselect all tokens first to ensure a clean state.
           */
          // Deselect all tokens to ensure clean state
          canvas.tokens.releaseAll();

          const VagabondActor = CONFIG.Actor.documentClass;
          const result = await VagabondActor.rollGroupMorale({ trigger: "manual" });

          // Without selected tokens, should return null with warning
          expect(result).to.be.null;
        });
      });

      describe("Morale Prompts", () => {
        let npc;

        beforeEach(async () => {
          npc = await Actor.create({
            name: "Test Orc",
            type: "npc",
            system: {
              hp: { value: 10, max: 10 },
              morale: 8,
            },
          });
        });

        afterEach(async () => {
          await npc?.delete();
        });

        it("should not prompt if already broken", async () => {
          /**
           * Unit test: Verifies promptMoraleCheck() does nothing when
           * the NPC is already broken (has failed a previous morale check).
           */
          await npc.update({ "system.moraleStatus.broken": true });

          // Get initial chat message count
          const initialCount = game.messages.size;

          await npc.promptMoraleCheck("half-hp");

          // No new message should be created
          expect(game.messages.size).to.equal(initialCount);
        });

        it("should not prompt for non-NPCs", async () => {
          /**
           * Unit test: Verifies promptMoraleCheck() does nothing when
           * called on a character actor.
           */
          const character = await Actor.create({
            name: "Test Hero",
            type: "character",
            system: { level: 1 },
          });

          const initialCount = game.messages.size;
          await character.promptMoraleCheck("half-hp");

          // No new message should be created
          expect(game.messages.size).to.equal(initialCount);

          await character.delete();
        });

        it("should create a whispered chat message for GM", async () => {
          /**
           * Integration test: Verifies promptMoraleCheck() creates a
           * chat message that is whispered to GMs only and contains
           * a clickable button to roll morale.
           */
          const initialCount = game.messages.size;

          await npc.promptMoraleCheck("half-hp");

          // A new message should be created
          expect(game.messages.size).to.equal(initialCount + 1);

          // Get the most recent message
          const message = Array.from(game.messages).pop();

          // Should be whispered (has whisper recipients)
          expect(message.whisper.length).to.be.greaterThan(0);

          // Should contain the morale roll button
          expect(message.content).to.include("morale-roll-btn");
          expect(message.content).to.include(npc.id);
          expect(message.content).to.include("half-hp");
        });
      });

      describe("Morale Status Data Model", () => {
        let npc;

        beforeEach(async () => {
          npc = await Actor.create({
            name: "Test Skeleton",
            type: "npc",
            system: {
              hp: { value: 8, max: 8 },
              morale: 6,
            },
          });
        });

        afterEach(async () => {
          await npc?.delete();
        });

        it("should have default morale status values", () => {
          /**
           * Unit test: Verifies new NPCs have correct default values
           * for moraleStatus fields.
           */
          expect(npc.system.moraleStatus.checkedThisCombat).to.equal(false);
          expect(npc.system.moraleStatus.broken).to.equal(false);
          expect(npc.system.moraleStatus.lastTrigger).to.equal(null);
          expect(npc.system.moraleStatus.lastResult).to.equal(null);
        });

        it("should have default morale score of 7", () => {
          /**
           * Unit test: Verifies NPCs default to morale 7 if not specified.
           */
          // Create NPC without explicit morale
          Actor.create({
            name: "Default Morale NPC",
            type: "npc",
            system: { hp: { value: 5, max: 5 } },
          }).then(async (defaultNpc) => {
            expect(defaultNpc.system.morale).to.equal(7);
            await defaultNpc.delete();
          });
        });

        it("should clamp morale to valid range (2-12)", async () => {
          /**
           * Unit test: Verifies morale values are clamped to the valid
           * range of 2d6 results (2-12).
           */
          // Try to set morale below minimum
          await npc.update({ "system.morale": 0 });
          expect(npc.system.morale).to.be.at.least(2);

          // Try to set morale above maximum
          await npc.update({ "system.morale": 15 });
          expect(npc.system.morale).to.be.at.most(12);
        });
      });
    },
    { displayName: "Vagabond: NPC Morale System" }
  );
}
