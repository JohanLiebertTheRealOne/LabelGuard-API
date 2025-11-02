import "dotenv/config";
import { loadConfig } from "./config/env.js";
import { buildExpressApp } from "./server.js";
import { logger } from "./middleware/requestLogger.js";

/**
 * Bootstrap the application
 */
async function bootstrap(): Promise<void> {
  try {
    // Load and validate environment configuration
    const config = loadConfig();

    // Build Express app
    const app = buildExpressApp();

    // Start server
    const server = app.listen(config.PORT, () => {
      logger.info(
        {
          port: config.PORT,
          env: config.NODE_ENV,
          nodeVersion: process.version,
        },
        "LabelGuard API started"
      );
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info({ signal }, "Received shutdown signal, draining connections...");

      server.close(() => {
        logger.info("Server closed, exiting");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("Forced shutdown after timeout");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Handle uncaught errors
    process.on("uncaughtException", (error) => {
      logger.error({ error }, "Uncaught exception");
      shutdown("uncaughtException");
    });

    process.on("unhandledRejection", (reason) => {
      logger.error({ reason }, "Unhandled rejection");
      shutdown("unhandledRejection");
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Start the application
bootstrap();

