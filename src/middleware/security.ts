import type { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import type { EnvConfig } from "../config/env.js";

/**
 * Configure security middleware (Helmet + CORS)
 * @param app - Express app instance
 * @param config - Environment configuration
 */
export function setupSecurity(app: Express, config: EnvConfig): void {

  // Helmet for security headers
  // Note: CSP is relaxed for /docs to allow Swagger UI to work
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Allow inline styles for Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow for Swagger UI
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS configuration
  if (config.CORS_ORIGIN.length > 0) {
    app.use(
      cors({
        origin: config.CORS_ORIGIN,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      })
    );
  }
}

