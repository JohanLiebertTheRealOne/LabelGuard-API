import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader, ConsoleMetricExporter } from "@opentelemetry/sdk-metrics";

/**
 * Initialize OpenTelemetry tracing
 * Should be called as early as possible in the application lifecycle
 */
export function initTracing(): NodeSDK | null {
  // Only initialize in production or if explicitly enabled
  if (process.env.OTEL_ENABLED !== "true" && process.env.NODE_ENV !== "production") {
    return null;
  }

  try {
    const sdk = new NodeSDK({
      resource: resourceFromAttributes({
        [SEMRESATTRS_SERVICE_NAME]: "labelguard-api",
        [SEMRESATTRS_SERVICE_VERSION]: "1.0.0",
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          // Disable fs instrumentation to reduce noise
          "@opentelemetry/instrumentation-fs": {
            enabled: false,
          },
        }),
      ],
      // Optional: Configure metric reader if needed
      metricReader: process.env.OTEL_EXPORTER_CONSOLE === "true"
        ? new PeriodicExportingMetricReader({
            exporter: new ConsoleMetricExporter(),
            exportIntervalMillis: 30000,
          })
        : undefined,
    });

    sdk.start();
    console.log("OpenTelemetry tracing initialized");

    // Graceful shutdown
    process.on("SIGTERM", () => {
      sdk
        .shutdown()
        .then(() => console.log("OpenTelemetry terminated"))
        .catch((error) => console.error("Error terminating OpenTelemetry", error))
        .finally(() => process.exit(0));
    });

    return sdk;
  } catch (error) {
    console.error("Failed to initialize OpenTelemetry:", error);
    return null;
  }
}
