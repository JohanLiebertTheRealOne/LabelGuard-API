import { Router } from "express";
import { getFoods } from "../../controllers/v1/foodsController.js";
import { httpCache } from "../../middleware/httpCache.js";
import { apiKeyAuth } from "../../middleware/apiKeyAuth.js";
import { rateLimitPerKey } from "../../middleware/rateLimitPerKey.js";

const router = Router();

// Apply middleware in order: auth -> rate limit -> cache -> handler
router.get("/", apiKeyAuth, rateLimitPerKey, httpCache(60, 300), getFoods);

export default router;
