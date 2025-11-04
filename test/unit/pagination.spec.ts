import { describe, it, expect } from "vitest";
import { applyPagination, encodeCursor, decodeCursor } from "../../src/pagination/index.js";
import type { FoodSummary } from "../../src/domain/food.js";

describe("Pagination", () => {
  const mockFoods: FoodSummary[] = Array.from({ length: 25 }, (_, i) => ({
    fdcId: i + 1,
    description: `Food ${i + 1}`,
    dataType: "Branded",
  })) as FoodSummary[];

  describe("encodeCursor / decodeCursor", () => {
    it("should encode and decode cursor correctly", () => {
      const cursorData = { lastId: 123, lastScore: 45.6 };
      const encoded = encodeCursor(cursorData);
      expect(encoded).toBeTruthy();
      expect(typeof encoded).toBe("string");

      const decoded = decodeCursor(encoded);
      expect(decoded.lastId).toBe(123);
      expect(decoded.lastScore).toBe(45.6);
    });

    it("should throw on invalid cursor", () => {
      expect(() => decodeCursor("invalid-cursor")).toThrow();
    });
  });

  describe("applyPagination - cursor-based", () => {
    it("should paginate with default limit", () => {
      const result = applyPagination(mockFoods, { limit: 10 });
      expect(result.data.length).toBe(10);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.nextCursor).toBeDefined();
    });

    it("should return nextCursor when more items available", () => {
      const result = applyPagination(mockFoods, { limit: 5 });
      expect(result.data.length).toBe(5);
      expect(result.meta.nextCursor).toBeDefined();
    });

    it("should not return nextCursor when no more items", () => {
      const result = applyPagination(mockFoods.slice(0, 5), { limit: 10 });
      expect(result.data.length).toBe(5);
      expect(result.meta.nextCursor).toBeUndefined();
    });

    it("should paginate with cursor", () => {
      const firstPage = applyPagination(mockFoods, { limit: 5 });
      expect(firstPage.meta.nextCursor).toBeDefined();

      const cursor = firstPage.meta.nextCursor!;
      const decoded = decodeCursor(cursor);
      const secondPage = applyPagination(mockFoods, { limit: 5, cursor });
      
      expect(secondPage.data.length).toBeLessThanOrEqual(5);
      expect(secondPage.data[0].fdcId).toBeGreaterThan(decoded.lastId);
    });
  });

  describe("applyPagination - page-based", () => {
    it("should paginate with page and pageSize", () => {
      const result = applyPagination(mockFoods, { page: 1, pageSize: 10 });
      expect(result.data.length).toBe(10);
      expect(result.meta.page).toBe(1);
      expect(result.meta.pageSize).toBe(10);
      expect(result.meta.totalPages).toBeDefined();
    });

    it("should paginate second page", () => {
      const result = applyPagination(mockFoods, { page: 2, pageSize: 10 });
      expect(result.data.length).toBe(10);
      expect(result.meta.page).toBe(2);
      expect(result.data[0].fdcId).toBe(11);
    });

    it("should handle empty page", () => {
      const result = applyPagination(mockFoods, { page: 10, pageSize: 10 });
      expect(result.data.length).toBe(0);
      expect(result.meta.page).toBe(10);
    });
  });
});
