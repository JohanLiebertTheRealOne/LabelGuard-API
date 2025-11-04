import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      abortSignal?: AbortSignal;
    }
  }
}

/**
 * Middleware to create AbortController for request cancellation
 * Propagates client disconnection to downstream handlers
 */
export function abortController(req: Request, res: Response, next: NextFunction): void {
  const controller = new AbortController();
  req.abortSignal = controller.signal;

  // If client disconnects, abort the signal
  req.on("close", () => {
    if (!res.headersSent) {
      controller.abort();
    }
  });

  // If client aborts the request, abort the signal
  req.on("aborted", () => {
    controller.abort();
  });

  // If response is finished or closed, cleanup
  res.on("close", () => {
    if (!controller.signal.aborted) {
      controller.abort();
    }
  });

  next();
}
