import type { Request, Response, NextFunction } from "express";
import { createHash } from "crypto";
import stringify from "fast-json-stable-stringify";

/**
 * HTTP Cache middleware
 * Adds ETag, Cache-Control, and Last-Modified headers
 * Handles If-None-Match and If-Modified-Since for 304 responses
 */
export function httpCache(maxAge = 60, staleWhileRevalidate = 300) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to add cache headers
    res.json = function (body: unknown) {
      // Calculate weak ETag (hash of response body)
      const bodyStr = stringify(body);
      const hash = createHash("md5").update(bodyStr).digest("hex");
      const etag = `W/"${hash}"`;

      // Set cache headers
      res.setHeader("ETag", etag);
      res.setHeader(
        "Cache-Control",
        `public, max-age=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
      );

      // Set Last-Modified to current time rounded to minute
      const now = new Date();
      now.setSeconds(0, 0); // Round to minute
      res.setHeader("Last-Modified", now.toUTCString());

      // Check If-None-Match header
      const ifNoneMatch = req.headers["if-none-match"];
      if (ifNoneMatch === etag || ifNoneMatch === `"${hash}"`) {
        res.status(304);
        return res.end();
      }

      // Check If-Modified-Since header
      const ifModifiedSince = req.headers["if-modified-since"];
      if (ifModifiedSince) {
        try {
          const modifiedSince = new Date(ifModifiedSince);
          const lastModified = new Date(res.getHeader("Last-Modified") as string);
          if (lastModified <= modifiedSince) {
            res.status(304);
            return res.end();
          }
        } catch {
          // Invalid date, continue with normal response
        }
      }

      // Send normal response
      return originalJson(body);
    };

    next();
  };
}
