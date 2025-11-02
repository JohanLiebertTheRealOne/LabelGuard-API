import { Router } from "express";
import { getHealth, getLiveness, getReadiness } from "../controllers/healthController.js";
import { getMetricsText } from "../utils/metrics.js";

const router = Router();

router.get("/", getHealth);
router.get("/liveness", getLiveness);
router.get("/readiness", getReadiness);
router.get("/metrics", (_req, res) => {
  res.type("text/plain").send(getMetricsText());
});

export default router;

