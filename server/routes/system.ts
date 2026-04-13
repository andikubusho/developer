import { Express } from "express";
import { storage } from "../storage";
import { requireAuth } from "../auth";
import { getEffectiveBranch } from "./utils";
import { log } from "../logger";

export async function registerSystemRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Dashboard Stats

  app.get("/api/sales/stats", requireAuth, async (req, res) => {
    try {
      const branchId = req.query.branchId ? parseInt(String(req.query.branchId)) : getEffectiveBranch(req);
      const salesmanId = req.query.salesmanId ? parseInt(String(req.query.salesmanId)) : undefined;
      const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
      const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
      
      const stats = await storage.getSalesStats(branchId || undefined, salesmanId, startDate, endDate);
      res.json(stats);
    } catch (err: any) {
      log(`Error in GET /api/sales/stats: ${err.message}`);
      res.status(500).json({ message: "Gagal memuat statistik penjualan", error: err.message });
    }
  });


  app.get("/api/stats", requireAuth, async (req, res) => {
    try {
      res.json(await storage.getDashboardStats(getEffectiveBranch(req) || undefined));
    } catch (err: any) {
      log(`Error in GET /api/stats: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/stats/summary", requireAuth, async (req, res) => {
    try {
      const salesmanId = req.query.salesmanId ? parseInt(String(req.query.salesmanId)) : undefined;
      const startDate = req.query.startDate ? new Date(String(req.query.startDate)) : undefined;
      const endDate = req.query.endDate ? new Date(String(req.query.endDate)) : undefined;
      
      res.json(await storage.getDashboardSummary(getEffectiveBranch(req) || undefined, salesmanId, startDate, endDate));
    } catch (err: any) {
      log(`Error in GET /api/stats/summary: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 2. App Settings
  app.get("/api/settings", requireAuth, async (req, res) => {
    try {
      res.json(await storage.getAppSettings());
    } catch (err: any) {
      log(`Error in GET /api/settings: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/settings", requireAuth, async (req, res) => {
    try {
      const { key, value } = req.body;
      const setting = await storage.updateAppSetting(key, value);
      broadcast("/api/settings");
      res.json(setting);
    } catch (err: any) {
      log(`Error in POST /api/settings: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 3. Seed App Settings (Logic only, usually runs on boot, but keep route if needed)
  const seedSettings = async () => {
    try {
      const existing = await storage.getAppSettings();
      const defaults = [
        { key: 'app_name', value: 'Monitor Gudang Ferio' },
        { key: 'dashboard_status_done', value: 'Selesai' },
        // ... (rest of the defaults from routes.ts)
      ];
      if (existing.length === 0) {
        for (const s of defaults) await storage.updateAppSetting(s.key, s.value);
      }
    } catch (err: any) {
      log(`Error in seedSettings: ${err.message}`);
    }
  };
  // seedSettings(); // Not called here to avoid double seeding if imported multiple times
}
