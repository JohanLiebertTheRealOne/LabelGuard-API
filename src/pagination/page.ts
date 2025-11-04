import { z } from "zod";
import { encodeCursor, decodeCursor } from "./cursor.js";

/**
 * Pagination meta information
 */
export interface PaginationMeta {
  totalHits?: number;
  limit?: number;
  nextCursor?: string;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

/**
 * Pagination query parameters schema
 * Supports both cursor-based and page-based pagination
 */
export const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10).optional(),
  cursor: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Apply pagination to items array
 * Supports cursor-based (default) and page-based pagination
 */
export function applyPagination<T extends { fdcId: number }>(
  items: T[],
  params: PaginationQuery,
  totalHits?: number
): { data: T[]; meta: PaginationMeta } {
  const { cursor, limit = 10, page, pageSize } = params;

  // Page-based pagination (fallback)
  if (page !== undefined || pageSize !== undefined) {
    const size = pageSize || limit;
    const pageNum = page || 1;
    const offset = (pageNum - 1) * size;
    const paginatedItems = items.slice(offset, offset + size);
    const totalPages = totalHits ? Math.ceil(totalHits / size) : undefined;

    return {
      data: paginatedItems,
      meta: {
        totalHits,
        page: pageNum,
        pageSize: size,
        totalPages,
      },
    };
  }

  // Cursor-based pagination (default)
  if (cursor) {
    try {
      const cursorData = decodeCursor(cursor);
      // Find items after the cursor position
      const startIndex = items.findIndex((item) => item.fdcId > cursorData.lastId);
      const paginatedItems = startIndex >= 0 ? items.slice(startIndex, startIndex + limit) : [];
      
      // Generate next cursor if there are more items
      const nextCursor =
        paginatedItems.length === limit && items.length > startIndex + limit
          ? encodeCursor({
              lastId: paginatedItems[paginatedItems.length - 1].fdcId,
            })
          : undefined;

      return {
        data: paginatedItems,
        meta: {
          totalHits,
          limit,
          nextCursor,
        },
      };
    } catch {
      // Invalid cursor, fall back to first page
      const fallbackItems = items.slice(0, limit);
      return {
        data: fallbackItems,
        meta: {
          totalHits,
          limit,
          nextCursor:
            items.length > limit
              ? encodeCursor({
                  lastId: fallbackItems[fallbackItems.length - 1].fdcId,
                })
              : undefined,
        },
      };
    }
  }

  // Default: first page with cursor
  const paginatedItems = items.slice(0, limit);
  const nextCursor =
    items.length > limit
      ? encodeCursor({
          lastId: paginatedItems[paginatedItems.length - 1].fdcId,
        })
      : undefined;

  return {
    data: paginatedItems,
    meta: {
      totalHits,
      limit,
      nextCursor,
    },
  };
}
