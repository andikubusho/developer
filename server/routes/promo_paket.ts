import { Express } from "express";
import { db } from "../db";
import { eq, and, or, isNull } from "drizzle-orm";
import { paketMaster, paketTier, paketPelanggan, paketProgress, rewardClaim, insertPaketMasterSchema } from "@shared/schema";
import { requireAuth } from "../auth";
import { getEffectiveBranch } from "./utils";
import { storage } from "../storage";

import { log } from "../logger";

export function registerPromoPaketRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. GET ALL
  app.get("/api/promo/masters/paket", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const brand = req.query.brandCode as string;
      let q = db.select().from(paketMaster).$dynamic();
      const cond = [];
      if (bId) cond.push(eq(paketMaster.branchId, bId));
      if (brand && brand !== 'SEMUA') cond.push(eq(paketMaster.brandCode, brand));
      if (cond.length > 0) q = q.where(and(...cond));
      const data = await q;
      const withTiers = await Promise.all(data.map(async (p) => {
        const tiers = await db.select().from(paketTier).where(eq(paketTier.paketId, p.id)).orderBy(paketTier.urutanTier);
        return { ...p, tiers };
      }));
      res.json(withTiers);
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/paket: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 2. CREATE
  app.post("/api/promo/masters/paket", requireAuth, async (req, res) => {
    try {
      const { tiers, ...body } = req.body;
      const bId = getEffectiveBranch(req);
      const data = insertPaketMasterSchema.parse({ ...body, branchId: body.branchId || bId });
      const [inserted] = await db.insert(paketMaster).values({ ...data, branchId: data.branchId as number }).returning();
      if (tiers && tiers.length > 0) await db.insert(paketTier).values(tiers.map((t: any) => ({ ...t, paketId: inserted.id })));
      await storage.recordAuditLog((req.user as any).id, "CREATE", "paket_master", `Membuat paket: ${inserted.nama}`, inserted.branchId ?? undefined);
      res.json(inserted);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/paket: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 3. UPDATE/PATCH
  app.patch("/api/promo/masters/paket/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const { tiers, ...body } = req.body;
      const bId = getEffectiveBranch(req);
      const data = insertPaketMasterSchema.partial().parse(body);

      await db.transaction(async (tx) => {
        const [current] = await tx.select().from(paketMaster).where(and(eq(paketMaster.id, id), bId ? eq(paketMaster.branchId, bId) : undefined)).limit(1);
        if (!current) throw new Error("Paket tidak ditemukan");
        
        let tanggalNonaktif = current.tanggalNonaktif;
        if (data.status && data.status !== current.status) tanggalNonaktif = data.status === 'nonaktif' ? new Date() : null;

        await tx.update(paketMaster).set({ ...data, tanggalNonaktif, branchId: data.branchId || bId || undefined }).where(eq(paketMaster.id, id));
        if (tiers) {
          await tx.delete(paketTier).where(eq(paketTier.paketId, id));
          if (tiers.length > 0) await tx.insert(paketTier).values(tiers.map((t: any) => ({ ...t, paketId: id })));
        }
      });
      broadcast("/api/promo/masters/paket");
      res.json({ success: true });
    } catch (err: any) {
      log(`Error in PATCH /api/promo/masters/paket/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 4. DELETE
  app.delete("/api/promo/masters/paket/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const bId = getEffectiveBranch(req);
      await db.transaction(async (tx) => {
        const [owner] = await tx.select().from(paketMaster).where(and(eq(paketMaster.id, id), bId ? eq(paketMaster.branchId, bId) : undefined)).limit(1);
        if (!owner) throw new Error("Paket tidak ditemukan");
        await tx.delete(paketTier).where(eq(paketTier.paketId, id));
        await tx.delete(paketPelanggan).where(eq(paketPelanggan.paketId, id));
        await tx.delete(paketProgress).where(eq(paketProgress.paketId, id));
        await tx.delete(rewardClaim).where(and(eq(rewardClaim.refId, id), eq(rewardClaim.sumber, 'paket')));
        await tx.delete(paketMaster).where(eq(paketMaster.id, id));
        await storage.recordAuditLog((req.user as any).id, "DELETE", "paket_master", `Menghapus paket: ${owner.nama}`, bId ?? undefined);
      });
      res.json({ success: true });
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/paket/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });
}
