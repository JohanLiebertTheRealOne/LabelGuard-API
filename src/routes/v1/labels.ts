import { Router } from "express";
import { validate } from "../../controllers/labelsController.js";
import { apiKeyAuth } from "../../middleware/apiKeyAuth.js";
import { rateLimitPerKey } from "../../middleware/rateLimitPerKey.js";

const router = Router();

router.post("/validate", apiKeyAuth, rateLimitPerKey, validate);

export default router;
