import { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../auth";
import { z } from "zod";
import { db } from "../db";
import { eq, and, or, isNull, sql, desc, inArray } from "drizzle-orm";
import { log } from "../logger";
import { 
  promoBrands, promoMasters, pelangganProgram, salesCustomers, 
  pointSaldo, cuttingProgress, cuttingMaster, paketProgress, 
  promoHasil, transaksiPromo, cashbackMaster, paketMaster, paketTier,
  insertPromoBrandSchema, insertPromoMasterSchema, insertPelangganProgramSchema
} from "@shared/schema";
import { recalculateCustomerPromos } from "../promo_service";
import { getEffectiveBranch } from "./utils";

export function registerPelangganProgramRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Pelanggan Program (Enrollment)
  app.get("/api/pelanggan-program", requireAuth, async (req, res) => {
    try {
      const pelangganId = Number(req.query.pelangganId);
      if (isNaN(pelangganId)) return res.status(400).json({ message: "Invalid pelangganId" });
      const branchIdRaw = req.query.branchId as string;
      const branchId = (branchIdRaw && branchIdRaw !== "undefined" && branchIdRaw !== "null") ? Number(branchIdRaw) : undefined;
      const brandCodeRaw = req.query.brandCode as string;
      const brandCode = (brandCodeRaw && brandCodeRaw !== "undefined" && brandCodeRaw !== "null") ? brandCodeRaw : undefined;
      
      res.json(await storage.getPelangganPrograms(pelangganId, branchId, brandCode));
    } catch (err: any) {
      log(`Error in GET /api/pelanggan-program: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/pelanggan-program", requireAuth, requirePermission(["program_pelanggan"], "input"), async (req, res) => {
    try {
      const parse = insertPelangganProgramSchema.safeParse(req.body);
      if (!parse.success) return res.status(400).json(parse.error);
      
      const payload = parse.data;
      const userBranchId = (req.user as any)?.branchId;
      const targetBranchId = payload.branchId || userBranchId;

      const existing = await storage.getPelangganPrograms(payload.pelangganId, targetBranchId || undefined, payload.brandCode);
      if (existing.some(p => p.jenisProgram === payload.jenisProgram && p.referensiId === payload.referensiId && p.brandCode === payload.brandCode)) {
        return res.status(400).json({ message: "Program sudah diikuti" });
      }

      const program = await storage.createPelangganProgram({ 
        ...payload, 
        branchId: targetBranchId,
        jenisProgram: payload.jenisProgram as any,
        status: payload.status as any
      });
      await recalculateCustomerPromos(program.pelangganId, program.branchId!, program.brandCode);
      broadcast("/api/pelanggan-program");
      res.status(201).json(program);
    } catch (err: any) {
      log(`Error in POST /api/pelanggan-program: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  app.delete("/api/pelanggan-program/:id", requireAuth, requirePermission(["program_pelanggan"], "delete"), async (req, res) => {
    try {
      await storage.deletePelangganProgram(Number(req.params.id));
      broadcast("/api/pelanggan-program");
      res.sendStatus(204);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/pelanggan-program/:id", requireAuth, requirePermission(["program_pelanggan"], "edit"), async (req, res) => {
    try {
      const program = await storage.updatePelangganProgram(Number(req.params.id), req.body);
      broadcast("/api/pelanggan-program");
      res.json(program);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // 2. Recap & Summary
  app.get("/api/pelanggan-program/global-summary", requireAuth, async (req, res) => {
    try {
      const branchIdRaw = req.query.branchId as string;
      const branchId = (branchIdRaw && branchIdRaw !== "undefined" && branchIdRaw !== "null") ? Number(branchIdRaw) : undefined;
      const branchCondition = branchId ? sql`AND (
        EXISTS (SELECT 1 FROM pelanggan_program pp WHERE pp.pelanggan_id = c.id AND pp.status = 'aktif' AND pp.branch_id = ${branchId}) OR
        EXISTS (SELECT 1 FROM pelanggan_program_principal ppp WHERE ppp.pelanggan_id = c.id AND ppp.status = 'aktif' AND ppp.branch_id = ${branchId})
      )` : sql``;
      
      const summaryQuery = sql`
        SELECT 
          c.id AS "pelangganId",
          c.name AS "pelangganNama",
          c.code AS "pelangganKode",
          (
            (SELECT COUNT(*) FROM pelanggan_program pp WHERE pp.pelanggan_id = c.id AND pp.status = 'aktif') +
            (SELECT COUNT(*) FROM pelanggan_program_principal ppp WHERE ppp.pelanggan_id = c.id AND ppp.status = 'aktif')
          )::int AS "programCount",
          GREATEST(
            COALESCE((SELECT MAX(tgl_mulai) FROM pelanggan_program pp WHERE pp.pelanggan_id = c.id AND pp.status = 'aktif'), '1970-01-01'::timestamp),
            COALESCE((SELECT MAX(created_at) FROM pelanggan_program_principal ppp WHERE ppp.pelanggan_id = c.id AND ppp.status = 'aktif'), '1970-01-01'::timestamp)
          ) AS "lastUpdate"
        FROM sales_customers c
        WHERE (
            (SELECT COUNT(*) FROM pelanggan_program pp WHERE pp.pelanggan_id = c.id AND pp.status = 'aktif') +
            (SELECT COUNT(*) FROM pelanggan_program_principal ppp WHERE ppp.pelanggan_id = c.id AND ppp.status = 'aktif')
        ) > 0
        ${branchCondition}
        ORDER BY "lastUpdate" DESC
      `;
      
      const summary = await db.execute(summaryQuery);
      res.json(summary.rows);
    } catch (err: any) {
      log(`Error in GET /api/pelanggan-program/global-summary: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/pelanggan-program/recap/:pelangganId", requireAuth, async (req, res) => {
    try {
      const pelangganId = parseInt(String(req.params.pelangganId));
      const branchIdRaw = req.query.branchId as string;
      const branchId = (branchIdRaw && branchIdRaw !== "undefined" && branchIdRaw !== "null") ? Number(branchIdRaw) : undefined;
      const brandCodeRaw = req.query.brandCode as string;
      const brandCode = (brandCodeRaw && brandCodeRaw !== "undefined" && brandCodeRaw !== "null") ? brandCodeRaw : undefined;

      // 1. Get Points Progress
      const pointsData = await db.select().from(pointSaldo).where(and(
        eq(pointSaldo.pelangganId, pelangganId),
        brandCode ? eq(pointSaldo.brandCode, brandCode) : undefined,
        branchId ? eq(pointSaldo.branchId, branchId) : undefined
      ));
      const totalPoints = pointsData.reduce((sum, p) => sum + Number(p.saldoPoin), 0);

      // 2. Get Cutting Progress
      const cutting = await db.select({
        id: cuttingProgress.id,
        totalLabel: cuttingProgress.totalLabel,
        totalNilai: cuttingProgress.totalNilai,
        nama: cuttingMaster.nama,
        nilaiPerLabel: cuttingMaster.nilaiPerLabel,
        brandCode: cuttingMaster.brandCode,
        statusCair: cuttingProgress.statusCair
      })
      .from(cuttingProgress)
      .innerJoin(cuttingMaster, eq(cuttingProgress.cuttingId, cuttingMaster.id))
      .where(and(
        eq(cuttingProgress.pelangganId, pelangganId),
        brandCode ? eq(cuttingMaster.brandCode, brandCode) : undefined,
        branchId ? eq(cuttingProgress.branchId, branchId) : undefined
      ));

      // 3. Get Paket Progress
      const pakets = await db.query.paketProgress.findMany({
        where: and(
          eq(paketProgress.pelangganId, pelangganId),
          branchId ? eq(paketProgress.branchId, branchId) : undefined
        ),
        with: {
          paket: { with: { tiers: true } },
          currentTier: true
        }
      }).then(res => res.filter(p => !brandCode || p.paket.brandCode === brandCode));

      // 4. Get Cashback Summary
      const cashback = await db.select({
        cashbackId: promoHasil.cashbackId,
        nama: cashbackMaster.nama,
        totalNilai: sql<string>`sum(${promoHasil.nilaiCashback})`,
        countTransactions: sql<number>`count(*)`
      })
      .from(promoHasil)
      .innerJoin(transaksiPromo, eq(promoHasil.transaksiId, transaksiPromo.id))
      .innerJoin(cashbackMaster, eq(promoHasil.cashbackId, cashbackMaster.id))
      .where(and(
        eq(transaksiPromo.pelangganId, pelangganId),
        brandCode ? eq(cashbackMaster.brandCode, brandCode) : undefined,
        branchId ? eq(transaksiPromo.branchId, branchId) : undefined
      ))
      .groupBy(promoHasil.cashbackId, cashbackMaster.nama);

      res.json({
        points: { saldoPoin: totalPoints.toString(), totalDiperoleh: "0", totalDitukar: "0", brandCode: brandCode || "SEMUA MEREK" },
        cutting,
        pakets: pakets.map(p => {
          const tiers = p.paket.tiers.sort((a,b) => a.urutanTier - b.urutanTier);
          const progress = p.paket.basisType === 'qty' ? Number(p.totalQty) : Number(p.totalNilai);
          let nextTier = null;
          if (p.currentTierId) {
             const higher = tiers.filter(t => t.urutanTier > (p.currentTier?.urutanTier || 0));
             if (higher.length > 0) nextTier = higher[0];
          } else if (tiers.length > 0) {
             nextTier = tiers[0];
          }
          return {
             ...p,
             progressValue: progress,
             nextTier,
             targetValue: nextTier ? Number(nextTier.minValue) : null
          };
        }),
        cashback
      });
    } catch (err: any) {
      log(`Error in GET /api/pelanggan-program/recap: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });
}
