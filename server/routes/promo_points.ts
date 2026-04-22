import { Express } from "express";
import { db } from "../db";
import { eq, and, or, isNull, sql } from "drizzle-orm";
import { 
  pointMaster, pointHadiah, pointRule, pointReward, hadiahKatalog, 
  paketPelanggan, promoPelanggan, rewardClaim,
  insertPointHadiahSchema 
} from "@shared/schema";
import { requireAuth, requirePermission } from "../auth";
import { getEffectiveBranch } from "./utils";
import { storage } from "../storage";

import { log } from "../logger";

export function registerPromoPointRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Point Master CRUD
  app.get("/api/promo/masters/point", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const brand = req.query.brandCode as string;
      let q = db.select().from(pointMaster).$dynamic();
      const cond = [];
      if (bId) cond.push(eq(pointMaster.branchId, bId));
      if (brand && brand !== 'SEMUA') cond.push(eq(pointMaster.brandCode, brand));
      res.json(await (cond.length > 0 ? q.where(and(...cond)) : q));
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/point: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters/point", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const [inserted] = await db.insert(pointMaster).values({ ...req.body, branchId: req.body.branchId || bId }).returning();
      await storage.recordAuditLog((req.user as any).id, "CREATE", "point_master", `Membuat point: ${inserted.nama}`, inserted.branchId ?? undefined);
      res.json(inserted);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/point: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 2. Point Hadiah (New System)
  app.get("/api/promo/masters/point-hadiah", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      let q = db.select().from(pointHadiah).$dynamic();
      if (bId) q = q.where(eq(pointHadiah.branchId, bId));
      const data = await q;
      const withDetails = await Promise.all(data.map(async (p) => {
        const rules = await db.select().from(pointRule).where(eq(pointRule.programId, p.id));
        const rewards = await db.select().from(pointReward).where(eq(pointReward.programId, p.id));
        return { ...p, rules, rewards };
      }));
      res.json(withDetails);
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/point-hadiah: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters/point-hadiah", requireAuth, requirePermission(["promo_toko", "master_promo"], "input"), async (req, res) => {
    try {
      const { rules, rewards, ...body } = req.body;
      const bId = getEffectiveBranch(req);
      const data = insertPointHadiahSchema.parse({ ...body, branchId: req.body.branchId || bId });
      const { id: _, ...insertData } = data as any;
      
      const result = await db.transaction(async (tx) => {
        const [inserted] = await tx.insert(pointHadiah).values(insertData).returning();
        
        if (rules && Array.isArray(rules)) {
          const ruleValues = rules.map((r: any) => ({ ...r, programId: inserted.id, branchId: bId }));
          if (ruleValues.length > 0) await tx.insert(pointRule).values(ruleValues);
        }
        if (rewards && Array.isArray(rewards)) {
          const rewardValues = rewards.map((r: any) => ({ ...r, programId: inserted.id, branchId: bId }));
          if (rewardValues.length > 0) await tx.insert(pointReward).values(rewardValues);
        }
        return inserted;
      });
      
      broadcast("/api/promo/masters/point-hadiah");
      await storage.recordAuditLog((req.user as any).id, "CREATE", "point_hadiah", `Membuat program poin: ${result.namaProgram}`, result.branchId);
      res.json(result);
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
        const [current] = await tx.select().from(pointHadiah).where(and(eq(pointHadiah.id, id), bId ? eq(pointHadiah.branchId, bId) : undefined)).limit(1);
        if (!current) throw new Error("Program poin tidak ditemukan");

        let tanggalNonaktif = current.tanggalNonaktif;
        if (progData.status && progData.status !== current.status) {
          tanggalNonaktif = progData.status === 'nonaktif' ? new Date() : null;
        }

        const [prog] = await tx.update(pointHadiah)
          .set({ ...progData, tanggalNonaktif, branchId: progData.branchId || bId || undefined })
          .where(eq(pointHadiah.id, id))
          .returning();

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
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "point_hadiah", `Update program poin: ${result.namaProgram}`, result.branchId);
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
      
      await db.transaction(async (tx) => {
        const [owner] = await tx.select().from(pointHadiah).where(and(eq(pointHadiah.id, id), bId ? eq(pointHadiah.branchId, bId) : undefined)).limit(1);
        if (!owner) throw new Error("Program poin tidak ditemukan");

        await tx.delete(pointRule).where(eq(pointRule.programId, id));
        await tx.delete(pointReward).where(eq(pointReward.programId, id));
        await tx.delete(pointHadiah).where(eq(pointHadiah.id, id));
        
        await storage.recordAuditLog((req.user as any).id, "DELETE", "point_hadiah", `Menghapus program poin: ${owner.namaProgram}`, bId || undefined);
      });

      broadcast("/api/promo/masters/point-hadiah");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/promo/masters/point-hadiah/${req.params.id}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // 3. Hadiah Katalog
  app.get("/api/promo/hadiah", requireAuth, async (req, res) => {
    try {
      let q = db.select().from(hadiahKatalog).$dynamic();
      const bId = getEffectiveBranch(req);
      if (bId) q = q.where(eq(hadiahKatalog.branchId, bId));
      res.json(await q);
    } catch (err: any) {
      log(`Error in GET /api/promo/hadiah: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  // 4. Mappings
  app.get("/api/promo/masters/mapping-paket", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      res.json(await db.query.paketPelanggan.findMany({ where: bId ? eq(paketPelanggan.branchId, bId) : undefined, with: { pelanggan: true, paket: true } }));
    } catch (err: any) {
      log(`Error in GET /api/promo/masters/mapping-paket: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters/mapping-paket", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const [inserted] = await db.insert(paketPelanggan).values({ ...req.body, tglMulai: new Date(req.body.tglMulai), tglSelesai: req.body.tglSelesai ? new Date(req.body.tglSelesai) : null, branchId: bId }).returning();
      res.json(inserted);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters/mapping-paket: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });
}
