import { Router } from "express";
import { validate } from "../controllers/labelsController.js";
import { strictRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/validate", strictRateLimiter, validate);

export default router;

