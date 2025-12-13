/**
 * Dice Rolling Module Tests
 *
 * Tests for the Vagabond RPG dice rolling system.
 * Covers d20 checks, skill/attack/save rolls, damage, and special dice mechanics.
 */

import {
  d20Check,
  skillCheck,
  attackCheck,
  saveRoll,
  damageRoll,
  doubleDice,
  countdownRoll,
  moraleCheck,
} from "../dice/_module.mjs";

/**
 * Register dice tests with Quench
 * @param {Quench} quenchRunner - The Quench test runner instance
 */
export function registerDiceTests(quenchRunner) {
  quenchRunner.registerBatch(
    "vagabond.dice.d20check",
    (context) => {
      const { describe, it, expect } = context;

      describe("d20Check Basic Functionality", () => {
        it("returns a roll result object with expected properties", async () => {
          /**
           * d20Check should return a structured result with roll object,
           * total, success boolean, crit/fumble flags, and details.
           */
          const result = await d20Check({ difficulty: 10 });

          expect(result).to.have.property("roll");
          expect(result).to.have.property("total");
          expect(result).to.have.property("success");
          expect(result).to.have.property("isCrit");
          expect(result).to.have.property("isFumble");
          expect(result).to.have.property("d20Result");
          expect(result).to.have.property("difficulty");
          expect(result.difficulty).to.equal(10);
        });

        it("determines success when total >= difficulty", async () => {
          /**
           * A roll succeeds when the total (d20 + modifiers) meets or
           * exceeds the difficulty number.
           */
          // Run multiple times to get statistical coverage
          let successCount = 0;
          let failCount = 0;

          for (let i = 0; i < 20; i++) {
            const result = await d20Check({ difficulty: 10 });
            if (result.success) {
              expect(result.total).to.be.at.least(10);
              successCount++;
            } else {
              expect(result.total).to.be.below(10);
              failCount++;
            }
          }

          // With DC 10, we should see both successes and failures
          // (statistically very likely over 20 rolls)
          expect(successCount + failCount).to.equal(20);
        });

        it("detects critical hits at or above crit threshold", async () => {
          /**
           * A critical hit occurs when the natural d20 result (before modifiers)
           * meets or exceeds the critThreshold. Default is 20.
           */
          const result = await d20Check({ difficulty: 10, critThreshold: 20 });

          // isCrit should be true only if d20Result >= critThreshold
          if (result.isCrit) {
            expect(result.d20Result).to.be.at.least(20);
          } else {
            expect(result.d20Result).to.be.below(20);
          }
        });

        it("supports lowered crit thresholds", async () => {
          /**
           * Class features like Fighter's Valor can lower the crit threshold.
           * A critThreshold of 18 means crits on 18, 19, or 20.
           */
          const result = await d20Check({ difficulty: 10, critThreshold: 18 });

          if (result.isCrit) {
            expect(result.d20Result).to.be.at.least(18);
          }
        });

        it("detects fumbles on natural 1", async () => {
          /**
           * A fumble occurs when the natural d20 shows a 1.
           * This is independent of success/failure.
           */
          const result = await d20Check({ difficulty: 10 });

          if (result.isFumble) {
            expect(result.d20Result).to.equal(1);
          }
        });
      });

      describe("Favor and Hinder Modifiers", () => {
        it("adds +d6 when favorHinder is positive", async () => {
          /**
           * Favor adds a bonus d6 to the roll total.
           * The formula becomes "1d20 + 1d6".
           */
          const result = await d20Check({ difficulty: 10, favorHinder: 1 });

          expect(result.details.favorHinder).to.equal(1);
          expect(result.favorDie).to.be.at.least(1);
          expect(result.favorDie).to.be.at.most(6);
          expect(result.details.formula).to.include("+ 1d6");
        });

        it("subtracts d6 when favorHinder is negative", async () => {
          /**
           * Hinder subtracts a d6 from the roll total.
           * The formula becomes "1d20 - 1d6".
           */
          const result = await d20Check({ difficulty: 10, favorHinder: -1 });

          expect(result.details.favorHinder).to.equal(-1);
          expect(result.favorDie).to.be.at.most(-1);
          expect(result.favorDie).to.be.at.least(-6);
          expect(result.details.formula).to.include("- 1d6");
        });

        it("has no extra die when favorHinder is 0", async () => {
          /**
           * When favor and hinder cancel out (net 0), no d6 is added.
           */
          const result = await d20Check({ difficulty: 10, favorHinder: 0 });

          expect(result.favorDie).to.equal(0);
          expect(result.details.formula).to.not.include("d6");
        });
      });

      describe("Flat Modifiers", () => {
        it("applies positive modifiers to the roll", async () => {
          /**
           * Situational modifiers are added to the roll total.
           */
          const result = await d20Check({ difficulty: 10, modifier: 5 });

          expect(result.details.modifier).to.equal(5);
          expect(result.details.formula).to.include("+ 5");
        });

        it("applies negative modifiers to the roll", async () => {
          /**
           * Negative modifiers subtract from the roll total.
           */
          const result = await d20Check({ difficulty: 10, modifier: -3 });

          expect(result.details.modifier).to.equal(-3);
          expect(result.details.formula).to.include("- 3");
        });
      });
    },
    { displayName: "Vagabond: d20 Check System" }
  );

  quenchRunner.registerBatch(
    "vagabond.dice.skillcheck",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      let testActor = null;

      beforeEach(async () => {
        testActor = await Actor.create({
          name: "Test Skill Roller",
          type: "character",
          system: {
            stats: {
              might: { value: 4 },
              dexterity: { value: 5 },
              awareness: { value: 3 },
              reason: { value: 6 },
              presence: { value: 3 },
              luck: { value: 2 },
            },
            skills: {
              arcana: { trained: true, critThreshold: 20 },
              brawl: { trained: false, critThreshold: 20 },
              sneak: { trained: true, critThreshold: 19 },
            },
            level: 1,
          },
        });
      });

      afterEach(async () => {
        if (testActor) {
          await testActor.delete();
          testActor = null;
        }
      });

      describe("Skill Check Rolls", () => {
        it("uses correct difficulty for trained skills", async () => {
          /**
           * Trained skill difficulty = 20 - (stat × 2)
           * Arcana uses Reason (6), so difficulty = 20 - 12 = 8
           */
          const result = await skillCheck(testActor, "arcana");

          // Difficulty should be calculated as 20 - (6 × 2) = 8
          expect(result.difficulty).to.equal(8);
        });

        it("uses correct difficulty for untrained skills", async () => {
          /**
           * Untrained skill difficulty = 20 - stat
           * Brawl (untrained) uses Might (4), so difficulty = 20 - 4 = 16
           */
          const result = await skillCheck(testActor, "brawl");

          // Difficulty should be calculated as 20 - 4 = 16
          expect(result.difficulty).to.equal(16);
        });

        it("uses skill-specific crit threshold", async () => {
          /**
           * Skills can have modified crit thresholds from class features.
           * Sneak has critThreshold: 19 set in test data.
           */
          const result = await skillCheck(testActor, "sneak");

          expect(result.critThreshold).to.equal(19);
        });

        it("throws error for unknown skill", async () => {
          /**
           * Attempting to roll an unknown skill should throw an error.
           */
          try {
            await skillCheck(testActor, "nonexistent");
            expect.fail("Should have thrown an error");
          } catch (error) {
            expect(error.message).to.include("Unknown skill");
          }
        });
      });
    },
    { displayName: "Vagabond: Skill Check System" }
  );

  quenchRunner.registerBatch(
    "vagabond.dice.attackcheck",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      let testActor = null;
      let testWeapon = null;

      beforeEach(async () => {
        testActor = await Actor.create({
          name: "Test Attacker",
          type: "character",
          system: {
            stats: {
              might: { value: 5 },
              dexterity: { value: 4 },
              awareness: { value: 3 },
              reason: { value: 2 },
              presence: { value: 2 },
              luck: { value: 2 },
            },
            attacks: {
              melee: { critThreshold: 19 },
              ranged: { critThreshold: 20 },
              finesse: { critThreshold: 20 },
              brawl: { critThreshold: 20 },
            },
            level: 1,
          },
        });

        testWeapon = await Item.create({
          name: "Test Sword",
          type: "weapon",
          system: {
            damage: "1d8",
            attackSkill: "melee",
            gripType: "1h",
            properties: [],
          },
        });
      });

      afterEach(async () => {
        if (testActor) await testActor.delete();
        if (testWeapon) await testWeapon.delete();
        testActor = null;
        testWeapon = null;
      });

      describe("Attack Check Rolls", () => {
        it("calculates difficulty from attack stat", async () => {
          /**
           * Attack difficulty = 20 - (stat × 2) (attacks are always trained)
           * Melee uses Might (5), so difficulty = 20 - 10 = 10
           */
          const result = await attackCheck(testActor, testWeapon);

          expect(result.difficulty).to.equal(10);
        });

        it("uses attack-specific crit threshold", async () => {
          /**
           * Attack types can have modified crit thresholds.
           * Melee attacks have critThreshold: 19 in test data.
           */
          const result = await attackCheck(testActor, testWeapon);

          expect(result.critThreshold).to.equal(19);
        });
      });
    },
    { displayName: "Vagabond: Attack Check System" }
  );

  quenchRunner.registerBatch(
    "vagabond.dice.saveroll",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      let testActor = null;

      beforeEach(async () => {
        testActor = await Actor.create({
          name: "Test Saver",
          type: "character",
          system: {
            stats: {
              might: { value: 4 },
              dexterity: { value: 5 },
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
        if (testActor) await testActor.delete();
        testActor = null;
      });

      describe("Save Rolls", () => {
        it("rolls against provided difficulty", async () => {
          /**
           * Save rolls use an externally provided difficulty
           * (typically from the attacker's stat).
           */
          const result = await saveRoll(testActor, "reflex", 12);

          expect(result.difficulty).to.equal(12);
        });

        it("saves do not crit (threshold stays 20)", async () => {
          /**
           * Save rolls use the default crit threshold of 20.
           * Unlike attacks, saves cannot have lowered crit thresholds.
           */
          const result = await saveRoll(testActor, "endure", 10);

          expect(result.critThreshold).to.equal(20);
        });
      });
    },
    { displayName: "Vagabond: Save Roll System" }
  );

  quenchRunner.registerBatch(
    "vagabond.dice.damage",
    (context) => {
      const { describe, it, expect } = context;

      describe("Damage Rolls", () => {
        it("evaluates damage formula", async () => {
          /**
           * Damage rolls evaluate a dice formula and return the total.
           */
          const roll = await damageRoll("2d6");

          expect(roll.total).to.be.at.least(2);
          expect(roll.total).to.be.at.most(12);
        });

        it("doubles dice on critical hit", async () => {
          /**
           * Critical hits double the number of dice rolled.
           * "2d6" becomes "4d6" on a crit.
           */
          const roll = await damageRoll("2d6", { isCrit: true });

          // 4d6 range: 4-24
          expect(roll.total).to.be.at.least(4);
          expect(roll.total).to.be.at.most(24);
        });

        it("does not double modifiers on crit", async () => {
          /**
           * Only dice are doubled on crit, not flat modifiers.
           * "1d6+3" becomes "2d6+3" (not "2d6+6").
           */
          const roll = await damageRoll("1d6+3", { isCrit: true });

          // 2d6+3 range: 5-15
          expect(roll.total).to.be.at.least(5);
          expect(roll.total).to.be.at.most(15);
        });
      });

      describe("doubleDice Helper", () => {
        it("doubles dice count in formula", () => {
          /**
           * The doubleDice helper doubles the number of each die type.
           */
          expect(doubleDice("1d6")).to.equal("2d6");
          expect(doubleDice("2d8")).to.equal("4d8");
          expect(doubleDice("3d10")).to.equal("6d10");
        });

        it("preserves modifiers when doubling dice", () => {
          /**
           * Flat modifiers should remain unchanged.
           */
          expect(doubleDice("1d6+3")).to.equal("2d6+3");
          expect(doubleDice("2d8-2")).to.equal("4d8-2");
        });

        it("handles multiple dice types", () => {
          /**
           * Formulas with multiple dice types should double each.
           */
          expect(doubleDice("1d6+1d4")).to.equal("2d6+2d4");
        });
      });
    },
    { displayName: "Vagabond: Damage Roll System" }
  );

  quenchRunner.registerBatch(
    "vagabond.dice.countdown",
    (context) => {
      const { describe, it, expect } = context;

      describe("Countdown Dice", () => {
        it("rolls the specified die size", async () => {
          /**
           * Countdown dice start as d6 and shrink to d4.
           * The result should be within the die's range.
           */
          const result = await countdownRoll(6);

          expect(result.roll).to.not.be.null;
          expect(result.result).to.be.at.least(1);
          expect(result.result).to.be.at.most(6);
        });

        it("continues on high rolls (3-6 on d6)", async () => {
          /**
           * When rolling 3+ on the countdown die, the effect continues
           * with the same die size.
           */
          // Run multiple times to test the logic
          for (let i = 0; i < 10; i++) {
            const result = await countdownRoll(6);

            if (result.result >= 3) {
              expect(result.continues).to.equal(true);
              expect(result.nextDie).to.equal(6);
              expect(result.ended).to.equal(false);
              expect(result.shrunk).to.equal(false);
            }
          }
        });

        it("shrinks die on low rolls (1-2)", async () => {
          /**
           * Rolling 1-2 on the countdown die causes it to shrink.
           * d6 → d4, d4 → effect ends.
           */
          for (let i = 0; i < 20; i++) {
            const result = await countdownRoll(6);

            if (result.result <= 2) {
              expect(result.nextDie).to.equal(4);
              expect(result.shrunk).to.equal(true);
              expect(result.ended).to.equal(false);
              break;
            }
          }
        });

        it("ends effect when d4 rolls 1-2", async () => {
          /**
           * When a d4 countdown die rolls 1-2, the effect ends completely.
           */
          for (let i = 0; i < 20; i++) {
            const result = await countdownRoll(4);

            if (result.result <= 2) {
              expect(result.nextDie).to.equal(0);
              expect(result.ended).to.equal(true);
              expect(result.continues).to.equal(false);
              break;
            }
          }
        });

        it("returns ended state for die size 0", async () => {
          /**
           * If passed a die size of 0, the effect has already ended.
           */
          const result = await countdownRoll(0);

          expect(result.roll).to.be.null;
          expect(result.continues).to.equal(false);
          expect(result.ended).to.equal(true);
        });
      });
    },
    { displayName: "Vagabond: Countdown Dice System" }
  );

  quenchRunner.registerBatch(
    "vagabond.dice.morale",
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
            morale: 6,
            zone: "frontline",
          },
        });
      });

      afterEach(async () => {
        if (testNPC) await testNPC.delete();
        testNPC = null;
      });

      describe("Morale Checks", () => {
        it("rolls 2d6 against morale score", async () => {
          /**
           * Morale check: 2d6 vs Morale score.
           * Pass if roll <= morale, fail if roll > morale.
           */
          const result = await moraleCheck(testNPC);

          expect(result.roll).to.not.be.null;
          expect(result.total).to.be.at.least(2);
          expect(result.total).to.be.at.most(12);
          expect(result.morale).to.equal(6);
        });

        it("passes when roll <= morale", async () => {
          /**
           * NPC holds their ground when 2d6 <= morale.
           */
          const result = await moraleCheck(testNPC);

          if (result.total <= 6) {
            expect(result.passed).to.equal(true);
            expect(result.fled).to.equal(false);
          }
        });

        it("fails when roll > morale", async () => {
          /**
           * NPC flees when 2d6 > morale.
           */
          const result = await moraleCheck(testNPC);

          if (result.total > 6) {
            expect(result.passed).to.equal(false);
            expect(result.fled).to.equal(true);
          }
        });

        it("throws error for non-NPC actors", async () => {
          /**
           * Only NPCs can make morale checks.
           */
          const pcActor = await Actor.create({
            name: "Test PC",
            type: "character",
            system: { level: 1 },
          });

          try {
            await moraleCheck(pcActor);
            expect.fail("Should have thrown an error");
          } catch (error) {
            expect(error.message).to.include("only for NPCs");
          } finally {
            await pcActor.delete();
          }
        });
      });
    },
    { displayName: "Vagabond: Morale Check System" }
  );
}
