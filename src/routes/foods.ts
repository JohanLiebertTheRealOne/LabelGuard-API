import { Router } from "express";
import { getFoods } from "../controllers/foodsController.js";
import { defaultRateLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.get("/", defaultRateLimiter, getFoods);

export default router;

