#!/usr/bin/env node

/**
 * Script to generate OpenAPI spec from Zod schemas
 * 
 * Note: This is a placeholder. Due to zod-to-openapi compatibility issues with Zod 3.x,
 * manual OpenAPI spec maintenance is currently required.
 * 
 * TODO: Update when zod-to-openapi supports Zod 3.x or use alternative library
 */

import { writeFileSync } from "fs";
import { join } from "path";
import { openApiSpec } from "../src/docs/openapiSpec.js";

const outputPath = join(process.cwd(), "openapi.json");

try {
  // For now, just export the existing spec
  // In the future, this would generate from Zod schemas
  const spec = JSON.stringify(openApiSpec, null, 2);
  writeFileSync(outputPath, spec, "utf-8");
  console.log(`✅ OpenAPI spec written to ${outputPath}`);
} catch (error) {
  console.error("❌ Failed to generate OpenAPI spec:", error);
  process.exit(1);
}
