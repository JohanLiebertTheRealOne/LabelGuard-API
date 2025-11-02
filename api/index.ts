/**
 * Vercel serverless function entry point
 * This file exports the Express app for Vercel's serverless function environment
 * 
 * Vercel will automatically detect and use this file as the serverless function handler.
 * Make sure all environment variables are set in Vercel's dashboard.
 */

import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { loadConfig } from "../src/config/env.js";
import { buildExpressApp } from "../src/server.js";

// Load configuration once at module initialization
// This runs when the serverless function is first invoked (cold start)
let app: ReturnType<typeof buildExpressApp> | null = null;
let initError: Error | null = null;

/**
 * Initialize the Express app (lazy initialization with caching)
 * The app is cached between invocations in the same execution context
 */
function getApp() {
  // If initialization failed before, return error immediately
  if (initError) {
    throw initError;
  }
  
  if (!app) {
    try {
      // Load configuration first (reads from process.env)
      // This will throw if USDA_API_KEY is missing
      const config = loadConfig();
      
      // Build the Express app with the loaded config
      app = buildExpressApp(config);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error("Failed to initialize app:", err.message);
      console.error("Stack:", err.stack);
      console.error("Environment check:", {
        hasUsdaKey: !!process.env.USDA_API_KEY,
        nodeEnv: process.env.NODE_ENV,
        allEnvKeys: Object.keys(process.env).filter(k => k.includes("USDA") || k.includes("CORS") || k.includes("RATE")),
      });
      
      // Store error so we don't keep trying to initialize
      initError = err;
      throw err;
    }
  }
  return app;
}

/**
 * Vercel serverless function handler
 * This is the entry point that Vercel will call for all requests
 * 
 * @param req - Vercel request object (compatible with Express Request)
 * @param res - Vercel response object (compatible with Express Response)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const expressApp = getApp();
    
    // Ensure the request URL is set correctly for Express routing
    // Vercel rewrites can affect the original URL
    const originalUrl = req.url;
    if (!req.url || req.url.startsWith("/api")) {
      // If URL starts with /api, remove it for Express routing
      req.url = req.url?.replace(/^\/api/, "") || req.url || "/";
    }
    
    // Vercel's request/response objects are compatible with Express
    // Pass them directly to the Express app
    return new Promise<void>((resolve, reject) => {
      try {
        expressApp(req as any, res as any, (err?: any) => {
          if (err) {
            console.error("Express error:", {
              message: err?.message,
              stack: err?.stack,
              url: originalUrl,
            });
            reject(err);
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error("Handler error:", {
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          url: originalUrl,
        });
        reject(err);
      }
    });
  } catch (error) {
    // Handle initialization errors
    const err = error instanceof Error ? error : new Error(String(error));
    console.error("Handler initialization error:", {
      message: err.message,
      stack: err.stack,
      name: err.name,
      url: req.url || "/",
    });
    
    // Return a proper error response
    if (!res.headersSent) {
      res.status(500).json({
        type: "https://labelguard.api/errors/INTERNAL_ERROR",
        title: "Server initialization failed",
        status: 500,
        detail: process.env.NODE_ENV === "production" 
          ? "Server failed to initialize. Check logs for details."
          : err.message,
        instance: req.url || "/",
        code: "INIT_ERROR",
      });
    }
    
    return;
  }
}

