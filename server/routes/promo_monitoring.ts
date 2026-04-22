import { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { getConsolidatedMonitoring, getCustomerTransactionsDetail } from "../promo_service";
import { getEffectiveBranch } from "./utils";
import { log } from "../logger";

export function registerPromoMonitoringRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Consolidated Monitoring
  app.get("/api/promo/monitoring", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) return res.json([]);
      res.json(await getConsolidatedMonitoring(bId));
    } catch (err: any) {
      log(`Error in GET /api/promo/monitoring: ${err.message}`);
      res.status(500).json({ message: "Gagal memuat monitoring.", details: err.message });
    }
  });

  // 2. Customer Detail
  app.get("/api/promo/monitoring/:pelangganId", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) return res.status(403).json({ message: "No branch access" });
      res.json(await getCustomerTransactionsDetail(bId, parseInt(String(req.params.pelangganId))));
    } catch (err: any) {
      log(`Error in GET /api/promo/monitoring/${req.params.pelangganId}: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });
}
