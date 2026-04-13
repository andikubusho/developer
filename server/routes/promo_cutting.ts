import { Express } from "express";
import { db } from "../db";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import { cuttingMaster, cuttingProgress, rewardClaim } from "@shared/schema";
import { requireAuth } from "../auth";
import { getEffectiveBranch } from "./utils";
import { storage } from "../storage";

import { log } from "../logger";

export function registerPromoCuttingRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. GET ALL
  app.get("/api/promo/masters/cutting", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const brand = req.query.brandCode as string;
      let q = db.select().from(cuttingMaster).$dynamic();
      const cond = [];
      if (bId) cond.push(eq(cuttingMaster.branchId, bId));
      if (brand && brand !== 'SEMUA') cond.push(eq(cuttingMaster.brandCode, brand));
      if (cond.length > 0) q = q.where(and(...cond));
      res.json(await q);
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/cutting: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 2. CREATE
  app.post("/api/promo/masters/cutting", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const [inserted] = await db.insert(cuttingMaster).values({ ...req.body, branchId: req.body.branchId || bId }).returning();
      await storage.recordAuditLog((req.user as any).id, "CREATE", "cutting_master", `Membuat master cutting: ${inserted.nama}`, inserted.branchId ?? undefined);
      broadcast("/api/promo/masters/cutting");
      res.json(inserted);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/cutting: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 3. UPDATE/PATCH
  app.patch("/api/promo/masters/cutting/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const bId = getEffectiveBranch(req);
      const [current] = await db.select().from(cuttingMaster).where(eq(cuttingMaster.id, id)).limit(1);
      if (!current) throw new Error("Cutting tidak ditemukan");
      
      const payload: any = { ...req.body };
      if (payload.status && payload.status !== current.status) payload.tanggalNonaktif = payload.status === 'nonaktif' ? new Date() : null;

      const [updated] = await db.update(cuttingMaster).set(payload).where(and(eq(cuttingMaster.id, id), bId ? eq(cuttingMaster.branchId, bId) : undefined)).returning();
      broadcast("/api/promo/masters/cutting");
      res.json(updated);
    } catch (err: any) {
      log(`Error in PATCH /api/promo/masters/cutting/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 4. DELETE
  app.delete("/api/promo/masters/cutting/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const bId = getEffectiveBranch(req);
      await db.transaction(async (tx) => {
        const cond = [eq(cuttingMaster.id, id)];
        if (bId) cond.push(or(eq(cuttingMaster.branchId, bId), isNull(cuttingMaster.branchId)) as any);
        const [owner] = await tx.select().from(cuttingMaster).where(and(...cond)).limit(1);
        if (!owner) throw new Error("Cutting tidak ditemukan");

        await tx.delete(cuttingProgress).where(eq(cuttingProgress.cuttingId, id));
        await tx.delete(rewardClaim).where(and(eq(rewardClaim.refId, id), eq(rewardClaim.sumber, 'cutting')));
        await tx.delete(cuttingMaster).where(eq(cuttingMaster.id, id));
        await storage.recordAuditLog((req.user as any).id, "DELETE", "cutting_master", `Menghapus master cutting: ${owner.nama}`, bId ?? undefined);
      });
      res.json({ success: true });
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/cutting/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });
}
