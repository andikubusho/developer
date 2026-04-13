import { Express } from "express";
import { db } from "../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { 
  rewardClaim, paketProgress, pointSaldo, cuttingProgress, 
  promoHasil, promoInputs, cashbackReward,
  principalClaim, principalSubscription,
  pencairanRewards, promoIntegratedTransactions
} from "@shared/schema";
import { requireAuth } from "../auth";
import { getConsolidatedRedemption } from "../promo_service";
import { getEffectiveBranch } from "./utils";
import { log } from "../logger";

export function registerPromoClaimsRoutes(app: Express, broadcast: (type: string) => void) {
  // 1. Reward Dashboard Data
  app.get("/api/reward/dashboard-data", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) return res.json({ history: [], ready: { cashback: [], points: [], labels: [], pakets: [] } });

      const history = await db.query.rewardClaim.findMany({
        where: and(eq(rewardClaim.branchId, bId), eq(rewardClaim.status, 'selesai')),
        with: { pelanggan: true, hadiah: true },
        orderBy: desc(rewardClaim.tanggalKlaim)
      });

      const { items: consolidated, allTransactions } = await getConsolidatedRedemption(bId);
      const ready = { cashback: [] as any[], points: [] as any[], labels: [] as any[], pakets: [] as any[], principals: [] as any[] };

      consolidated.forEach((c: any) => {
        if (c.readyItems.cashback.length > 0) ready.cashback.push(...c.readyItems.cashback);
        if (c.readyItems.points.length > 0) ready.points.push(...c.readyItems.points);
        if (c.readyItems.labels.length > 0) ready.labels.push(...c.readyItems.labels);
        if (c.readyItems.pakets.length > 0) ready.pakets.push(...c.readyItems.pakets);
        if (c.readyItems.principals?.length > 0) ready.principals.push(...c.readyItems.principals);
      });

      res.json({ history, ready, allTransactions });
    } catch (err: any) {
      log(`Error in GET /api/reward/dashboard-data: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });

  // 2. Disburse Reward Item (Tombol "Cairkan Sekarang")
  app.post("/api/reward/disburse-item", requireAuth, async (req, res) => {
    try {
      const { pelangganId, type, refId, amount, desc, branchId, metode, tanggalCair, keteranganCash, namaBank, nomorRekening, namaPemilikRekening, nomorFakturPotong, nilaiFakturPotong } = req.body;
      const bId = branchId || (req.user as any)?.branchId;
      if (!bId) throw new Error("ID Cabang tidak ditemukan");

      await db.transaction(async (tx) => {
        let finalRefId = refId;
        const rewardType = (type === 'point') ? 'barang' : 'cash';
        let sisaRewardValue = 0;

        if (typeof refId === 'string' && refId.includes('_')) {
           const [prefix, actualId] = refId.split('_');
           finalRefId = Number(actualId);
            if (prefix === 'cr') await tx.update(cashbackReward).set({ status: 'dicairkan', updatedAt: new Date() }).where(and(eq(cashbackReward.id, finalRefId), eq(cashbackReward.branchId, bId)));
            else if (prefix === 'mi') await tx.update(promoInputs).set({ status: 'SELESAI', completionDate: new Date() }).where(eq(promoInputs.id, finalRefId));
            else if (prefix === 'pr') await tx.update(pencairanRewards).set({ status: 'selesai' }).where(and(eq(pencairanRewards.id, finalRefId), eq(pencairanRewards.branchId, bId)));
            else if (prefix === 'int') {
                const [txRecord] = await tx.select().from(promoIntegratedTransactions).where(eq(promoIntegratedTransactions.id, finalRefId)).limit(1);
                if (txRecord) {
                    const totalReward = Number(txRecord.rewardNilai || 0);
                    sisaRewardValue = totalReward - Number(amount);
                    await tx.update(promoIntegratedTransactions).set({ 
                        rewardNilai: sisaRewardValue.toString(),
                        statusPencairan: sisaRewardValue <= 0 ? 'sudah_dicairkan' : 'sebagian_dicairkan',
                        updatedAt: new Date() 
                    }).where(and(eq(promoIntegratedTransactions.id, finalRefId), eq(promoIntegratedTransactions.branchId, bId)));
                }
            }
         }

        if (type === 'paket') {
            const [prog] = await tx.select().from(paketProgress).where(eq(paketProgress.id, Number(finalRefId))).limit(1);
            if (prog && Number(amount) > (Number(prog.totalRewardCalculated || 0) - Number(prog.totalRewardClaimed || 0))) throw new Error("Reward melebihi saldo tersedia");
            if (prog) {
               const claimed = (Number(prog.totalRewardClaimed || 0) + Number(amount));
               sisaRewardValue = Number(prog.totalRewardCalculated || 0) - claimed;
               await tx.update(paketProgress).set({ totalRewardClaimed: claimed.toString(), lastClaimDate: new Date(), updatedAt: new Date() }).where(eq(paketProgress.id, Number(finalRefId)));
            }
        }

        if (type === 'point') {
           const [saldo] = await tx.select().from(pointSaldo).where(and(eq(pointSaldo.pelangganId, pelangganId), eq(pointSaldo.branchId, bId))).limit(1);
           if (saldo) {
              sisaRewardValue = Number(saldo.saldoPoin) - Number(amount);
              await tx.update(pointSaldo).set({ saldoPoin: sisaRewardValue.toString(), totalDitukar: (Number(saldo.totalDitukar || 0) + Number(amount)).toString(), updatedAt: new Date() }).where(eq(pointSaldo.id, saldo.id));
           }
        } else if (type === 'principal') {
           const [prefix, actualId] = refId.split('_');
           const finalId = Number(actualId);
           if (prefix === 'pr_claim') {
              await tx.update(principalClaim).set({ status: 'sudah_klaim', tanggalKlaim: new Date(), updatedAt: new Date() }).where(eq(principalClaim.id, finalId));
              sisaRewardValue = 0;
           } else if (prefix === 'pr_sub') {
              const [sub] = await tx.select().from(principalSubscription).where(eq(principalSubscription.id, finalId)).limit(1);
              if (sub) {
                 const claimed = (Number(sub.totalRewardClaimed || 0) + Number(amount));
                 sisaRewardValue = Number(sub.totalRewardCalculated || 0) - claimed;
                 await tx.update(principalSubscription).set({ 
                    totalRewardClaimed: claimed.toString(),
                    lastClaimDate: new Date(),
                    updatedAt: new Date()
                 }).where(eq(principalSubscription.id, finalId));
              }
           }
        }

        await tx.insert(rewardClaim).values({
          pelangganId: Number(pelangganId), sumber: type, refId: Number(finalRefId), rewardType, rewardDesc: desc || `Pencairan ${type}`,
          jumlah: amount.toString(), sisaReward: sisaRewardValue.toString(), tanggalKlaim: new Date(), status: 'selesai', branchId: bId, approvedBy: (req.user as any)?.displayName || 'System',
          metodePencairan: metode || 'cash', tanggalCair: tanggalCair ? new Date(tanggalCair) : new Date(),
          keteranganCash, namaBank, nomorRekening, namaPemilikRekening, nomorFakturPotong, nilaiFakturPotong: nilaiFakturPotong?.toString()
        });
      });
      broadcast("/api/reward");
      res.json({ message: "Pencairan berhasil diproses", success: true });
    } catch (err: any) {
      log(`Error in POST /api/reward/disburse-item: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });

  app.delete("/api/reward/claims/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const [claim] = await db.select().from(rewardClaim).where(eq(rewardClaim.id, id)).limit(1);
      if (!claim) throw new Error("Data tidak ditemukan");

      await db.transaction(async (tx) => {
        if (claim.sumber === 'paket') {
          const [prog] = await tx.select().from(paketProgress).where(eq(paketProgress.id, claim.refId)).limit(1);
          if (prog) await tx.update(paketProgress).set({ totalRewardClaimed: (Number(prog.totalRewardClaimed || 0) - Number(claim.jumlah)).toString(), updatedAt: new Date() }).where(eq(paketProgress.id, claim.refId));
        } else if (claim.sumber === 'point') {
          const [saldo] = await tx.select().from(pointSaldo).where(and(eq(pointSaldo.pelangganId, claim.pelangganId), eq(pointSaldo.branchId, claim.branchId))).limit(1);
          if (saldo) await tx.update(pointSaldo).set({ saldoPoin: (Number(saldo.saldoPoin) + Number(claim.jumlah)).toString(), totalDitukar: (Number(saldo.totalDitukar || 0) - Number(claim.jumlah)).toString(), updatedAt: new Date() }).where(eq(pointSaldo.id, saldo.id));
        } else if (claim.sumber === 'cutting') await tx.update(cuttingProgress).set({ statusCair: 'belum', updatedAt: new Date() }).where(eq(cuttingProgress.id, claim.refId));
        await tx.delete(rewardClaim).where(eq(rewardClaim.id, id));
      });
      broadcast("/api/reward");
      res.json({ success: true });
    } catch (err: any) {
      log(`Error in DELETE /api/reward/claims/${req.params.id}: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });

  // 4. Principal Claims Management
  app.get("/api/reward/principal-claims", requireAuth, async (req, res) => {
    try {
      const bId = getEffectiveBranch(req);
      if (!bId) return res.json([]);

      const claims = await db.query.principalClaim.findMany({
        where: eq(principalClaim.branchId, bId),
        with: {
          principal: true,
          program: true,
          pelanggan: true
        },
        orderBy: [
          sql`CASE 
            WHEN status = 'ditolak' THEN 1 
            WHEN status = 'belum_klaim' THEN 2 
            WHEN status = 'sudah_klaim' THEN 3 
            WHEN status = 'disetujui' THEN 4 
            ELSE 5 
          END ASC`,
          desc(principalClaim.createdAt)
        ]
      });

      res.json(claims);
    } catch (err: any) {
      log(`Error in GET /api/reward/principal-claims: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });

  app.patch("/api/reward/principal-claims/:id/status", requireAuth, async (req, res) => {
    try {
      const id = parseInt(String(req.params.id));
      const { status, catatanDitolak } = req.body;
      const bId = getEffectiveBranch(req);

      const allowedStatusTransitions: Record<string, string[]> = {
        'belum_klaim': ['sudah_klaim'],
        'sudah_klaim': ['disetujui', 'ditolak'],
        'ditolak': ['belum_klaim'], // ajukan ulang
        'disetujui': ['belum_klaim'] // batalkan/revisi
      };

      if (status && !['belum_klaim', 'sudah_klaim', 'disetujui', 'ditolak'].includes(status)) {
        throw new Error("Status tidak valid");
      }

      const [existing] = await db.select().from(principalClaim).where(eq(principalClaim.id, id)).limit(1);
      if (!existing) {
        throw new Error("Data tidak ditemukan");
      }

      // Validate transition if status is changing
      if (status && status !== existing.status) {
        const allowed = allowedStatusTransitions[existing.status] || [];
        if (!allowed.includes(status)) {
           throw new Error(`Transisi status dari ${existing.status} ke ${status} tidak diizinkan`);
        }
      }

      const { nilaiKlaim, rewardPrincipalType, rewardPrincipalDesc, catatanRevisi } = req.body;

      const updateData: any = { 
        updatedAt: new Date() 
      };

      if (status) updateData.status = status;
      if (nilaiKlaim) updateData.nilaiKlaim = String(nilaiKlaim);
      if (rewardPrincipalType) updateData.rewardPrincipalType = rewardPrincipalType;
      if (rewardPrincipalDesc) updateData.rewardPrincipalDesc = rewardPrincipalDesc;
      if (catatanRevisi) updateData.catatanRevisi = catatanRevisi;

      if (status === 'disetujui') {
        updateData.tanggalApproval = new Date();
      } else if (status === 'ditolak') {
        updateData.catatanDitolak = catatanDitolak;
      }

      // Record History
      const user = (req.user as any)?.username || "system";
      const historyLog = JSON.parse(JSON.stringify(existing.riwayatStatus || []));
      historyLog.push({
        status: status || existing.status,
        date: new Date(),
        user: user,
        reason: status === 'ditolak' ? catatanDitolak : catatanRevisi || "Perubahan status"
      });
      updateData.riwayatStatus = historyLog;

      const [updated] = await db.update(principalClaim)
        .set(updateData)
        .where(eq(principalClaim.id, id))
        .returning();

      if (!updated) {
        log(`Principal claim update failed: Claim ID ${id} not found`, "error");
        throw new Error("Gagal memperbarui data");
      }

      broadcast("/api/reward");
      res.json(updated);
    } catch (err: any) {
      log(`Error in PATCH /api/reward/principal-claims/${req.params.id}/status: ${err.message}`);
      res.status(500).json({ message: err.message }); 
    }
  });
}
