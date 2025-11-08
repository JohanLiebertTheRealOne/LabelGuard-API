import { createLogger, format, transports } from "winston";

let logger: ReturnType<typeof createLogger> | null = null;

export function getLogger() {
  if (logger) {
    return logger;
  }

  logger = createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: format.combine(
      format.timestamp(),
      format.errors({ stack: true }),
      format.splat(),
      format.printf((info) => {
        const { timestamp, level, message, ...rest } = info;
        const base = {
          timestamp,
          level,
          message,
          ...rest,
        };
        return JSON.stringify(base);
      })
    ),
    defaultMeta: {
      service: "labelguard-api",
    },
    transports: [new transports.Console()],
  });

  return logger;
}

