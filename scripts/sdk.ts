#!/usr/bin/env node

/**
 * Script to generate TypeScript SDK from OpenAPI spec
 * Uses openapi-typescript-codegen
 * 
 * Usage: npm run generate:sdk
 */

import { execSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";

const openApiPath = join(process.cwd(), "openapi.json");
const outputPath = join(process.cwd(), "sdk");

try {
  // Ensure OpenAPI spec exists
  if (!existsSync(openApiPath)) {
    console.error(`❌ OpenAPI spec not found at ${openApiPath}`);
    console.log("💡 Run 'npm run generate:openapi' first");
    process.exit(1);
  }

  // Generate SDK using openapi-typescript-codegen
  console.log("🔧 Generating TypeScript SDK...");
  execSync(
    `npx openapi-typescript-codegen --input ${openApiPath} --output ${outputPath} --client axios`,
    { stdio: "inherit" }
  );

  console.log(`✅ TypeScript SDK generated at ${outputPath}`);
} catch (error) {
  console.error("❌ Failed to generate SDK:", error);
  process.exit(1);
}
