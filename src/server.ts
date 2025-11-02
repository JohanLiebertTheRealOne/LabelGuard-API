import express, { type Express } from "express";
import { setupSecurity } from "./middleware/security.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { getConfig } from "./config/env.js";

// Routes
import healthRoutes from "./routes/health.js";
import foodsRoutes from "./routes/foods.js";
import labelsRoutes from "./routes/labels.js";

// Swagger setup
import swaggerUi from "swagger-ui-express";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import yaml from "yaml";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Build and configure Express application
 */
export function buildExpressApp(): Express {
  const app = express();
  const config = getConfig();

  // Trust proxy (if configured)
  if (config.TRUST_PROXY) {
    app.set("trust proxy", true);
  } else {
    app.set("trust proxy", false);
  }

  // Security middleware (Helmet, CORS)
  setupSecurity(app);

  // Request logging (must come early)
  app.use(requestLogger);

  // Body parsing
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true, limit: "1mb" }));

  // Disable X-Powered-By header
  app.disable("x-powered-by");

  // Request ID middleware (already in requestLogger, but ensure it's available)
  app.use((req, _res, next) => {
    if (!req.id) {
      req.id = req.headers["x-request-id"]?.toString() || `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    }
    next();
  });

  // Swagger UI
  try {
    // Handle both local development and Vercel serverless environments
    let openApiContent: string | null = null;
    
    // Try multiple path strategies for serverless compatibility
    const pathAttempts = [
      // Vercel serverless function path
      join(process.cwd(), "src", "docs", "openapi.yaml"),
      // Local development path
      join(__dirname, "docs", "openapi.yaml"),
      // Alternative serverless path
      join(process.cwd(), ".", "src", "docs", "openapi.yaml"),
    ];
    
    for (const attemptPath of pathAttempts) {
      try {
        openApiContent = readFileSync(attemptPath, "utf-8");
        break;
      } catch {
        // Try next path
        continue;
      }
    }
    
    if (!openApiContent) {
      throw new Error(`OpenAPI spec not found. Tried: ${pathAttempts.join(", ")}`);
    }
    
    const openApiSpec = yaml.parse(openApiContent);

    app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "LabelGuard API Documentation",
    }));
  } catch (error) {
    console.warn("Failed to load OpenAPI spec:", error instanceof Error ? error.message : String(error));
    // Continue without Swagger UI in case of errors
    // The API endpoints will still work
  }

  // Root route - API information
  app.get("/", (_req, res) => {
    res.json({
      name: "LabelGuard API",
      version: "1.0.0",
      description: "Production-grade REST API for USDA food search and label validation",
      endpoints: {
        health: "/health",
        foods: "/foods",
        labels: "/labels/validate",
        docs: "/docs",
      },
      documentation: {
        openapi: "/docs",
        postman: "See postman/LabelGuard.postman_collection.json",
      },
    });
  });

  // Health check (no rate limiting)
  app.use("/health", healthRoutes);

  // API routes
  app.use("/foods", foodsRoutes);
  app.use("/labels", labelsRoutes);

  // 404 handler (must come before error handler)
  app.use(notFound);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

