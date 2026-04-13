import { Express } from "express";
import { db } from "../db";
import { eq, and, sql, desc } from "drizzle-orm";
import { 
  paketMaster, paketTier, cashbackMaster, cuttingMaster, 
  pointHadiah, pointRule, pointReward 
} from "@shared/schema";
import { requireAuth, requirePermission } from "../auth";
import { getEffectiveBranch } from "./utils";
import { log } from "../logger";

export function registerPromoMastersRoutes(app: Express, broadcast: (type: string) => void) {
  
  // === 1. PAKET MASTER ===
  app.get("/api/promo/masters/paket", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) return res.json([]);
      const brand = req.query.brandCode as string;
      
      const conditions = [eq(paketMaster.branchId, bId)];
      if (brand && brand !== 'SEMUA') conditions.push(eq(paketMaster.brandCode, brand));
      
      const results = await db.query.paketMaster.findMany({
        where: and(...conditions),
        with: { tiers: true },
        orderBy: [desc(paketMaster.id)]
      });
      res.json(results);
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/paket: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters/paket", requireAuth, requirePermission(["promo_toko", "master_promo"], "input"), async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const { tiers, ...paketData } = req.body;
      
      const result = await db.transaction(async (tx) => {
        const [paket] = await tx.insert(paketMaster).values({ 
          ...paketData, 
          branchId: bId,
          status: paketData.status || 'aktif'
        }).returning();

        if (tiers && Array.isArray(tiers)) {
          const tierValues = tiers.map((t: any) => ({
            ...t,
            paketId: paket.id,
            branchId: bId
          }));
          if (tierValues.length > 0) await tx.insert(paketTier).values(tierValues);
        }
        return paket;
      });

      broadcast("/api/promo/masters/paket");
      res.status(201).json(result);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/paket: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/promo/masters/paket/:id", requireAuth, requirePermission(["promo_toko", "master_promo"], "edit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const bId = getEffectiveBranch(req);
      const { tiers, ...paketData } = req.body;

      const result = await db.transaction(async (tx) => {
        const [paket] = await tx.update(paketMaster)
          .set({ ...paketData, updatedAt: new Date() } as any)
          .where(and(eq(paketMaster.id, id), eq(paketMaster.branchId, bId || 0)))
          .returning();

        if (tiers && Array.isArray(tiers)) {
          await tx.delete(paketTier).where(eq(paketTier.paketId, id));
          const tierValues = tiers.map((t: any) => ({
            ...t,
            paketId: id,
            branchId: bId
          }));
          if (tierValues.length > 0) await tx.insert(paketTier).values(tierValues);
        }
        return paket;
      });

      broadcast("/api/promo/masters/paket");
      res.json(result);
    } catch (err: any) {
      log(`Error in PATCH /api/promo/masters/paket/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/promo/masters/paket/:id", requireAuth, requirePermission(["promo_toko", "master_promo"], "delete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const bId = getEffectiveBranch(req);
      await db.delete(paketMaster).where(and(eq(paketMaster.id, id), eq(paketMaster.branchId, bId || 0)));
      broadcast("/api/promo/masters/paket");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/paket/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // === 2. CASHBACK MASTER ===
  app.get("/api/promo/masters/cashback", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) return res.json([]);
      const brand = req.query.brandCode as string;
      
      const conditions = [eq(cashbackMaster.branchId, bId)];
      if (brand && brand !== 'SEMUA') conditions.push(eq(cashbackMaster.brandCode, brand));
      
      const results = await db.select().from(cashbackMaster).where(and(...conditions)).orderBy(desc(cashbackMaster.id));
      res.json(results);
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/cashback: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters/cashback", requireAuth, requirePermission(["promo_toko", "master_promo"], "input"), async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const [cashback] = await db.insert(cashbackMaster).values({ ...req.body, branchId: bId }).returning();
      broadcast("/api/promo/masters/cashback");
      res.status(201).json(cashback);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/cashback: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/promo/masters/cashback/:id", requireAuth, requirePermission(["promo_toko", "master_promo"], "edit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const bId = getEffectiveBranch(req);
      const [cashback] = await db.update(cashbackMaster).set(req.body).where(and(eq(cashbackMaster.id, id), eq(cashbackMaster.branchId, bId || 0))).returning();
      broadcast("/api/promo/masters/cashback");
      res.json(cashback);
    } catch (err: any) {
      log(`Error in PATCH /api/promo/masters/cashback/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/promo/masters/cashback/:id", requireAuth, requirePermission(["promo_toko", "master_promo"], "delete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const bId = getEffectiveBranch(req);
      await db.delete(cashbackMaster).where(and(eq(cashbackMaster.id, id), eq(cashbackMaster.branchId, bId || 0)));
      broadcast("/api/promo/masters/cashback");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/cashback/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // === 3. CUTTING MASTER ===
  app.get("/api/promo/masters/cutting", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) return res.json([]);
      const brand = req.query.brandCode as string;
      
      const conditions = [eq(cuttingMaster.branchId, bId)];
      if (brand && brand !== 'SEMUA') conditions.push(eq(cuttingMaster.brandCode, brand));
      
      const results = await db.select().from(cuttingMaster).where(and(...conditions)).orderBy(desc(cuttingMaster.id));
      res.json(results);
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/cutting: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters/cutting", requireAuth, requirePermission(["promo_toko", "master_promo"], "input"), async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const [cutting] = await db.insert(cuttingMaster).values({ ...req.body, branchId: bId }).returning();
      broadcast("/api/promo/masters/cutting");
      res.status(201).json(cutting);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/cutting: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/promo/masters/cutting/:id", requireAuth, requirePermission(["promo_toko", "master_promo"], "edit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const bId = getEffectiveBranch(req);
      const [cutting] = await db.update(cuttingMaster).set(req.body).where(and(eq(cuttingMaster.id, id), eq(cuttingMaster.branchId, bId || 0))).returning();
      broadcast("/api/promo/masters/cutting");
      res.json(cutting);
    } catch (err: any) {
      log(`Error in PATCH /api/promo/masters/cutting/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/promo/masters/cutting/:id", requireAuth, requirePermission(["promo_toko", "master_promo"], "delete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const bId = getEffectiveBranch(req);
      await db.delete(cuttingMaster).where(and(eq(cuttingMaster.id, id), eq(cuttingMaster.branchId, bId || 0)));
      broadcast("/api/promo/masters/cutting");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/cutting/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // === 4. POINT HADIAH MASTER ===
  app.get("/api/promo/masters/point-hadiah", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) return res.json([]);
      
      const results = await db.query.pointHadiah.findMany({
        where: eq(pointHadiah.branchId, bId),
        with: { rules: true, rewards: true },
        orderBy: [desc(pointHadiah.id)]
      });
      res.json(results);
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/point-hadiah: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters/point-hadiah", requireAuth, requirePermission(["promo_toko", "master_promo"], "input"), async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const { rules, rewards, ...progData } = req.body;
      
      const result = await db.transaction(async (tx) => {
        const [prog] = await tx.insert(pointHadiah).values({ ...progData, branchId: bId }).returning();

        if (rules && Array.isArray(rules)) {
          const ruleValues = rules.map((r: any) => ({ ...r, programId: prog.id, branchId: bId }));
          if (ruleValues.length > 0) await tx.insert(pointRule).values(ruleValues);
        }
        if (rewards && Array.isArray(rewards)) {
          const rewardValues = rewards.map((r: any) => ({ ...r, programId: prog.id, branchId: bId }));
          if (rewardValues.length > 0) await tx.insert(pointReward).values(rewardValues);
        }
        return prog;
      });

      broadcast("/api/promo/masters/point-hadiah");
      res.status(201).json(result);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/point-hadiah: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.put("/api/promo/masters/point-hadiah/:id", requireAuth, requirePermission(["promo_toko", "master_promo"], "edit"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const bId = getEffectiveBranch(req);
      const { rules, rewards, ...progData } = req.body;

      const result = await db.transaction(async (tx) => {
        const [prog] = await tx.update(pointHadiah).set({ ...progData, updatedAt: new Date() } as any).where(and(eq(pointHadiah.id, id), eq(pointHadiah.branchId, bId || 0))).returning();

        await tx.delete(pointRule).where(eq(pointRule.programId, id));
        if (rules && Array.isArray(rules)) {
          const ruleValues = rules.map((r: any) => ({ ...r, programId: id, branchId: bId }));
          if (ruleValues.length > 0) await tx.insert(pointRule).values(ruleValues);
        }

        await tx.delete(pointReward).where(eq(pointReward.programId, id));
        if (rewards && Array.isArray(rewards)) {
          const rewardValues = rewards.map((r: any) => ({ ...r, programId: id, branchId: bId }));
          if (rewardValues.length > 0) await tx.insert(pointReward).values(rewardValues);
        }
        return prog;
      });

      broadcast("/api/promo/masters/point-hadiah");
      res.json(result);
    } catch (err: any) {
      log(`Error in PUT /api/promo/masters/point-hadiah/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/promo/masters/point-hadiah/:id", requireAuth, requirePermission(["promo_toko", "master_promo"], "delete"), async (req, res) => {
    try {
      const id = parseInt(req.params.id as string);
      const bId = getEffectiveBranch(req);
      await db.delete(pointHadiah).where(and(eq(pointHadiah.id, id), eq(pointHadiah.branchId, bId || 0)));
      broadcast("/api/promo/masters/point-hadiah");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/point-hadiah/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });
}
