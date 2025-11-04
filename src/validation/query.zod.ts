import { z } from "zod";

/**
 * Strict validation schema for query parameters
 * Enforces length limits and whitelists as per security requirements
 */
export const StrictQuerySchema = z.object({
  q: z.string().min(1, "Search query 'q' is required").max(128, "Query must be 128 characters or less"),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  cursor: z.string().max(500).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
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
 * Strict validation schema for label validation request body
 */
export const StrictLabelValidationSchema = z.object({
  labelText: z.string().min(1, "labelText is required").max(10000, "labelText must be 10000 characters or less"),
  declaredAllergens: z.array(z.string()).optional(),
  servingSize: z
    .object({
      value: z.number().positive(),
      unit: z.string().min(1),
    })
    .optional(),
  referenceFoodQuery: z.string().max(128).optional(),
  claimTexts: z.array(z.string()).optional(),
  markets: z.array(z.enum(["US", "EU", "FR"])).optional(),
});

export type StrictQueryParams = z.infer<typeof StrictQuerySchema>;
export type StrictLabelValidation = z.infer<typeof StrictLabelValidationSchema>;
