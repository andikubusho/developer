import { Express } from "express";
import { db } from "../db";
import { eq, and, sql } from "drizzle-orm";
import { pointSaldo, hadiahKatalog, rewardClaim } from "@shared/schema";
import { requireAuth } from "../auth";
import { storage } from "../storage";
import { log } from "../logger";

export function registerPromoRedemptionRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Point Redemption (Tukar Poin)
  app.post("/api/promo/tukar-poin", requireAuth, async (req, res) => {
    try {
      const { pelangganId, hadiahId } = req.body;
      const bId = (req.user as any)?.branchId || (req.body.branchId ? Number(req.body.branchId) : null);
      if (!bId) throw new Error("ID Cabang tidak teridentifikasi");

      await db.transaction(async (tx) => {
        const [saldoArr] = await tx.select().from(pointSaldo).where(and(eq(pointSaldo.pelangganId, pelangganId), eq(pointSaldo.branchId, bId))).limit(1);
        if (!saldoArr) throw new Error("Saldo tidak ditemukan");
        const [giftArr] = await tx.select().from(hadiahKatalog).where(eq(hadiahKatalog.id, hadiahId)).limit(1);
        if (!giftArr) throw new Error("Hadiah tidak ditemukan");

        if (Number(saldoArr.saldoPoin) < Number(giftArr.poinDibutuhkan)) throw new Error("Saldo tidak cukup");
        if (giftArr.stok <= 0) throw new Error("Stok habis");

        await tx.update(pointSaldo).set({ saldoPoin: (Number(saldoArr.saldoPoin) - Number(giftArr.poinDibutuhkan)).toString(), totalDitukar: (Number(saldoArr.totalDitukar) + Number(giftArr.poinDibutuhkan)).toString(), updatedAt: new Date() }).where(eq(pointSaldo.id, saldoArr.id));
        await tx.update(hadiahKatalog).set({ stok: giftArr.stok - 1 }).where(eq(hadiahKatalog.id, hadiahId));
        await tx.insert(rewardClaim).values({ pelangganId, sumber: 'point', refId: pelangganId, rewardType: 'barang', rewardDesc: giftArr.namaHadiah, jumlah: giftArr.poinDibutuhkan.toString(), hadiahId, tanggalKlaim: new Date(), status: 'pending', branchId: bId });
      });
      broadcast("/api/promo");
      res.json({ message: "Penukaran berhasil" });
    } catch (err: any) {
      log(`Error in POST /api/promo/tukar-poin: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });

  // 2. Process Reward Claim (Approve/Selesai/Batal)
  app.post("/api/reward/process", requireAuth, async (req, res) => {
    try {
      const { claimId, action } = req.body;
      const bId = (req.user as any)?.branchId || (req.body.branchId ? Number(req.body.branchId) : null);
      const update: any = { status: action };
      if (action === 'approved') update.approvedBy = (req.user as any)?.displayName || 'System';
      else if (action === 'selesai') update.claimedDate = new Date();

      await db.update(rewardClaim).set(update).where(and(eq(rewardClaim.id, claimId), bId ? eq(rewardClaim.branchId, bId) : sql`TRUE`));
      broadcast("/api/reward");
      res.json({ message: "Status updated" });
    } catch (err: any) {
      log(`Error in POST /api/reward/process: ${err.message}`);
      res.status(400).json({ message: err.message }); 
    }
  });
}
