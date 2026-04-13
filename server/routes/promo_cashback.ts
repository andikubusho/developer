import { Express } from "express";
import { db } from "../db";
import { eq, and, or, isNull } from "drizzle-orm";
import { cashbackMaster, promoHasil, rewardClaim, insertCashbackMasterSchema } from "@shared/schema";
import { requireAuth } from "../auth";
import { getEffectiveBranch } from "./utils";
import { storage } from "../storage";

import { log } from "../logger";

export function registerPromoCashbackRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. GET ALL
  app.get("/api/promo/masters/cashback", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const brand = req.query.brandCode as string;
      let q = db.select().from(cashbackMaster).$dynamic();
      const cond = [];
      if (bId) cond.push(eq(cashbackMaster.branchId, bId));
      if (brand && brand !== 'SEMUA') cond.push(eq(cashbackMaster.brandCode, brand));
      if (cond.length > 0) q = q.where(and(...cond));
      res.json(await q);
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/cashback: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 2. CREATE
  app.post("/api/promo/masters/cashback", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const data = insertCashbackMasterSchema.parse({ ...req.body, branchId: req.body.branchId || bId });
      const [inserted] = await db.insert(cashbackMaster).values(data as any).returning();
      await storage.recordAuditLog((req.user as any).id, "CREATE", "cashback_master", `Membuat cashback: ${inserted.nama}`, inserted.branchId ?? undefined);
      broadcast("/api/promo/masters/cashback");
      res.json(inserted);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/cashback: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 3. UPDATE/PATCH
  app.patch("/api/promo/masters/cashback/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const bId = getEffectiveBranch(req);
      const data = insertCashbackMasterSchema.partial().parse(req.body);
      const [current] = await db.select().from(cashbackMaster).where(eq(cashbackMaster.id, id)).limit(1);
      if (!current) throw new Error("Cashback tidak ditemukan");
      
      const payload: any = { ...data };
      if (data.status && data.status !== current.status) payload.tanggalNonaktif = data.status === 'nonaktif' ? new Date() : null;

      const [updated] = await db.update(cashbackMaster).set(payload).where(and(eq(cashbackMaster.id, id), bId ? eq(cashbackMaster.branchId, bId) : undefined)).returning();
      broadcast("/api/promo/masters/cashback");
      res.json(updated);
    } catch (err: any) {
      log(`Error in PATCH /api/promo/masters/cashback/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 4. DELETE
  app.delete("/api/promo/masters/cashback/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const bId = getEffectiveBranch(req);
      await db.transaction(async (tx) => {
        const cond = [eq(cashbackMaster.id, id)];
        if (bId) cond.push(or(eq(cashbackMaster.branchId, bId), isNull(cashbackMaster.branchId)) as any);
        const [owner] = await tx.select().from(cashbackMaster).where(and(...cond)).limit(1);
        if (!owner) throw new Error("Cashback tidak ditemukan");

        await tx.delete(promoHasil).where(eq(promoHasil.cashbackId, id));
        await tx.delete(rewardClaim).where(and(eq(rewardClaim.refId, id), eq(rewardClaim.sumber, 'cashback')));
        await tx.delete(cashbackMaster).where(eq(cashbackMaster.id, id));
        await storage.recordAuditLog((req.user as any).id, "DELETE", "cashback_master", `Menghapus cashback: ${owner.nama}`, bId ?? undefined);
      });
      res.json({ success: true });
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/cashback/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });
}
