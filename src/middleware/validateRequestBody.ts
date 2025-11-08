import type { Request, Response, NextFunction } from "express";
import Joi from "joi";

const schema = Joi.object({
  labelText: Joi.string().min(1).required(),
  markets: Joi.array().items(Joi.string()).optional(),
  declaredAllergens: Joi.array().items(Joi.string()).optional(),
  allergens: Joi.array().items(Joi.string()).optional(),
  ingredients: Joi.alternatives()
    .try(Joi.string(), Joi.array().items(Joi.string()))
    .optional(),
  servingSize: Joi.object({
    value: Joi.number().optional(),
    unit: Joi.string().optional(),
  }).optional(),
  claimTexts: Joi.array().items(Joi.string()).optional(),
  referenceFoodQuery: Joi.string().optional(),
  productName: Joi.string().optional(),
  nutrition: Joi.object({
    protein: Joi.object({
      value: Joi.number().optional(),
      unit: Joi.string().optional(),
    }).optional(),
    fat: Joi.object({
      value: Joi.number().optional(),
      unit: Joi.string().optional(),
    }).optional(),
    carbs: Joi.object({
      value: Joi.number().optional(),
      unit: Joi.string().optional(),
    }).optional(),
    calories: Joi.object({
      value: Joi.number().optional(),
      unit: Joi.string().optional(),
    }).optional(),
  }).optional(),
  containsStatement: Joi.string().optional(),
  referenceFoodQueryFallback: Joi.string().optional(),
  marketsConfig: Joi.object().optional(),
  glutenFree: Joi.boolean().optional(),
});

export function validateRequestBody(req: Request, res: Response, next: NextFunction): void {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    allowUnknown: true,
    stripUnknown: false,
  });

  if (!error) {
    req.body = value;
    next();
    return;
  }

  const issues = error.details.map((detail) => {
    const field = detail.path.join(".") || detail.context?.label || "body";
    return {
      id: "INVALID_INPUT",
      category: "input",
      severity: "medium",
      message: `Missing or invalid field: ${field}`,
      hint: detail.message,
    };
  });

  res.status(400).json({
    valid: false,
    issues,
    summary: {
      totalIssues: issues.length,
    },
  });
}

