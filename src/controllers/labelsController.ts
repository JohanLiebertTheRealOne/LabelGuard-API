import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { searchFoods } from "../services/usdaService.js";
import type { FoodSummary } from "../domain/food.js";
import { validateLabel } from "../services/validationService.js";
import { ValidationRequestSchema } from "../domain/validation.js";
import { executeRules } from "../rules/index.js";
import { getLocale } from "../i18n/index.js";

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

    // Perform validation (base validation)
    const report = validateLabel({
      labelText: body.labelText,
      markets: body.markets,
      declaredAllergens: body.declaredAllergens,
      servingSize: body.servingSize,
      claimTexts: body.claimTexts,
      contextFoods,
    });

    // Execute market-specific rules
    const markets = body.markets || ["US"];
    const ruleIssues = await executeRules(
      {
        labelText: body.labelText,
        markets,
        declaredAllergens: body.declaredAllergens,
        servingSize: body.servingSize,
        referenceFoodQuery: body.referenceFoodQuery,
        claimTexts: body.claimTexts,
      },
      markets
    );

    // Merge rule issues with base validation issues
    const allIssues = [...report.issues, ...ruleIssues];
    const uniqueIssues = Array.from(
      new Map(allIssues.map((issue) => [issue.id, issue])).values()
    );

    res.json({
      ...report,
      issues: uniqueIssues,
      summary: {
        ...report.summary,
        totalIssues: uniqueIssues.length,
      },
    });
  } catch (error) {
    next(error);
  }
}

