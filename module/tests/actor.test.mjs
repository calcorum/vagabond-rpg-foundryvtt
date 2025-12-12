/**
 * Actor Data Model Tests
 *
 * Tests for VagabondActor class and character/NPC data models.
 * These tests verify derived value calculations, resource tracking,
 * and data integrity.
 */

/**
 * Register actor tests with Quench
 * @param {Quench} quenchRunner - The Quench test runner instance
 */
export function registerActorTests(quenchRunner) {
  quenchRunner.registerBatch(
    "vagabond.actors.character",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      let testActor = null;

      beforeEach(async () => {
        // Create a fresh test actor before each test
        testActor = await Actor.create({
          name: "Test Character",
          type: "character",
          system: {
            stats: {
              might: { value: 5 },
              dexterity: { value: 4 },
              awareness: { value: 3 },
              reason: { value: 4 },
              presence: { value: 3 },
              luck: { value: 2 },
            },
            level: 1,
          },
        });
      });

      afterEach(async () => {
        // Clean up test actor after each test
        if (testActor) {
          await testActor.delete();
          testActor = null;
        }
      });

      describe("Derived Values", () => {
        it("calculates Max HP as Might × Level", async () => {
          expect(testActor.system.resources.hp.max).to.equal(5); // 5 × 1

          await testActor.update({ "system.level": 3 });
          expect(testActor.system.resources.hp.max).to.equal(15); // 5 × 3
        });

        it("calculates Speed based on Dexterity", async () => {
          // DEX 4 = 30 ft speed
          expect(testActor.system.speed.value).to.equal(30);

          await testActor.update({ "system.stats.dexterity.value": 6 });
          expect(testActor.system.speed.value).to.equal(35);

          await testActor.update({ "system.stats.dexterity.value": 2 });
          expect(testActor.system.speed.value).to.equal(25);
        });

        it("calculates Item Slots as 8 + Might", async () => {
          expect(testActor.system.itemSlots.max).to.equal(13); // 8 + 5
        });

        it("calculates Save difficulties correctly", async () => {
          // Reflex = DEX + AWR = 4 + 3 = 7, Difficulty = 20 - 7 = 13
          expect(testActor.system.saves.reflex.difficulty).to.equal(13);

          // Endure = MIT + MIT = 5 + 5 = 10, Difficulty = 20 - 10 = 10
          expect(testActor.system.saves.endure.difficulty).to.equal(10);

          // Will = RSN + PRS = 4 + 3 = 7, Difficulty = 20 - 7 = 13
          expect(testActor.system.saves.will.difficulty).to.equal(13);
        });

        it("calculates Skill difficulties based on training", async () => {
          // Untrained: 20 - stat
          // Trained: 20 - (stat × 2)

          // Arcana (RSN 4), untrained: 20 - 4 = 16
          expect(testActor.system.skills.arcana.difficulty).to.equal(16);

          // Set trained
          await testActor.update({ "system.skills.arcana.trained": true });
          // Trained: 20 - (4 × 2) = 12
          expect(testActor.system.skills.arcana.difficulty).to.equal(12);
        });
      });

      describe("Resource Tracking", () => {
        it("tracks Fatigue from 0 to 5", async () => {
          expect(testActor.system.resources.fatigue.value).to.equal(0);

          await testActor.update({ "system.resources.fatigue.value": 3 });
          expect(testActor.system.resources.fatigue.value).to.equal(3);

          // Fatigue reduces item slots
          expect(testActor.system.itemSlots.max).to.equal(10); // 13 - 3
        });

        it("tracks Current Luck up to Luck stat", async () => {
          expect(testActor.system.resources.luck.max).to.equal(2);
        });
      });
    },
    { displayName: "Vagabond: Character Actors" }
  );

  quenchRunner.registerBatch(
    "vagabond.actors.npc",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      let testNPC = null;

      beforeEach(async () => {
        testNPC = await Actor.create({
          name: "Test Goblin",
          type: "npc",
          system: {
            hd: 1,
            hp: { value: 4, max: 4 },
            tl: 0.8,
            zone: "frontline",
            morale: 6,
            armor: 0,
          },
        });
      });

      afterEach(async () => {
        if (testNPC) {
          await testNPC.delete();
          testNPC = null;
        }
      });

      describe("NPC Stats", () => {
        it("stores HD and HP independently", async () => {
          expect(testNPC.system.hd).to.equal(1);
          expect(testNPC.system.hp.max).to.equal(4);
        });

        it("stores Threat Level (TL)", async () => {
          expect(testNPC.system.tl).to.equal(0.8);
        });

        it("stores Zone behavior", async () => {
          expect(testNPC.system.zone).to.equal("frontline");
        });

        it("stores Morale score", async () => {
          expect(testNPC.system.morale).to.equal(6);
        });
      });
    },
    { displayName: "Vagabond: NPC Actors" }
  );
}
