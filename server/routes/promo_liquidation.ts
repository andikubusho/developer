import { Express } from "express";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { promoInputs, rewardClaim, salesCustomers, promoMasters } from "@shared/schema";
import { requireAuth } from "../auth";
import { getEffectiveBranch } from "./utils";
import { storage } from "../storage";
import { log } from "../logger";

export function registerPromoLiquidationRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Sync Promo Balances (Manual)
  app.post("/api/promo/inputs/sync", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) throw new Error("ID Cabang tidak valid");
      await storage.syncPromoBalances(bId);
      broadcast("/api/promo/inputs");
      res.json({ success: true });
    } catch (err: any) {
      log(`Error in POST /api/promo/inputs/sync: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 2. Liquidate Manual Inputs
  app.post("/api/promo/inputs/liquidate", requireAuth, async (req, res) => {
    try {
      const { ids, metode, tanggalCair, keteranganCash, namaBank, nomorRekening, namaPemilikRekening } = req.body;
      const bId = getEffectiveBranch(req);
      if (!bId) throw new Error("ID Cabang tidak valid");
      if (!ids?.length) throw new Error("Pilih setidaknya satu data");

      await db.transaction(async (tx) => {
        for (const inputId of ids) {
          const results = await tx.select({
            input: promoInputs,
            customer: salesCustomers,
            promo: promoMasters
          })
          .from(promoInputs)
          .innerJoin(salesCustomers, and(eq(promoInputs.customerCode, salesCustomers.code), eq(promoInputs.branchId, salesCustomers.branchId)))
          .leftJoin(promoMasters, eq(promoInputs.promoId, promoMasters.id))
          .where(and(eq(promoInputs.id, Number(inputId)), eq(promoInputs.branchId, bId)))
          .limit(1);

          if (results.length === 0) continue;
          const { input, customer, promo } = results[0];
          if (input.status === 'SELESAI') continue;

          await tx.insert(rewardClaim).values({
            pelangganId: customer.id, 
            sumber: 'cashback' as any, 
            refId: input.id, 
            rewardType: 'cash' as any,
            rewardDesc: `Pencairan Manual: ${promo?.name || 'Promo'}`, 
            jumlah: String(input.calculatedValue),
            tanggalKlaim: new Date(), 
            status: 'selesai' as any, 
            branchId: bId,
            approvedBy: (req.user as any)?.displayName || 'System',
            metodePencairan: (metode || 'cash') as any, 
            tanggalCair: tanggalCair ? new Date(tanggalCair) : new Date(),
            keteranganCash, namaBank, nomorRekening, namaPemilikRekening
          });

          await tx.update(promoInputs).set({ status: 'SELESAI', completionDate: new Date() }).where(eq(promoInputs.id, input.id));
        }
      });
      broadcast("/api/reward");
      res.json({ message: "Pencairan berhasil diproses" });
    } catch (err: any) {
      log(`Error in POST /api/promo/inputs/liquidate: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });
}
