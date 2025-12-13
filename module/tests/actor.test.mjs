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

        it("calculates walking Speed based on Dexterity", async () => {
          /**
           * Walking speed is derived from Dexterity stat per the speedByDex lookup table.
           * CharacterData uses speed.walk (not speed.value like NPCs) to support
           * multiple movement types (walk, fly, swim, climb, burrow).
           *
           * Speed by DEX: 2-3 = 25ft, 4-5 = 30ft, 6-7 = 35ft
           */
          // DEX 4 = 30 ft speed
          expect(testActor.system.speed.walk).to.equal(30);

          await testActor.update({ "system.stats.dexterity.value": 6 });
          expect(testActor.system.speed.walk).to.equal(35);

          await testActor.update({ "system.stats.dexterity.value": 2 });
          expect(testActor.system.speed.walk).to.equal(25);
        });

        it("applies speed bonus to walking speed", async () => {
          /**
           * Speed bonuses from effects (Fleet of Foot, Haste, etc.) are added
           * to the base walking speed. Formula: speedByDex[DEX] + bonus
           */
          expect(testActor.system.speed.walk).to.equal(30); // Base DEX 4

          await testActor.update({ "system.speed.bonus": 10 });
          expect(testActor.system.speed.walk).to.equal(40); // 30 + 10
        });

        it("calculates Item Slots as 8 + Might - Fatigue + bonus", async () => {
          /**
           * Item slot formula: baseItemSlots (8) + Might - Fatigue + bonus
           * At creation: fatigue = 0, bonus = 0, so max = 8 + Might
           */
          expect(testActor.system.itemSlots.max).to.equal(13); // 8 + 5 - 0 + 0
        });

        it("tracks overburdened status when used slots exceed max", async () => {
          /**
           * Characters become overburdened when itemSlots.used > itemSlots.max.
           * This status is auto-calculated from actual items in prepareDerivedData().
           * With max = 13 (8 + Might 5), we need items totaling > 13 slots.
           */
          expect(testActor.system.itemSlots.overburdened).to.equal(false);

          // Add equipment items that exceed capacity (max is 13 slots)
          // Each item takes 5 slots, so 3 items = 15 slots > 13 max
          await testActor.createEmbeddedDocuments("Item", [
            { name: "Heavy Pack 1", type: "equipment", "system.slots": 5 },
            { name: "Heavy Pack 2", type: "equipment", "system.slots": 5 },
            { name: "Heavy Pack 3", type: "equipment", "system.slots": 5 },
          ]);
          expect(testActor.system.itemSlots.used).to.equal(15);
          expect(testActor.system.itemSlots.overburdened).to.equal(true);
        });

        it("sums bonus sources for item slot calculation", async () => {
          /**
           * Item slot bonuses come from various sources (Orc Hulking trait, Pack Mule perk).
           * The bonuses array is summed and added to the max calculation.
           */
          expect(testActor.system.itemSlots.max).to.equal(13); // Base

          await testActor.update({
            "system.itemSlots.bonuses": [
              { source: "Orc Hulking", value: 2 },
              { source: "Pack Mule", value: 2 },
            ],
          });
          expect(testActor.system.itemSlots.bonus).to.equal(4);
          expect(testActor.system.itemSlots.max).to.equal(17); // 8 + 5 - 0 + 4
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
        it("tracks Fatigue from 0 to 5 and reduces item slots", async () => {
          /**
           * Fatigue is a resource that accumulates from 0 to 5 (death at 5).
           * Each point of fatigue reduces available item slots by 1.
           * Formula: itemSlots.max = 8 + Might - Fatigue + bonus
           */
          expect(testActor.system.resources.fatigue.value).to.equal(0);
          expect(testActor.system.itemSlots.max).to.equal(13); // 8 + 5 - 0

          await testActor.update({ "system.resources.fatigue.value": 3 });
          expect(testActor.system.resources.fatigue.value).to.equal(3);

          // Fatigue reduces item slots
          expect(testActor.system.itemSlots.max).to.equal(10); // 8 + 5 - 3
        });

        it("sets Luck pool max equal to Luck stat", async () => {
          /**
           * Maximum Luck points equals the character's Luck stat.
           * Luck refreshes on rest and can be spent for rerolls or luck-based perks.
           */
          expect(testActor.system.resources.luck.max).to.equal(2);

          await testActor.update({ "system.stats.luck.value": 5 });
          expect(testActor.system.resources.luck.max).to.equal(5);
        });

        it("tracks HP with bonus modifier", async () => {
          /**
           * HP max = Might × Level + bonus
           * Bonus can come from perks like Tough or ancestry traits.
           */
          expect(testActor.system.resources.hp.max).to.equal(5); // 5 × 1 + 0

          await testActor.update({ "system.resources.hp.bonus": 3 });
          expect(testActor.system.resources.hp.max).to.equal(8); // 5 × 1 + 3
        });

        it("tracks Studied Dice pool for Scholar class", async () => {
          /**
           * Studied Dice are a Scholar class resource - d8s that can replace d20 rolls.
           * The pool has current value and max (typically from class level).
           */
          expect(testActor.system.resources.studiedDice.value).to.equal(0);
          expect(testActor.system.resources.studiedDice.max).to.equal(0);

          await testActor.update({
            "system.resources.studiedDice.value": 2,
            "system.resources.studiedDice.max": 3,
          });
          expect(testActor.system.resources.studiedDice.value).to.equal(2);
          expect(testActor.system.resources.studiedDice.max).to.equal(3);
        });
      });

      describe("Custom Resources", () => {
        it("supports flexible custom resource tracking", async () => {
          /**
           * Custom resources allow class-specific tracking (Alchemist Formulae,
           * Hunter's Mark, Gunslinger consecutive hits, etc.).
           * Each resource has: name, value, max, type, subtype, resetOn, data
           */
          await testActor.update({
            "system.customResources": [
              {
                name: "Prepared Formulae",
                value: 3,
                max: 5,
                type: "list",
                subtype: "formulae",
                resetOn: "rest",
                data: { formulaeIds: ["heal", "firebomb", "smoke"] },
              },
            ],
          });

          expect(testActor.system.customResources.length).to.equal(1);
          expect(testActor.system.customResources[0].name).to.equal("Prepared Formulae");
          expect(testActor.system.customResources[0].type).to.equal("list");
        });
      });

      describe("Status Effects with Countdown Dice", () => {
        it("tracks status effects with countdown die duration", async () => {
          /**
           * Status effects use Countdown Dice for duration tracking.
           * Countdown Dice: d6 → d4 → ends (roll at start of turn, effect ends on 1-2).
           */
          await testActor.update({
            "system.statusEffects": [
              {
                name: "Burning",
                description: "Take 1d6 fire damage at start of turn",
                source: "Dragon Breath",
                beneficial: false,
                durationType: "countdown",
                countdownDie: 6, // Starts as d6
                changes: [],
              },
            ],
          });

          expect(testActor.system.statusEffects.length).to.equal(1);
          expect(testActor.system.statusEffects[0].countdownDie).to.equal(6);
        });
      });

      describe("Favor/Hinder System", () => {
        it("detects favor from Active Effect flags", async () => {
          /**
           * Favor/Hinder is now tracked via Active Effect flags instead of data schema.
           * Flag convention: flags.vagabond.favor.skills.<skillId>
           * The getNetFavorHinder method checks these flags.
           */
          // Set a flag directly (simulating what an Active Effect would do)
          await testActor.setFlag("vagabond", "favor.skills.performance", true);

          const result = testActor.getNetFavorHinder({ skillId: "performance" });
          expect(result.net).to.equal(1);
          expect(result.favorSources.length).to.equal(1);

          // Clean up
          await testActor.unsetFlag("vagabond", "favor.skills.performance");
        });

        it("detects hinder from Active Effect flags", async () => {
          /**
           * Hinder flags work the same way as favor flags.
           * Flag convention: flags.vagabond.hinder.skills.<skillId>
           */
          await testActor.setFlag("vagabond", "hinder.skills.sneak", true);

          const result = testActor.getNetFavorHinder({ skillId: "sneak" });
          expect(result.net).to.equal(-1);
          expect(result.hinderSources.length).to.equal(1);

          // Clean up
          await testActor.unsetFlag("vagabond", "hinder.skills.sneak");
        });

        it("cancels favor and hinder 1-for-1", async () => {
          /**
           * When both favor and hinder apply to the same roll, they cancel out.
           * Net result is clamped to -1, 0, or +1.
           */
          await testActor.setFlag("vagabond", "favor.skills.arcana", true);
          await testActor.setFlag("vagabond", "hinder.skills.arcana", true);

          const result = testActor.getNetFavorHinder({ skillId: "arcana" });
          expect(result.net).to.equal(0);

          // Clean up
          await testActor.unsetFlag("vagabond", "favor.skills.arcana");
          await testActor.unsetFlag("vagabond", "hinder.skills.arcana");
        });

        it("detects favor/hinder for attack rolls", async () => {
          /**
           * Attack rolls check flags.vagabond.favor.attacks and hinder.attacks.
           */
          await testActor.setFlag("vagabond", "favor.attacks", true);

          const result = testActor.getNetFavorHinder({ isAttack: true });
          expect(result.net).to.equal(1);

          // Clean up
          await testActor.unsetFlag("vagabond", "favor.attacks");
        });

        it("detects favor/hinder for save rolls", async () => {
          /**
           * Save rolls check flags.vagabond.favor.saves.<saveType>.
           */
          await testActor.setFlag("vagabond", "hinder.saves.reflex", true);

          const result = testActor.getNetFavorHinder({ saveType: "reflex" });
          expect(result.net).to.equal(-1);

          // Clean up
          await testActor.unsetFlag("vagabond", "hinder.saves.reflex");
        });
      });

      describe("Focus Tracking", () => {
        it("tracks maintained spell focus", async () => {
          /**
           * Focus duration spells require concentration. Character can maintain
           * up to maxConcurrent focus effects (usually 1, Ancient Growth = 2).
           */
          expect(testActor.system.focus.maxConcurrent).to.equal(1);

          await testActor.update({
            "system.focus.active": [
              {
                spellName: "Telekinesis",
                target: "Heavy Boulder",
                manaCostPerRound: 0,
                requiresSaveCheck: false,
                canBeBroken: true,
              },
            ],
          });

          expect(testActor.system.focus.active.length).to.equal(1);
          expect(testActor.system.focus.active[0].spellName).to.equal("Telekinesis");
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
          /**
           * Hit Dice (HD) represents combat prowess, while HP is actual hit points.
           * These are separate to allow flexible monster design.
           */
          expect(testNPC.system.hd).to.equal(1);
          expect(testNPC.system.hp.max).to.equal(4);
        });

        it("stores Threat Level (TL)", async () => {
          /**
           * Threat Level is used for encounter balancing.
           * 0.1 = minion, 1.0 = standard, 2.0+ = elite/boss
           */
          expect(testNPC.system.tl).to.equal(0.8);
        });

        it("stores Zone behavior for AI hints", async () => {
          /**
           * Zone indicates preferred combat positioning:
           * frontline = melee engager, midline = support/ranged, backline = caster/sniper
           */
          expect(testNPC.system.zone).to.equal("frontline");
        });

        it("stores Morale score for flee checks", async () => {
          /**
           * Morale check: 2d6 vs Morale score.
           * Triggered when first ally dies, NPC at half HP, or leader dies.
           */
          expect(testNPC.system.morale).to.equal(6);
        });
      });

      describe("Morale Status Tracking", () => {
        it("tracks morale check state during combat", async () => {
          /**
           * MoraleStatus tracks whether a check has been made this combat,
           * what triggered it, and if the NPC is broken (fleeing/surrendered).
           */
          expect(testNPC.system.moraleStatus.checkedThisCombat).to.equal(false);
          expect(testNPC.system.moraleStatus.broken).to.equal(false);

          await testNPC.update({
            "system.moraleStatus.checkedThisCombat": true,
            "system.moraleStatus.lastTrigger": "half-hp",
            "system.moraleStatus.lastResult": "failed-retreat",
            "system.moraleStatus.broken": true,
          });

          expect(testNPC.system.moraleStatus.checkedThisCombat).to.equal(true);
          expect(testNPC.system.moraleStatus.lastTrigger).to.equal("half-hp");
          expect(testNPC.system.moraleStatus.broken).to.equal(true);
        });
      });

      describe("NPC Senses", () => {
        it("tracks vision types for NPCs", async () => {
          /**
           * Senses determine what an NPC can perceive:
           * darksight = see in darkness, blindsight/tremorsense = range in feet
           */
          expect(testNPC.system.senses.darksight).to.equal(false);
          expect(testNPC.system.senses.blindsight).to.equal(0);

          await testNPC.update({
            "system.senses.darksight": true,
            "system.senses.blindsight": 30,
          });

          expect(testNPC.system.senses.darksight).to.equal(true);
          expect(testNPC.system.senses.blindsight).to.equal(30);
        });
      });

      describe("NPC Actions and Abilities", () => {
        it("stores attack actions array", async () => {
          /**
           * NPC actions define their attack options with name, damage, and type.
           */
          await testNPC.update({
            "system.actions": [
              {
                name: "Rusty Dagger",
                attackType: "melee",
                damage: "1d4",
                damageType: "pierce",
                properties: ["finesse"],
              },
            ],
          });

          expect(testNPC.system.actions.length).to.equal(1);
          expect(testNPC.system.actions[0].name).to.equal("Rusty Dagger");
          expect(testNPC.system.actions[0].damage).to.equal("1d4");
        });

        it("stores special abilities array", async () => {
          /**
           * NPC abilities are special traits (passive or active).
           */
          await testNPC.update({
            "system.abilities": [
              {
                name: "Pack Tactics",
                description: "Gain Favor on attacks when ally is adjacent to target.",
                passive: true,
              },
            ],
          });

          expect(testNPC.system.abilities.length).to.equal(1);
          expect(testNPC.system.abilities[0].name).to.equal("Pack Tactics");
          expect(testNPC.system.abilities[0].passive).to.equal(true);
        });
      });

      describe("Damage Resistances", () => {
        it("tracks immunities, weaknesses, and resistances", async () => {
          /**
           * NPCs can have damage type immunities (no damage), weaknesses (+damage),
           * and resistances (-damage).
           */
          await testNPC.update({
            "system.immunities": ["poison", "psychic"],
            "system.weaknesses": ["fire"],
            "system.resistances": ["blunt"],
          });

          expect(testNPC.system.immunities).to.include("poison");
          expect(testNPC.system.weaknesses).to.include("fire");
          expect(testNPC.system.resistances).to.include("blunt");
        });
      });
    },
    { displayName: "Vagabond: NPC Actors" }
  );
}
