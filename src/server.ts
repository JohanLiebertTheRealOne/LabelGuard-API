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
    const openApiPath = join(__dirname, "docs", "openapi.yaml");
    const openApiContent = readFileSync(openApiPath, "utf-8");
    const openApiSpec = yaml.parse(openApiContent);

    app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "LabelGuard API Documentation",
    }));
  } catch (error) {
    console.warn("Failed to load OpenAPI spec:", error);
    // Continue without Swagger UI in case of errors
  }

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

