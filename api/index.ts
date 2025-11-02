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

/**
 * Initialize the Express app (lazy initialization with caching)
 * The app is cached between invocations in the same execution context
 */
function getApp() {
  if (!app) {
    try {
      // Load configuration first (reads from process.env)
      loadConfig();
      // Build the Express app
      app = buildExpressApp();
    } catch (error) {
      console.error("Failed to initialize app:", error);
      throw error;
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
  const expressApp = getApp();
  
  // Vercel's request/response objects are compatible with Express
  // Pass them directly to the Express app
  return new Promise<void>((resolve, reject) => {
    expressApp(req as any, res as any, (err?: any) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

