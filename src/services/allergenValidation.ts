import nlp from "compromise";
import type { Issue } from "../domain/validation.js";
import { MAJOR_US_ALLERGENS } from "../domain/validation.js";

export type AllergenSource = "labelText" | "ingredients" | "containsStatement" | "nlp";

export type InferredAllergen = {
  name: string;
  matchedText: string;
  source: AllergenSource;
  negated?: boolean;
  confidence: number;
};

export type AllergenDetectionInput = {
  labelText?: string;
  ingredients?: string | string[];
  declaredAllergens?: string[];
  allergens?: string[];
  containsStatement?: string;
  glutenFree?: boolean;
};

export type AllergenDetectionResult = {
  detectedAllergens: string[];
  declaredAllergens: string[];
  inferred: InferredAllergen[];
  issues: Issue[];
};

type ContainsStatementParse = {
  declaredAllergens: string[];
  declaresNone: boolean;
  raw: string | undefined;
};

const ALLERGEN_VARIATIONS: Record<string, string[]> = {
  milk: ["milk", "dairy", "lactose", "whey", "casein", "lait", "leche"],
  egg: ["egg", "eggs", "albumin", "lecithin", "oeuf", "huevo"],
  fish: ["fish", "anchovy", "tuna", "salmon", "trout", "cod", "poisson"],
  "crustacean shellfish": [
    "shellfish",
    "shrimp",
    "crab",
    "lobster",
    "crustacean",
    "crevette",
    "homard",
  ],
  "tree nut": [
    "tree nut",
    "almond",
    "walnut",
    "pecan",
    "cashew",
    "hazelnut",
    "pistachio",
    "noisette",
    "noix",
  ],
  peanut: ["peanut", "groundnut", "cacahuète", "cacahuete"],
  wheat: ["wheat", "gluten", "flour", "farine", "farine de blé", "ble", "semolina"],
  soy: ["soy", "soya", "soybean", "tofu", "soja"],
  sesame: ["sesame", "tahini", "sesame seed", "sesamo"],
};

const NEGATION_TERMS = ["sans", "no", "without", "free", "aucun", "none", "zéro", "zero"];

const ALLERGEN_REGEX_RULES: Array<{
  pattern: RegExp;
  allergen: string;
  negated?: boolean;
  source: AllergenSource;
  confidence?: number;
}> = [
  { pattern: /\bcontains?\s+milk\b/gi, allergen: "milk", source: "labelText" },
  { pattern: /\bcontains?\s+eggs?\b/gi, allergen: "egg", source: "labelText" },
  { pattern: /\bcontains?\s+soy\b/gi, allergen: "soy", source: "labelText" },
  { pattern: /\bcontains?\s+peanuts?\b/gi, allergen: "peanut", source: "labelText" },
  { pattern: /\bcontains?\s+sesame\b/gi, allergen: "sesame", source: "labelText" },
  { pattern: /\bcontains?\s+tree\s+nuts?\b/gi, allergen: "tree nut", source: "labelText" },
  { pattern: /\bmay\s+contain\b.*\bwheat\b/gi, allergen: "wheat", source: "labelText" },
  { pattern: /\bfarine\s+de\s+bl[eé]\b/gi, allergen: "wheat", source: "labelText" },
  { pattern: /\bgluten\b/gi, allergen: "wheat", source: "labelText" },
  { pattern: /\bsans\s+gluten\b/gi, allergen: "wheat", source: "labelText", negated: true },
  { pattern: /\bgluten[-\s]?free\b/gi, allergen: "wheat", source: "labelText", negated: true },
  { pattern: /\bhypoallergenic\b/gi, allergen: "milk", source: "labelText", negated: true },
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values.map(normalize)));
}

function expandAllergenSynonyms(allergen: string): string[] {
  const base = ALLERGEN_VARIATIONS[allergen] || [allergen];
  return Array.from(new Set([...base, allergen]));
}

function toPlainIngredients(ingredients?: string | string[]): string {
  if (!ingredients) return "";
  if (Array.isArray(ingredients)) {
    return ingredients.join(" ").trim();
  }
  return ingredients;
}

function parseContainsStatement(statement?: string): ContainsStatementParse {
  if (!statement) {
    return {
      declaredAllergens: [],
      declaresNone: false,
      raw: undefined,
    };
  }

  const lower = statement.toLowerCase();
  const declaresNone =
    /\bcontains?\b/.test(lower) &&
    (/\bnone\b/.test(lower) || /\bno\b/.test(lower) || /\bfree\b/.test(lower));

  const allergens: string[] = [];

  const match = statement.match(/contains?:?\s*(.*)/i);
  if (match?.[1]) {
    const candidates = match[1]
      .replace(/\(.*?\)/g, "")
      .split(/[,;]+/)
      .map((item) => item.trim())
      .filter(Boolean);

    for (const candidate of candidates) {
      for (const allergen of MAJOR_US_ALLERGENS) {
        const synonyms = expandAllergenSynonyms(allergen);
        if (synonyms.some((syn) => candidate.toLowerCase().includes(syn.toLowerCase()))) {
          allergens.push(allergen);
        }
      }
    }
  }

  return {
    declaredAllergens: dedupe(allergens),
    declaresNone,
    raw: statement,
  };
}

function detectFromIngredients(ingredients: string): InferredAllergen[] {
  const lower = ingredients.toLowerCase();
  const inferred: InferredAllergen[] = [];

  for (const allergen of MAJOR_US_ALLERGENS) {
    const synonyms = expandAllergenSynonyms(allergen);
    for (const synonym of synonyms) {
      if (synonym && lower.includes(synonym.toLowerCase())) {
        inferred.push({
          name: allergen,
          matchedText: synonym,
          source: "ingredients",
          confidence: 0.6,
        });
        break;
      }
    }
  }

  return inferred;
}

export function inferAllergensFromText(input: {
  labelText?: string;
  ingredients?: string | string[];
}): InferredAllergen[] {
  const text = `${input.labelText ?? ""} ${toPlainIngredients(input.ingredients)}`.trim();
  if (!text) {
    return [];
  }

  const doc = nlp(text);
  const normalized = doc.normalize({ case: true, whitespace: true }).out("text");

  const inferred: InferredAllergen[] = [];
  const seen = new Set<string>();

  for (const rule of ALLERGEN_REGEX_RULES) {
    const matches = normalized.match(rule.pattern);
    if (!matches) continue;

    const matchArray = Array.isArray(matches) ? matches : [matches];
    for (const match of matchArray) {
      const matchedText = typeof match === "string" ? match : match[0];
      const key = `${rule.allergen}:${matchedText}:${rule.negated ? "1" : "0"}`;
      if (seen.has(key)) continue;
      seen.add(key);

      inferred.push({
        name: rule.allergen,
        matchedText,
        source: rule.source,
        negated: rule.negated,
        confidence: rule.confidence ?? (rule.negated ? 0.4 : 0.7),
      });
    }
  }

  const ingredientInferred = detectFromIngredients(toPlainIngredients(input.ingredients));
  for (const detection of ingredientInferred) {
    const key = `${detection.name}:${detection.matchedText}:ingredient`;
    if (!seen.has(key)) {
      inferred.push(detection);
      seen.add(key);
    }
  }

  return inferred;
}

function shouldSuppressDueToNegation(inferred: InferredAllergen, context: string): boolean {
  if (!inferred.negated) return false;

  const window = context
    .substring(Math.max(0, context.indexOf(inferred.matchedText) - 40), context.indexOf(inferred.matchedText) + 40)
    .toLowerCase();

  return NEGATION_TERMS.some((term) => window.includes(term));
}

export function getAllergenVariations(allergen: string): string[] {
  return expandAllergenSynonyms(allergen.toLowerCase());
}

export function detectAndValidateAllergens(input: AllergenDetectionInput): AllergenDetectionResult {
  const issues: Issue[] = [];
  const labelText = input.labelText ?? "";
  const normalizedLabel = labelText.toLowerCase();

  const declaredAllergens = dedupe([
    ...(input.declaredAllergens ?? []),
    ...(input.allergens ?? []),
  ]);

  const containsInfo = parseContainsStatement(input.containsStatement);
  const declaredByContains = containsInfo.declaredAllergens;

  const declaredSet = new Set([
    ...declaredAllergens.map(normalize),
    ...declaredByContains.map(normalize),
  ]);

  const inferred = inferAllergensFromText({
    labelText: input.labelText,
    ingredients: input.ingredients,
  });

  const contextText = `${labelText} ${toPlainIngredients(input.ingredients)}`.toLowerCase();

  const detectedAllergens: string[] = [];

  for (const allergen of MAJOR_US_ALLERGENS) {
    const variations = getAllergenVariations(allergen);
    if (variations.some((variant) => normalizedLabel.includes(variant.toLowerCase()))) {
      inferred.push({
        name: allergen,
        matchedText: allergen,
        source: "labelText",
        confidence: 0.5,
      });
    }
  }

  for (const detection of inferred) {
    const canonical = detection.name.toLowerCase();
    const suppressedByNegation = shouldSuppressDueToNegation(detection, contextText);
    const isNegated = detection.negated || suppressedByNegation;

    if (containsInfo.declaresNone && detection.source !== "containsStatement") {
      continue;
    }

    if (isNegated) {
      continue;
    }

    if (!detectedAllergens.includes(canonical)) {
      detectedAllergens.push(canonical);
    }

    if (!declaredSet.has(canonical)) {
      const hint =
        input.glutenFree && canonical === "wheat"
          ? "Product marked gluten-free but wheat was detected. Verify formulation or update glutenFree flag."
          : "Add to 'allergens' array or 'containsStatement'.";
      issues.push({
        id: "ALLERGEN_MISSING",
        category: "allergen",
        severity: "high",
        message: `Detected undeclared allergen: ${detection.name}`,
        hint,
        regulationRef: "US 21 CFR 101.4; FALCPA",
      });
    }
  }

  const hasIngredientsKeyword =
    (input.labelText || "").toLowerCase().includes("ingredient") ||
    toPlainIngredients(input.ingredients).toLowerCase().includes("ingredient");
  const hasContainsStatement =
    Boolean(input.containsStatement) ||
    (input.labelText ? input.labelText.toLowerCase().includes("contains") : false);

  if (hasIngredientsKeyword && !hasContainsStatement && detectedAllergens.length > 0) {
    issues.push({
      id: "CONTAINS_SECTION_MISSING",
      category: "format",
      severity: "low",
      message: "Detected allergens but no 'Contains' statement is present.",
      hint: "Add a 'Contains:' statement to clearly declare major allergens.",
    });
  }

  return {
    detectedAllergens: dedupe(detectedAllergens),
    declaredAllergens: dedupe([...declaredAllergens, ...declaredByContains]),
    inferred,
    issues,
  };
}

export function overrideDetectedWithContainsStatement(
  result: AllergenDetectionResult,
  containsInfo: ContainsStatementParse
): AllergenDetectionResult {
  if (!containsInfo.raw) {
    return result;
  }

  if (containsInfo.declaresNone) {
    return {
      ...result,
      detectedAllergens: [],
      issues: [],
    };
  }

  const declaredSet = new Set(result.declaredAllergens);
  for (const allergen of containsInfo.declaredAllergens) {
    if (!declaredSet.has(allergen)) {
      result.declaredAllergens.push(allergen);
      declaredSet.add(allergen);
    }
  }

  return {
    ...result,
    issues: result.issues.filter((issue) => {
      if (issue.id !== "ALLERGEN_MISSING") return true;
      return containsInfo.declaredAllergens.every(
        (declared) => !issue.message.toLowerCase().includes(declared.toLowerCase())
      );
    }),
  };
}

