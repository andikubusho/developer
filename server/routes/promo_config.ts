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
  promoHasil, transaksiPromo, cashbackMaster, 
  insertPromoBrandSchema, insertPromoMasterSchema, insertPelangganProgramSchema
} from "@shared/schema";
import { recalculateCustomerPromos } from "../promo_service";
import { getEffectiveBranch } from "./utils";

export function registerPromoConfigRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Promo Brands
  app.get("/api/promo/brands", requireAuth, async (req, res) => {
    try {
      res.json(await storage.getPromoBrands(getEffectiveBranch(req) || undefined));
    } catch (err: any) {
      log(`Error in GET /api/promo/brands: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/brands", requireAuth, requirePermission(["promo_toko", "master_merek_promo"], "input"), async (req, res) => {
    try {
      const brand = await storage.createPromoBrand(insertPromoBrandSchema.parse(req.body));
      await storage.recordAuditLog((req.user as any).id, "CREATE", "promo_brands", `Created brand: ${brand.name}`, brand.branchId || undefined);
      broadcast("/api/promo/brands");
      res.status(201).json(brand);
    } catch (err: any) {
      log(`Error in POST /api/promo/brands: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 2. Promo Masters (Generic)
  app.get("/api/promo/masters", requireAuth, async (req, res) => {
    try {
      res.json(await storage.getPromoMasters(getEffectiveBranch(req) || undefined));
    } catch (err: any) {
      log(`Error in GET /api/promo/masters: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/promo/masters", requireAuth, requirePermission(["promo_toko", "master_promo_toko"], "input"), async (req, res) => {
    try {
      const master = await storage.createPromoMaster(insertPromoMasterSchema.parse(req.body));
      await storage.recordAuditLog((req.user as any).id, "CREATE", "promo_masters", `Created master: ${master.name}`, master.branchId || undefined);
      broadcast("/api/promo/masters");
      res.status(201).json(master);
    } catch (err: any) {
      log(`Error in POST /api/promo/masters: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 3. Pelanggan Program (Enrollment)
  app.get("/api/pelanggan-program", requireAuth, async (req, res) => {
    try {
      const pId = Number(req.query.pelangganId);
      if (isNaN(pId)) return res.status(400).json({ message: "Invalid pelangganId" });
      const bId = req.query.branchId ? Number(req.query.branchId) : undefined;
      res.json(await storage.getPelangganPrograms(pId, bId, req.query.brandCode as string));
    } catch (err: any) {
      log(`Error in GET /api/pelanggan-program: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/pelanggan-program", requireAuth, requirePermission(["program_pelanggan"], "input"), async (req, res) => {
    try {
      const payload = insertPelangganProgramSchema.parse(req.body);
      const targetBranchId = payload.branchId || (req.user as any).branchId;
      
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

  // 4. Recap & Summary
  app.get("/api/pelanggan-program/global-summary", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      const summary = await db.select({
        pelangganId: pelangganProgram.pelangganId, pelangganNama: salesCustomers.name, pelangganKode: salesCustomers.code,
        programCount: sql<number>`count(*)`, lastUpdate: sql<string>`max(${pelangganProgram.tglMulai})`
      })
      .from(pelangganProgram).innerJoin(salesCustomers, eq(pelangganProgram.pelangganId, salesCustomers.id))
      .where(bId ? eq(pelangganProgram.branchId, bId) : undefined)
      .groupBy(pelangganProgram.pelangganId, salesCustomers.name, salesCustomers.code);
      res.json(summary);
    } catch (err: any) {
      log(`Error in GET /api/pelanggan-program/global-summary: ${err.message}`);
      res.status(500).json({ message: err.message });
    }
  });
}
