import type { Request, Response, NextFunction } from "express";
import { searchFoods } from "../../services/usdaService.js";
import { StrictQuerySchema } from "../../validation/query.zod.js";
import { applyPagination } from "../../pagination/index.js";
import type { PaginationQuery } from "../../pagination/page.js";

/**
 * Search foods endpoint handler (v1)
 * Queries USDA FoodData Central with pagination support
 *
 * @example
 * GET /v1/foods?q=greek%20yogurt&limit=5&cursor=eyJsYXN0SWQiOjE3MzQzMH0
 *
 * Response:
 * {
 *   "data": [...],
 *   "meta": {
 *     "totalHits": 25,
 *     "limit": 5,
 *     "nextCursor": "eyJsYXN0SWQiOjE3MzQzNX0"
 *   }
 * }
 */
export async function getFoods(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Use strict validation schema
    const parsed = StrictQuerySchema.parse(req.query);
    const { q, limit, dataType, cursor, page, pageSize } = parsed;

    // Fetch from USDA (with abort signal support)
    const result = await searchFoods(
      {
        q,
        limit: limit || 50, // Fetch max items, then paginate
        dataType,
      },
      req.abortSignal
    );

    // Apply pagination to results
    const paginationParams: PaginationQuery = {
      limit,
      cursor,
      page,
      pageSize,
    };

    const paginated = applyPagination(result.items, paginationParams, result.meta.totalHits);

    res.json({
      data: paginated.data,
      meta: paginated.meta,
    });
  } catch (error) {
    next(error);
  }
}
