import type { Request, Response, NextFunction } from "express";
import { validateLabel } from "../services/validationService.js";
import { ValidationRequestSchema } from "../domain/validation.js";
import { executeRules } from "../rules/index.js";
import { getLogger } from "../observability/logger.js";

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

    // Perform validation (base validation)
    const report = await validateLabel({
      labelText: body.labelText,
      markets: body.markets,
      declaredAllergens: body.declaredAllergens,
      allergens: body.allergens,
      ingredients: body.ingredients,
      containsStatement: body.containsStatement,
      servingSize: body.servingSize,
      claimTexts: body.claimTexts,
      referenceFoodQuery: body.referenceFoodQuery,
      productName: body.productName,
      nutrition: body.nutrition,
      glutenFree: body.glutenFree,
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

    const logger = getLogger();
    const traceId = (req.headers["x-trace-id"] || req.headers["x-request-id"] || req.id || "unknown") as string;

    logger.info("label.validation.completed", {
      traceId,
      markets,
      allergensDetected: report.summary.allergensFound,
      issues: report.issues,
      issueCount: report.summary.totalIssues,
      chosenFood: report.context?.chosen?.description,
      hasContextFoods: Boolean(report.context?.foods?.length),
      fdcWarnings: report.context?.warnings,
    });

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

