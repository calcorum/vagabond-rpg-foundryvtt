/**
 * Spell Casting System Tests
 *
 * Tests the spell casting mechanics including:
 * - Mana cost calculation (rulebook formula)
 * - Delivery type filtering
 * - Duration type filtering
 * - Damage detection
 *
 * @module tests/spell
 */

/**
 * Register spell casting tests with Quench
 * @param {Quench} quenchRunner - The Quench test runner
 */
export function registerSpellTests(quenchRunner) {
  quenchRunner.registerBatch(
    "vagabond.spells.manaCost",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe("Spell Mana Cost Calculation", () => {
        let actor;
        let spell;

        beforeEach(async () => {
          // Create a test actor
          actor = await Actor.create({
            name: "Test Caster",
            type: "character",
          });

          // Create a test spell with effect
          spell = await Item.create({
            name: "Test Fireball",
            type: "spell",
            system: {
              effect: "Target takes fire damage and catches fire",
              damageType: "fire",
              damageBase: "d6",
              maxDice: 5,
              deliveryTypes: {
                touch: true,
                remote: true,
                sphere: true,
              },
              durationTypes: {
                instant: true,
                focus: true,
              },
            },
          });
        });

        afterEach(async () => {
          await actor?.delete();
          await spell?.delete();
        });

        it("should cost 0 mana for effect-only cast (no damage)", () => {
          const cost = spell.system.calculateManaCost({
            damageDice: 0,
            delivery: "touch",
            duration: "instant",
            includeEffect: true,
          });
          expect(cost).to.equal(0);
        });

        it("should cost 0 mana for 1d6 damage-only cast (no effect)", () => {
          const cost = spell.system.calculateManaCost({
            damageDice: 1,
            delivery: "touch",
            duration: "instant",
            includeEffect: false,
          });
          expect(cost).to.equal(0);
        });

        it("should cost 1 mana for 1d6 damage WITH effect", () => {
          const cost = spell.system.calculateManaCost({
            damageDice: 1,
            delivery: "touch",
            duration: "instant",
            includeEffect: true,
          });
          expect(cost).to.equal(1);
        });

        it("should add +1 mana per extra damage die beyond first", () => {
          // 3d6 damage with effect: 1 base + 2 extra dice = 3
          const cost = spell.system.calculateManaCost({
            damageDice: 3,
            delivery: "touch",
            duration: "instant",
            includeEffect: true,
          });
          expect(cost).to.equal(3);
        });

        it("should add delivery cost for area spells", () => {
          // Sphere costs 2
          const cost = spell.system.calculateManaCost({
            damageDice: 1,
            delivery: "sphere",
            duration: "instant",
            includeEffect: true,
          });
          // 1 base (damage+effect) + 2 sphere = 3
          expect(cost).to.equal(3);
        });

        it("should not add duration cost (rulebook: no initial cost)", () => {
          const instantCost = spell.system.calculateManaCost({
            damageDice: 1,
            delivery: "touch",
            duration: "instant",
            includeEffect: true,
          });
          const focusCost = spell.system.calculateManaCost({
            damageDice: 1,
            delivery: "touch",
            duration: "focus",
            includeEffect: true,
          });
          expect(focusCost).to.equal(instantCost);
        });

        it("should calculate complex spell cost correctly", () => {
          // Example from rulebook: 3d6 sphere = 1 base + 2 extra dice + 2 sphere = 5
          const cost = spell.system.calculateManaCost({
            damageDice: 3,
            delivery: "sphere",
            duration: "instant",
            includeEffect: true,
          });
          expect(cost).to.equal(5);
        });

        it("should handle damage-only with area delivery", () => {
          // 2d6 damage only with cone: 0 base + 1 extra die + 2 cone = 3
          const cost = spell.system.calculateManaCost({
            damageDice: 2,
            delivery: "cone",
            duration: "instant",
            includeEffect: false,
          });
          expect(cost).to.equal(3);
        });
      });
    },
    { displayName: "Vagabond: Spell Mana Cost" }
  );

  quenchRunner.registerBatch(
    "vagabond.spells.deliveryDuration",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe("Spell Delivery and Duration Types", () => {
        let spell;

        beforeEach(async () => {
          spell = await Item.create({
            name: "Test Spell",
            type: "spell",
            system: {
              effect: "Test effect",
              deliveryTypes: {
                touch: true,
                remote: true,
                sphere: false,
                cone: true,
              },
              durationTypes: {
                instant: true,
                focus: true,
                continual: false,
              },
            },
          });
        });

        afterEach(async () => {
          await spell?.delete();
        });

        it("should return only valid delivery types", () => {
          const valid = spell.system.getValidDeliveryTypes();
          expect(valid).to.include("touch");
          expect(valid).to.include("remote");
          expect(valid).to.include("cone");
          expect(valid).to.not.include("sphere");
        });

        it("should return only valid duration types", () => {
          const valid = spell.system.getValidDurationTypes();
          expect(valid).to.include("instant");
          expect(valid).to.include("focus");
          expect(valid).to.not.include("continual");
        });
      });
    },
    { displayName: "Vagabond: Spell Delivery/Duration" }
  );

  quenchRunner.registerBatch(
    "vagabond.spells.damage",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe("Spell Damage Detection", () => {
        let damagingSpell;
        let utilitySpell;

        beforeEach(async () => {
          damagingSpell = await Item.create({
            name: "Fireball",
            type: "spell",
            system: {
              damageType: "fire",
              damageBase: "d6",
              maxDice: 5,
            },
          });

          utilitySpell = await Item.create({
            name: "Light",
            type: "spell",
            system: {
              damageType: "",
              damageBase: "",
              maxDice: 0,
            },
          });
        });

        afterEach(async () => {
          await damagingSpell?.delete();
          await utilitySpell?.delete();
        });

        it("should detect damaging spells", () => {
          expect(damagingSpell.system.isDamaging()).to.be.true;
        });

        it("should detect utility (non-damaging) spells", () => {
          expect(utilitySpell.system.isDamaging()).to.be.false;
        });
      });
    },
    { displayName: "Vagabond: Spell Damage Detection" }
  );
}
