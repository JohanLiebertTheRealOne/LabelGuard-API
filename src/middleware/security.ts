import type { Express } from "express";
import helmet from "helmet";
import cors from "cors";
import { getConfig } from "../config/env.js";

/**
 * Configure security middleware (Helmet + CORS)
 * Note: This function expects config to be loaded before being called
 */
export function setupSecurity(app: Express): void {
  let config;
  try {
    config = getConfig();
  } catch (error) {
    // Config not loaded yet, use defaults or throw
    throw new Error("Configuration must be loaded before setting up security middleware. Call loadConfig() first.");
  }

  // Helmet for security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow for Swagger UI
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

