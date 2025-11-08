import type { Issue } from "../domain/validation.js";
import type { MacroSnapshot } from "./claimsValidation.js";

type MarketRule = {
  id: string;
  description: string;
  validate: (input: {
    macros: MacroSnapshot;
    claims: string[];
  }) => Issue | undefined;
};

type MarketConfig = Record<string, MarketRule[]>;

const MARKET_RULES: MarketConfig = {
  US: [
    {
      id: "US_HIGH_PROTEIN_THRESHOLD",
      description: "High protein claims require ≥10g protein per serving in the US.",
      validate: ({ macros, claims }) => {
        if (!claims.includes("high protein")) return undefined;
        const protein = macros.proteinG ?? 0;
        if (protein >= 10) return undefined;
        return {
          id: "US_HIGH_PROTEIN_THRESHOLD",
          category: "claims",
          severity: "medium",
          message: `US market: 'high protein' requires ≥10g protein. Found ${protein.toFixed(1)}g.`,
          hint: "Adjust formulation or claim wording for the US market.",
          regulationRef: "21 CFR 101.54",
        };
      },
    },
    {
      id: "US_LOW_FAT_THRESHOLD",
      description: "Low fat claims require <3g fat per serving in the US.",
      validate: ({ macros, claims }) => {
        if (!claims.includes("low fat")) return undefined;
        const fat = macros.fatG ?? 0;
        if (fat < 3) return undefined;
        return {
          id: "US_LOW_FAT_THRESHOLD",
          category: "claims",
          severity: "medium",
          message: `US market: 'low fat' requires <3g fat. Found ${fat.toFixed(1)}g.`,
          hint: "Reduce fat content or adjust the claim for the US market.",
          regulationRef: "21 CFR 101.62(b)(2)",
        };
      },
    },
  ],
  EU: [
    {
      id: "EU_HIGH_PROTEIN_THRESHOLD",
      description: "High protein claims require ≥20% energy from protein in the EU.",
      validate: ({ macros, claims }) => {
        if (!claims.includes("high protein")) return undefined;
        const protein = macros.proteinG ?? 0;
        const calories = macros.caloriesKcal ?? 0;
        if (protein <= 0 || calories <= 0) {
          return {
            id: "EU_HIGH_PROTEIN_DATA_MISSING",
            category: "claims",
            severity: "medium",
            message: "EU market: cannot calculate protein energy percentage; data missing.",
            hint: "Provide calories and protein per serving for EU validation.",
            regulationRef: "Regulation (EC) 1924/2006",
          };
        }
        const proteinCalories = protein * 4;
        const percentage = (proteinCalories / calories) * 100;
        if (percentage >= 20) return undefined;
        return {
          id: "EU_HIGH_PROTEIN_THRESHOLD",
          category: "claims",
          severity: "medium",
          message: `EU market: 'high protein' requires ≥20% energy from protein. Found ${percentage.toFixed(
            1
          )}%.`,
          hint: "Increase protein or adjust serving size/claim for the EU market.",
          regulationRef: "Regulation (EC) 1924/2006",
        };
      },
    },
  ],
};

export function applyMarketRegulations(input: {
  markets?: string[];
  claims?: string[];
  macros: MacroSnapshot;
}): Issue[] {
  const issues: Issue[] = [];
  const markets = input.markets && input.markets.length > 0 ? input.markets : ["US"];
  const claims = (input.claims || []).map((claim) => claim.toLowerCase());

  for (const market of markets) {
    const rules = MARKET_RULES[market.toUpperCase()];
    if (!rules) continue;
    for (const rule of rules) {
      const issue = rule.validate({ macros: input.macros, claims });
      if (issue) {
        issues.push(issue);
      }
    }
  }

  return issues;
}

export const MARKET_CONFIG = MARKET_RULES;

