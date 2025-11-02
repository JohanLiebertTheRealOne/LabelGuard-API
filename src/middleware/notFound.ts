import type { Request, Response, NextFunction } from "express";
import { HttpErrors } from "../utils/http.js";

/**
 * 404 Not Found handler
 */
export function notFound(req: Request, res: Response, next: NextFunction): void {
  const error = HttpErrors.notFound(`Route ${req.method} ${req.path} not found`);
  next(error);
}

