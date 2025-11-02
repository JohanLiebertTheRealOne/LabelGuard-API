import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { searchFoods } from "../services/usdaService.js";
import type { FoodSummary } from "../domain/food.js";
import { validateLabel } from "../services/validationService.js";
import { ValidationRequestSchema } from "../domain/validation.js";

/**
 * Validate food label endpoint handler
 * Analyzes label text for compliance issues and validates claims against USDA data
 *
 * @example
 * POST /labels/validate
 * Content-Type: application/json
 *
 * Request body:
 * {
 *   "labelText": "Ingredients: milk, cultures. Contains live cultures.",
 *   "declaredAllergens": ["milk"],
 *   "servingSize": { "value": 170, "unit": "g" },
 *   "referenceFoodQuery": "greek yogurt",
 *   "claimTexts": ["high protein", "low fat"]
 * }
 *
 * Response:
 * {
 *   "valid": false,
 *   "issues": [
 *     {
 *       "id": "CLAIM_HIGH_PROTEIN_UNSUPPORTED",
 *       "severity": "medium",
 *       "category": "claims",
 *       "message": "Claim 'high protein' may be unsupported. Context shows ~8 g protein per serving.",
 *       "hint": "Ensure ≥ 10 g protein per serving to support 'high protein' claims, or revise the claim.",
 *       "regulationRef": null
 *     }
 *   ],
 *   "summary": {
 *     "allergensFound": ["milk"],
 *     "totalIssues": 1
 *   },
 *   "context": {
 *     "foods": [...],
 *     "chosen": {...}
 *   }
 * }
 */
export async function validate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = ValidationRequestSchema.parse(req.body);

    // Optionally fetch USDA context foods if referenceFoodQuery is provided
    let contextFoods: FoodSummary[] = [];
    if (body.referenceFoodQuery) {
      try {
        const { items } = await searchFoods({
          q: body.referenceFoodQuery,
          limit: 3,
        });
        contextFoods = items;
      } catch (error) {
        // Log error but continue validation without context
        // In production, you might want to handle this differently
      }
    }

    // Perform validation
    const report = validateLabel({
      labelText: body.labelText,
      markets: body.markets,
      declaredAllergens: body.declaredAllergens,
      servingSize: body.servingSize,
      claimTexts: body.claimTexts,
      contextFoods,
    });

    res.json(report);
  } catch (error) {
    next(error);
  }
}

