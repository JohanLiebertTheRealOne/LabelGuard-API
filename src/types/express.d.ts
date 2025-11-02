/**
 * Express type extensions
 */
import "express";

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export {};

