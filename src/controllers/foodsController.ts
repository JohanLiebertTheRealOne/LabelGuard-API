import type { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { searchFoods } from "../services/usdaService.js";

/**
 * Query parameter validation schema
 */
const querySchema = z.object({
  q: z.string().min(1, "Search query 'q' is required"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  dataType: z
    .preprocess(
      (v) => {
        if (typeof v === "string") {
          return v.split(",").map((s) => s.trim()).filter(Boolean);
        }
        return v;
      },
      z.array(z.enum(["Branded", "SR Legacy", "Survey (FNDDS)", "Foundation"])).optional()
    )
    .optional(),
});

/**
 * Search foods endpoint handler
 * Queries USDA FoodData Central and returns clean nutrition data
 *
 * @example
 * GET /foods?q=greek%20yogurt&limit=5
 *
 * Response:
 * {
 *   "items": [
 *     {
 *       "fdcId": 173430,
 *       "description": "Yogurt, Greek, plain, lowfat",
 *       "brandOwner": null,
 *       "gtinUpc": null,
 *       "dataType": "SR Legacy",
 *       "servingSize": 170,
 *       "servingSizeUnit": "g",
 *       "caloriesKcal": 73,
 *       "macros": {
 *         "proteinG": 10,
 *         "fatG": 1.92,
 *         "carbsG": 3.87
 *       }
 *     }
 *   ],
 *   "meta": {
 *     "totalHits": 25,
 *     "limit": 5
 *   }
 * }
 */
export async function getFoods(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { q, limit, dataType } = querySchema.parse(req.query);

    const result = await searchFoods({
      q,
      limit,
      dataType,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
}

