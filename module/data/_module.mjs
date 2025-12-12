/**
 * Vagabond RPG Data Models
 *
 * Central export point for all data model classes.
 * These models define the schema and behavior for Actor and Item documents.
 */

// Actor data models
export * from "./actor/_module.mjs";

// Item data models
export * from "./item/_module.mjs";

// Re-export for convenience
export { VagabondActorBase, CharacterData, NPCData } from "./actor/_module.mjs";

export {
  VagabondItemBase,
  AncestryData,
  ClassData,
  SpellData,
  PerkData,
  WeaponData,
  ArmorData,
  EquipmentData,
  FeatureData,
} from "./item/_module.mjs";
