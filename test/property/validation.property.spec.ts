import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { validateLabel } from "../../src/services/validationService.js";

describe("Validation Property-Based Tests", () => {
  it("should always return a valid report structure", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        fc.array(fc.string()),
        fc.option(
          fc.record({
            value: fc.float({ min: Math.fround(0.1), max: Math.fround(1000) }),
            unit: fc.constantFrom("g", "kg", "ml", "l", "oz"),
          })
        ),
        (labelText, declaredAllergens, servingSize) => {
          const report = validateLabel({
            labelText,
            declaredAllergens,
            servingSize: servingSize || undefined,
          });

          // Always returns valid structure
          expect(report).toHaveProperty("valid");
          expect(report).toHaveProperty("issues");
          expect(report).toHaveProperty("summary");
          expect(typeof report.valid).toBe("boolean");
          expect(Array.isArray(report.issues)).toBe(true);
          expect(typeof report.summary).toBe("object");
        }
      )
    );
  });

  it("should have valid=true when no issues found", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (labelText) => {
          // Simple label with no allergens should be valid
          const report = validateLabel({
            labelText: `Ingredients: ${labelText}`,
            declaredAllergens: [],
          });

          // If no issues, valid should be true
          if (report.issues.length === 0) {
            expect(report.valid).toBe(true);
          }
        }
      )
    );
  });

  it("should have valid=false when issues are present", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }),
        (labelText) => {
          // Label mentioning milk but not declaring it
          const report = validateLabel({
            labelText: `Ingredients: ${labelText}, milk`,
            declaredAllergens: [],
          });

          // If issues present, valid should be false
          if (report.issues.length > 0) {
            expect(report.valid).toBe(false);
          }
        }
      )
    );
  });
});
