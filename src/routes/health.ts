import { Router } from "express";
import { getHealth, getLiveness, getReadiness } from "../controllers/healthController.js";
import { getMetrics } from "../observability/metrics.js";

const router = Router();

router.get("/", getHealth);
router.get("/liveness", getLiveness);
router.get("/readiness", getReadiness);
router.get("/metrics", async (_req, res) => {
  try {
    const metrics = await getMetrics();
    res.type("text/plain").send(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to collect metrics" });
  }
});

export default router;

