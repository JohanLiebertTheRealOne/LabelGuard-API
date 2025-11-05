import type { ValidationRequest, Issue } from "../domain/validation.js";

/**
 * Rule function type
 */
export type RuleFunction = (
  request: ValidationRequest,
  context?: Record<string, unknown>
) => Issue[];

/**
 * Rule registry by market
 */
const ruleRegistry = new Map<string, RuleFunction[]>();

/**
 * Register rules for a market
 */
export function registerRules(market: string, rules: RuleFunction[]): void {
  ruleRegistry.set(market, rules);
}

/**
 * Get rules for a market
 */
export function getRules(market: string): RuleFunction[] {
  return ruleRegistry.get(market) || [];
}

/**
 * Execute all rules for given markets
 */
export async function executeRules(
  request: ValidationRequest,
  markets: string[] = ["US"]
): Promise<Issue[]> {
  const allIssues: Issue[] = [];
  const uniqueIssueIds = new Set<string>();

  for (const market of markets) {
    const rules = getRules(market);
    for (const rule of rules) {
      try {
        const issues = rule(request, { market });
        // Deduplicate issues by ID
        for (const issue of issues) {
          if (!uniqueIssueIds.has(issue.id)) {
            uniqueIssueIds.add(issue.id);
            allIssues.push(issue);
          }
        }
      } catch (error) {
        console.error(`Error executing rule for market ${market}:`, error);
      }
    }
  }

  return allIssues;
}

/**
 * Get all registered markets
 */
export function getRegisteredMarkets(): string[] {
  return Array.from(ruleRegistry.keys());
}
