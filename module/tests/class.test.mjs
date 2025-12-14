/**
 * Class Feature Automation Tests
 *
 * Tests the application of class features as Active Effects.
 * Verifies:
 * - Features apply when class is added to character
 * - Features update when character level changes
 * - Features are removed when class is removed
 * - Mana/casting max updates from class progression
 * - Skills are trained from class
 *
 * Testing Strategy:
 * - Unit tests: Call methods directly (applyClassFeatures, updateClassFeatures)
 *   to verify the methods work correctly in isolation.
 * - Integration tests: Wait for async automation (_onCreate, _preDelete) to
 *   verify the system works end-to-end as users would experience.
 *
 * Foundry's lifecycle methods (_onCreate, _preDelete) run asynchronously,
 * so integration tests use small delays to wait for completion.
 *
 * @module tests/class
 */

/**
 * Register class automation tests with Quench
 * @param {Quench} quenchRunner - The Quench test runner
 */
export function registerClassTests(quenchRunner) {
  quenchRunner.registerBatch(
    "vagabond.class.automation",
    (context) => {
      const { describe, it, expect, beforeEach, afterEach } = context;

      describe("Class Feature Automation", () => {
        let actor;
        let fighterClass;

        beforeEach(async () => {
          // Create a test character
          actor = await Actor.create({
            name: "Test Fighter",
            type: "character",
            system: {
              level: 1,
            },
          });

          // Create a test Fighter class with features
          fighterClass = await Item.create({
            name: "Fighter",
            type: "class",
            system: {
              keyStat: "might",
              zone: "frontline",
              isCaster: false,
              trainedSkills: ["brawl", "survival"],
              features: [
                {
                  name: "Valor",
                  level: 1,
                  description: "Reduce melee crit threshold by 1",
                  passive: true,
                  changes: [
                    {
                      key: "system.attacks.melee.critThreshold",
                      mode: 2, // ADD
                      value: "-1",
                    },
                  ],
                },
                {
                  name: "Second Wind",
                  level: 3,
                  description: "Recover HP as a bonus action",
                  passive: false,
                  changes: [], // No automatic changes
                },
                {
                  name: "Improved Valor",
                  level: 4,
                  description: "Reduce melee crit threshold by additional 1",
                  passive: true,
                  changes: [
                    {
                      key: "system.attacks.melee.critThreshold",
                      mode: 2,
                      value: "-1",
                    },
                  ],
                },
              ],
              progression: [],
            },
          });
        });

        afterEach(async () => {
          await actor?.delete();
          await fighterClass?.delete();
        });

        it("should apply level 1 features when class is added", async () => {
          /**
           * Unit test: Verifies applyClassFeatures() correctly creates Active
           * Effects for features at or below the character's current level.
           */
          // Add class to actor
          const [addedClass] = await actor.createEmbeddedDocuments("Item", [
            fighterClass.toObject(),
          ]);

          // Explicitly apply features (lifecycle methods are async)
          await addedClass.applyClassFeatures();

          // Check that the Valor effect was created
          const valorEffect = actor.effects.find((e) => e.name.includes("Valor"));
          expect(valorEffect).to.exist;
          expect(valorEffect.changes[0].key).to.equal("system.attacks.melee.critThreshold");
          expect(valorEffect.changes[0].value).to.equal("-1");

          // Clean up
          await addedClass.delete();
        });

        it("should train skills from class", async () => {
          /**
           * Unit test: Verifies applyClassFeatures() marks the class's
           * trainedSkills as trained on the owning character.
           */
          expect(actor.system.skills.brawl.trained).to.equal(false);
          expect(actor.system.skills.survival.trained).to.equal(false);

          const [addedClass] = await actor.createEmbeddedDocuments("Item", [
            fighterClass.toObject(),
          ]);

          // Explicitly apply features (which includes training skills)
          await addedClass.applyClassFeatures();

          expect(actor.system.skills.brawl.trained).to.equal(true);
          expect(actor.system.skills.survival.trained).to.equal(true);

          await addedClass.delete();
        });

        it("should not apply higher level features at level 1", async () => {
          /**
           * Unit test: Verifies applyClassFeatures() only creates effects
           * for features at or below the character's current level.
           */
          const [addedClass] = await actor.createEmbeddedDocuments("Item", [
            fighterClass.toObject(),
          ]);

          // Explicitly apply features
          await addedClass.applyClassFeatures();

          // Level 4 feature should not exist
          const improvedValorEffect = actor.effects.find((e) => e.name.includes("Improved Valor"));
          expect(improvedValorEffect).to.not.exist;

          await addedClass.delete();
        });

        it("should apply new features when level increases", async () => {
          /**
           * When character level increases, new features at the new level
           * should be automatically applied as Active Effects.
           *
           * This test verifies the level-up behavior specifically, not the
           * initial class application (which is tested separately).
           */
          const [addedClass] = await actor.createEmbeddedDocuments("Item", [
            fighterClass.toObject(),
          ]);

          // Wait for _onCreate automation to complete
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Verify Valor (level 1) was automatically applied
          const valorEffect = actor.effects.find(
            (e) => e.name.includes("Valor") && !e.name.includes("Improved")
          );
          expect(valorEffect).to.exist;

          // Level up to 4 and explicitly update features
          // (updateActor hook is also async, so we call explicitly for test reliability)
          await actor.update({ "system.level": 4 });
          await addedClass.updateClassFeatures(4, 1);

          // Now Improved Valor (level 4) should also exist
          const improvedValorEffect = actor.effects.find((e) => e.name.includes("Improved Valor"));
          expect(improvedValorEffect).to.exist;

          await addedClass.delete();
        });

        it("should remove class effects when class is removed", async () => {
          /**
           * Integration test: When a class item is deleted, the _preDelete
           * lifecycle method should automatically remove all Active Effects
           * originating from that class.
           */
          const [addedClass] = await actor.createEmbeddedDocuments("Item", [
            fighterClass.toObject(),
          ]);

          // Wait for _onCreate automation to apply features
          await new Promise((resolve) => setTimeout(resolve, 50));

          // Verify effect exists
          expect(actor.effects.find((e) => e.name.includes("Valor"))).to.exist;

          // Delete the class - _preDelete should automatically remove effects
          await addedClass.delete();

          // Effect should be gone (cleaned up by _preDelete automation)
          expect(actor.effects.find((e) => e.name.includes("Valor"))).to.not.exist;
        });

        it("should tag effects with class feature metadata", async () => {
          /**
           * Unit test: Verifies applyClassFeatures() sets proper vagabond
           * flags on created effects for filtering and management.
           */
          const [addedClass] = await actor.createEmbeddedDocuments("Item", [
            fighterClass.toObject(),
          ]);

          // Explicitly apply features
          await addedClass.applyClassFeatures();

          const valorEffect = actor.effects.find((e) => e.name.includes("Valor"));
          expect(valorEffect.flags?.vagabond?.classFeature).to.equal(true);
          expect(valorEffect.flags?.vagabond?.className).to.equal("Fighter");
          expect(valorEffect.flags?.vagabond?.featureName).to.equal("Valor");
          expect(valorEffect.flags?.vagabond?.featureLevel).to.equal(1);

          await addedClass.delete();
        });
      });

      describe("Caster Class Progression", () => {
        let actor;
        let wizardClass;

        beforeEach(async () => {
          actor = await Actor.create({
            name: "Test Wizard",
            type: "character",
            system: { level: 1 },
          });

          // Create a caster class with mana progression
          wizardClass = await Item.create({
            name: "Wizard",
            type: "class",
            system: {
              keyStat: "reason",
              zone: "backline",
              isCaster: true,
              actionStyle: "arcana",
              trainedSkills: ["arcana"],
              features: [],
              progression: [
                { level: 1, mana: 4, castingMax: 2, spellsKnown: 3, features: [] },
                { level: 2, mana: 2, castingMax: 0, spellsKnown: 1, features: [] },
                { level: 3, mana: 2, castingMax: 1, spellsKnown: 1, features: [] },
              ],
            },
          });
        });

        afterEach(async () => {
          await actor?.delete();
          await wizardClass?.delete();
        });

        it("should set mana from class progression", async () => {
          /**
           * Unit test: Verifies applyClassFeatures() correctly sets actor's
           * mana pool from the class progression table.
           */
          expect(actor.system.resources.mana.max).to.equal(0);

          const [addedClass] = await actor.createEmbeddedDocuments("Item", [
            wizardClass.toObject(),
          ]);

          // Explicitly apply features (which includes mana progression)
          await addedClass.applyClassFeatures();

          // Level 1 Wizard gets 4 mana
          expect(actor.system.resources.mana.max).to.equal(4);
          expect(actor.system.resources.mana.value).to.equal(4); // Should initialize to max

          await addedClass.delete();
        });

        it("should set casting max from class progression", async () => {
          /**
           * Unit test: Verifies applyClassFeatures() sets the casting max
           * (maximum mana per spell) from the class progression table.
           */
          const [addedClass] = await actor.createEmbeddedDocuments("Item", [
            wizardClass.toObject(),
          ]);

          // Explicitly apply features
          await addedClass.applyClassFeatures();

          expect(actor.system.resources.mana.castingMax).to.equal(2);

          await addedClass.delete();
        });

        it("should update mana when level increases", async () => {
          /**
           * Unit test: Verifies updateClassFeatures() correctly updates
           * mana pool when character level increases.
           */
          const [addedClass] = await actor.createEmbeddedDocuments("Item", [
            wizardClass.toObject(),
          ]);

          // Explicitly apply initial features
          await addedClass.applyClassFeatures();

          expect(actor.system.resources.mana.max).to.equal(4); // Level 1

          // Level up and explicitly update features
          await actor.update({ "system.level": 3 });
          await addedClass.updateClassFeatures(3, 1);

          // Level 1 (4) + Level 2 (2) + Level 3 (2) = 8
          expect(actor.system.resources.mana.max).to.equal(8);
          // Casting max should be 3 (2 from L1 + 1 from L3)
          expect(actor.system.resources.mana.castingMax).to.equal(3);

          await addedClass.delete();
        });
      });
    },
    { displayName: "Vagabond: Class Feature Automation" }
  );
}
