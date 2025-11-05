import { registerRules } from "./engine.js";
import { usRules } from "./us/index.js";
import { euRules } from "./eu/index.js";
import { frRules } from "./fr/index.js";

/**
 * Initialize and register all rules for all markets
 * Should be called at application startup
 */
export function initializeRules(): void {
  registerRules("US", usRules);
  registerRules("EU", euRules);
  registerRules("FR", [...euRules, ...frRules]); // FR includes EU rules plus FR-specific
}

export * from "./engine.js";
export * from "./us/index.js";
export * from "./eu/index.js";
export * from "./fr/index.js";
