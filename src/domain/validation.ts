import { z } from "zod";
import type { FoodSummary } from "./food.js";

/**
 * Validation issue severity levels
 */
export type IssueSeverity = "low" | "medium" | "high";

/**
 * Validation issue categories
 */
export type IssueCategory = "allergen" | "serving" | "claims" | "format" | "ingredient";

/**
 * Validation issue schema
 */
export const IssueSchema = z.object({
  id: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  category: z.enum(["allergen", "serving", "claims", "format", "ingredient"]),
  message: z.string(),
  hint: z.string().optional(),
  regulationRef: z.string().optional(),
});

export type Issue = z.infer<typeof IssueSchema>;

/**
 * Validation request schema
 */
export const ValidationRequestSchema = z.object({
  labelText: z.string().min(1, "labelText is required"),
  markets: z.array(z.string()).default(["US"]).optional(),
  declaredAllergens: z.array(z.string()).optional(),
  productName: z.string().optional(),
  servingSize: z
    .object({
      value: z.number().positive(),
      unit: z.string().min(1),
    })
    .optional(),
  referenceFoodQuery: z.string().optional(),
  claimTexts: z.array(z.string()).optional(),
});

export type ValidationRequest = z.infer<typeof ValidationRequestSchema>;

/**
 * Validation report response
 */
export type ValidationReport = {
  valid: boolean;
  issues: Issue[];
  summary: {
    allergensFound?: string[];
    totalIssues: number;
  };
  context?: {
    foods: FoodSummary[];
    chosen?: FoodSummary;
  };
};

/**
 * Claims thresholds for validation (non-legal, heuristic-based)
 */
export const CLAIM_THRESHOLDS = {
  HIGH_PROTEIN_MIN_G: 10,
  LOW_FAT_MAX_G: 3,
  SUGAR_FREE_MAX_G: 0.5,
} as const;

/**
 * Major US allergens (FALCPA)
 */
export const MAJOR_US_ALLERGENS = [
  "milk",
  "egg",
  "fish",
  "crustacean shellfish",
  "tree nut",
  "peanut",
  "wheat",
  "soy",
  "sesame",
] as const;

