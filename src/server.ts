import express, { type Express } from "express";
import { setupSecurity } from "./middleware/security.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFound } from "./middleware/notFound.js";
import { getConfig, type EnvConfig } from "./config/env.js";

// Routes
import healthRoutes from "./routes/health.js";
import foodsRoutes from "./routes/foods.js";
import labelsRoutes from "./routes/labels.js";
import v1Routes from "./routes/v1/index.js";
import { apiVersioning } from "./middleware/versioning.js";
import { abortController } from "./middleware/abortController.js";
import { metricsMiddleware } from "./middleware/metricsMiddleware.js";

// Swagger setup
import swaggerUi from "swagger-ui-express";
import { openApiSpec } from "./docs/openapiSpec.js";

/**
 * Build and configure Express application
 * @param providedConfig - Optional config. If not provided, will try to get from getConfig()
 */
export function buildExpressApp(providedConfig?: EnvConfig): Express {
  const app = express();
  const config = providedConfig || getConfig();

  // Trust proxy (if configured)
  if (config.TRUST_PROXY) {
    app.set("trust proxy", true);
  } else {
    app.set("trust proxy", false);
  }

  // Security middleware (Helmet + CORS)
  setupSecurity(app, config);

  // Request logging (must come early)
  app.use(requestLogger);

  // Metrics middleware (must come after requestLogger but before routes)
  app.use(metricsMiddleware);

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

  // AbortController middleware for request cancellation
  app.use(abortController);

  // Swagger UI - using embedded OpenAPI spec for serverless compatibility
  // Temporarily disable Helmet CSP for Swagger UI routes
  app.use("/docs", (req, res, next) => {
    // Disable CSP for Swagger UI
    res.setHeader("Content-Security-Policy", 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https:; " +
      "connect-src 'self'"
    );
    next();
  });
  
  try {
    const swaggerSpec = JSON.parse(JSON.stringify(openApiSpec));
    
    // Serve Swagger UI assets and setup
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "LabelGuard API Documentation",
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        tryItOutEnabled: true,
      },
    }));
    
    // Optional: serve raw spec JSON for debugging
    app.get("/docs/openapi.json", (_req, res) => {
      res.json(swaggerSpec);
    });
  } catch (error) {
    console.error("Failed to setup Swagger UI:", error instanceof Error ? error.message : String(error));
    // Continue without Swagger UI - API will still work
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

  // API v1 routes (versioned)
  app.use("/v1", apiVersioning, v1Routes);

  // Legacy routes (deprecated - add warning headers)
  app.use("/foods", (req, res, next) => {
    res.setHeader("X-Deprecated", "true");
    res.setHeader("X-Deprecated-Since", "2024-01-01");
    res.setHeader("X-Migration-Path", "/v1/foods");
    res.setHeader("X-API-Version", "1");
    next();
  }, foodsRoutes);

  app.use("/labels", (req, res, next) => {
    res.setHeader("X-Deprecated", "true");
    res.setHeader("X-Deprecated-Since", "2024-01-01");
    res.setHeader("X-Migration-Path", "/v1/labels");
    res.setHeader("X-API-Version", "1");
    next();
  }, labelsRoutes);

  // 404 handler (must come before error handler)
  app.use(notFound);

  // Error handler (must be last)
  app.use(errorHandler);

  return app;
}

