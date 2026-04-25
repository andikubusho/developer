// @ts-nocheck
import { Express } from "express";
import { storage } from "../storage";
import { requireAuth, requirePermission } from "../auth";
import { z } from "zod";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { promoIntegratedTransactions, salesCustomers, promoBrands } from "@shared/schema";
import { calculatePromos, saveTransaksiPromo, deleteTransaksiPromo } from "../promo_service";
import { getEffectiveBranch } from "./utils";
import { enrichTransactions } from "./promo_helper";

import { log } from "../logger";

export function registerPromoTransactionRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Calculate Preview
  app.post("/api/promo/calculate", requireAuth, async (req, res) => {
    try {
      const data = z.object({ pelangganId: z.number(), qty: z.number(), nilaiFaktur: z.number(), tglFaktur: z.string(), brandCode: z.string().optional(), selectedPrograms: z.array(z.object({ id: z.number(), jenisProgram: z.string() })).optional() }).parse(req.body);
      const branchId = getEffectiveBranch(req);
      if (!branchId) return res.status(403).json({ message: "Pengguna tidak memiliki akses cabang" });

      const brand = await db.select().from(promoBrands).where(and(eq(sql`LOWER(${promoBrands.name})`, (data.brandCode || 'FERIO').toLowerCase()), eq(promoBrands.branchId, branchId))).limit(1);
      if (brand.length === 0) return res.status(400).json({ message: `Merek '${data.brandCode || 'FERIO'}' tidak terdaftar` });

      const tglDate = new Date(data.tglFaktur);
      if (isNaN(tglDate.getTime())) {
        return res.status(400).json({ message: "Format tanggal tidak valid (tglFaktur)" });
      }

      res.json(await calculatePromos(data.pelangganId, data.qty, data.nilaiFaktur, tglDate, data.brandCode || 'FERIO', branchId, false, null, data.selectedPrograms));
    } catch (err: any) {
      log(`Error in POST /api/promo/calculate: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // 2. Save Transaction
  app.post("/api/promo/save-transaction", requireAuth, async (req, res) => {
    try {
      const data = z.object({ pelangganId: z.number(), noFaktur: z.string(), tglFaktur: z.string(), qty: z.number(), nilaiFaktur: z.number(), brandCode: z.string().optional(), selectedPrograms: z.array(z.object({ id: z.number(), jenisProgram: z.string() })).optional() }).parse(req.body);
      const branchId = getEffectiveBranch(req);
      if (!branchId) return res.status(403).json({ success: false, message: "Pengguna tidak memiliki akses cabang" });
      
      const tglDate = new Date(data.tglFaktur);
      if (isNaN(tglDate.getTime())) {
        return res.status(400).json({ success: false, message: "Format tanggal tidak valid (tglFaktur)" });
      }

      const result = await saveTransaksiPromo(data.pelangganId, data.noFaktur, tglDate, data.qty, data.nilaiFaktur, data.brandCode || 'FERIO', branchId, data.selectedPrograms);
      await storage.recordAuditLog((req.user as any).id, "CREATE", "transaksi_promo_new", `Created promo transaction: ${data.noFaktur}`, branchId);
      broadcast("/api/promo");
      return res.json({ success: true, data: result });
    } catch (err: any) {
      log(`Error in POST /api/promo/save-transaction: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 2b. Edit Transaction (Atomik Delete + Insert)
  app.put("/api/promo/transactions/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      if (isNaN(id)) return res.status(400).json({ success: false, message: "ID Transaksi tidak valid" });
      
      const data = z.object({ pelangganId: z.number(), noFaktur: z.string(), tglFaktur: z.string(), qty: z.number(), nilaiFaktur: z.number(), brandCode: z.string().optional(), selectedPrograms: z.array(z.object({ id: z.number(), jenisProgram: z.string() })).optional() }).parse(req.body);
      const branchId = getEffectiveBranch(req);
      if (!branchId) return res.status(403).json({ success: false, message: "Pengguna tidak memiliki akses cabang" });
      
      const tglDate = new Date(data.tglFaktur);
      if (isNaN(tglDate.getTime())) {
        return res.status(400).json({ success: false, message: "Format tanggal tidak valid (tglFaktur)" });
      }

      const user = req.user as any;
      const isSuperAdmin = ['superadmin', 'root', 'administrator', 'admin'].includes(user?.role?.toLowerCase()) || user?.id === 1;

      // Hapus transaksi lama terlebih dahulu (harus dipastikan berhasil recalculate tanpa memicu error jika belum sepenuhnya diselesaikan)
      await deleteTransaksiPromo(id, branchId, isSuperAdmin);
      
      // Simpan transaksi baru sebagai gantinya (Atomik reinsert dan recalculate up progress)
      const result = await saveTransaksiPromo(data.pelangganId, data.noFaktur, tglDate, data.qty, data.nilaiFaktur, data.brandCode || 'FERIO', branchId, data.selectedPrograms);
      
      await storage.recordAuditLog(user.id, "UPDATE", "transaksi_promo_new", `Updated promo transaction: ${data.noFaktur} (Atomik)`, branchId);
      broadcast("/api/promo");
      return res.json({ success: true, data: result });
    } catch (err: any) {
      log(`Error in PUT /api/promo/transactions/${req.params.id}: ${err.message}`);
      return res.status(500).json({ success: false, message: err.message });
    }
  });

  // 3. Transactions List (ONLY from promo_integrated_transactions)
  app.get("/api/promo/transactions", requireAuth, async (req, res) => {
    try {
      const branchId = getEffectiveBranch(req);
      if (!branchId) return res.json([]);
      
      const pelangganId = req.query.pelangganId ? parseInt(String(req.query.pelangganId)) : undefined;
      
      // Fetch ONLY from Integrated table
      const rawData = await db.select({
          id: promoIntegratedTransactions.id, pelangganId: promoIntegratedTransactions.pelangganId,
          noFaktur: promoIntegratedTransactions.noFaktur, tglFaktur: promoIntegratedTransactions.tanggalFaktur, qty: promoIntegratedTransactions.qty,
          nilaiFaktur: promoIntegratedTransactions.nilaiFaktur, createdAt: promoIntegratedTransactions.createdAt, branchId: promoIntegratedTransactions.branchId,
          actualBranchId: promoIntegratedTransactions.branchId,
          pelangganName: salesCustomers.name, customerCode: salesCustomers.code,
          brandCode: promoBrands.name,
          programAktif: promoIntegratedTransactions.programAktif,
          rewardData: promoIntegratedTransactions.rewardData
      })
      .from(promoIntegratedTransactions)
      .leftJoin(salesCustomers, eq(promoIntegratedTransactions.pelangganId, salesCustomers.id))
      .leftJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
      .where(and(eq(promoIntegratedTransactions.branchId, branchId), pelangganId ? eq(promoIntegratedTransactions.pelangganId, pelangganId) : undefined));

      // Enrich and sort
      const enriched = (await enrichTransactions(rawData, branchId)).map(t => ({ ...t, source: 'integrated' }));
      
      // Sort: Newest first, handle null dates safely
      enriched.sort((a, b) => {
        const timeA = a.tglFaktur ? new Date(a.tglFaktur).getTime() : 0;
        const timeB = b.tglFaktur ? new Date(b.tglFaktur).getTime() : 0;
        return timeB - timeA;
      });

      res.json(enriched);
    } catch (err: any) {
      log(`Error in GET /api/promo/transactions: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  // === PROMO INPUTS (TAP) ===
  app.get("/api/promo/inputs", requireAuth, async (req, res) => {
    try {
      const branchId = getEffectiveBranch(req);
      if (!branchId) return res.json([]);
      
      const filters: any = { branchId };
      if (req.query.startDate) filters.startDate = new Date(String(req.query.startDate));
      if (req.query.endDate) filters.endDate = new Date(String(req.query.endDate));
      if (req.query.customerCode) filters.customerCode = String(req.query.customerCode);
      
      const results = await storage.getPromoInputs(filters);
      res.json(results);
    } catch (err: any) {
      log(`Error in GET /api/promo/inputs: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.post("/api/promo/inputs", requireAuth, requirePermission("promo_toko", "input"), async (req, res) => {
    try {
      const branchId = getEffectiveBranch(req);
      if (!branchId) return res.status(403).json({ message: "No branch access" });
      
      const { insertPromoInputSchema } = await import("@shared/schema");
      const data = insertPromoInputSchema.parse({ ...req.body, branchId });
      const result = await storage.createPromoInput(data);
      
      await storage.recordAuditLog((req.user as any).id, "CREATE", "promo_inputs", `Input promo: ${result.customerCode} - ${result.calculatedValue}`, branchId);
      broadcast("/api/promo/inputs");
      res.status(201).json(result);
    } catch (err: any) {
      log(`Error in POST /api/promo/inputs: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/promo/inputs/:id", requireAuth, requirePermission("promo_toko", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const branchId = getEffectiveBranch(req);
      const { insertPromoInputSchema } = await import("@shared/schema");
      const data = insertPromoInputSchema.partial().parse(req.body);
      const result = await storage.updatePromoInput(id, data);
      
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "promo_inputs", `Update input promo: ${result.customerCode}`, branchId || undefined);
      broadcast("/api/promo/inputs");
      res.json(result);
    } catch (err: any) {
      log(`Error in PATCH /api/promo/inputs/${String(req.params.id)}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.patch("/api/promo/inputs/:id/finish", requireAuth, requirePermission("promo_toko", "edit"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const branchId = getEffectiveBranch(req);
      const result = await storage.updatePromoInput(id, { status: 'SELESAI', completionDate: new Date() });
      
      await storage.recordAuditLog((req.user as any).id, "UPDATE", "promo_inputs", `Finish input promo: ${result.customerCode}`, branchId || undefined);
      broadcast("/api/promo/inputs");
      res.json(result);
    } catch (err: any) {
      log(`Error in PATCH /api/promo/inputs/${String(req.params.id)}/finish: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/promo/inputs/:id", requireAuth, requirePermission("promo_toko", "delete"), async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const branchId = getEffectiveBranch(req);
      await storage.deletePromoInput(id);
      
      await storage.recordAuditLog((req.user as any).id, "DELETE", "promo_inputs", `Delete input promo: ${id}`, branchId || undefined);
      broadcast("/api/promo/inputs");
      res.status(204).send();
    } catch (err: any) {
      log(`Error in DELETE /api/promo/inputs/${String(req.params.id)}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });

  app.delete("/api/promo/transactions/:id", requireAuth, async (req, res) => {
    try {
      const idStr = req.params.id;
      const id = parseInt(String(idStr));
      const branchId = getEffectiveBranch(req);
      
      const user = req.user as any;
      const isSuperAdmin = ['superadmin', 'root', 'administrator', 'admin'].includes(
        user?.role?.toLowerCase()
      ) || user?.id === 1;

      console.log(`[ROUTE-DEBUG] Delete Request: ID String="${idStr}", Parsed ID=${id}, Branch=${branchId}, isSuperAdmin=${isSuperAdmin}`);
      if (!branchId) return res.status(403).json({ message: "Branch ID tidak ditemukan" });

      const result = await deleteTransaksiPromo(id, branchId, isSuperAdmin);
      
      await storage.recordAuditLog(
        (req.user as any).id, 
        "DELETE", 
        "promo_integrated_transactions", 
        `Deleted promo transaction ID ${id}`, 
        branchId
      );

      broadcast("/api/promo");
      res.json({ message: "Transaksi berhasil dihapus" });
    } catch (err: any) {
      log(`Error in DELETE /api/promo/transactions/${String(req.params.id)}: ${err.message}`);
      res.status(400).json({ message: err.message });
    }
  });
}
