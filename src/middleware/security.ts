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
  const cspReportOnly = process.env.CSP_REPORT_ONLY === "1" || process.env.CSP_REPORT_ONLY === "true";
  
  app.use(
    helmet({
      contentSecurityPolicy: {
        reportOnly: cspReportOnly,
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Allow inline styles for Swagger UI
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow for Swagger UI
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: "no-referrer" },
    })
  );

  // Set Permissions-Policy header separately (Helmet doesn't support it directly)
  app.use((_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "geolocation=(), camera=(), microphone=(), payment=()"
    );
    next();
  });

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

