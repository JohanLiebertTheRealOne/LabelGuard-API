import { Router } from "express";
import { validate } from "../controllers/labelsController.js";
import { strictRateLimiter } from "../middleware/rateLimit.js";
import { validateRequestBody } from "../middleware/validateRequestBody.js";

const router = Router();

router.post("/validate", strictRateLimiter, validateRequestBody, validate);

export default router;

