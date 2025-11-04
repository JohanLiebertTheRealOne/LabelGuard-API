import { Router } from "express";
import foodsRoutes from "./foods.js";
import labelsRoutes from "./labels.js";
import healthRoutes from "./health.js";

const router = Router();

router.use("/foods", foodsRoutes);
router.use("/labels", labelsRoutes);
router.use("/health", healthRoutes);

export default router;
