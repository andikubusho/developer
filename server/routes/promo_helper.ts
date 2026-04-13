import { db } from "../db";
import { eq, and, or, inArray, isNull, desc, sql } from "drizzle-orm";
import { 
  promoHasil, pointLogs, labelQuotas, cuttingMaster, cashbackMaster, pointMaster, 
  paketMaster, principalProgram, principalTier, principalMaster, 
  pelangganProgram, paketProgress, principalSubscription, paketTier, pointSaldo,
  pointHadiah, pointReward, salesCustomers, pencairanRewards, principalClaim
} from "@shared/schema";

export async function enrichTransactions(rawData: any[], effectiveBranchId: number) {
  if (rawData.length === 0) return [];

  const txIds = rawData.map(t => t.id);
  const invNums = rawData.map(t => (t.noFaktur || "").trim()).filter(Boolean);
  const uniquePelangganIds = Array.from(new Set(rawData.map(t => t.pelangganId)));
  const uniqueCustomerCodes = Array.from(new Set(rawData.map(t => (t as any).customerCode).filter(Boolean)));

  // 1. Batch Fetch Rewards & Progress
  const [allCashbacks, allPoints, allLabels, allPelangganProgs, allPaketProgress, allPrincipalSubs, allPencairan, allPrincipalClaims] = await Promise.all([
    db.select().from(promoHasil).where(inArray(promoHasil.transaksiId, txIds)),
    uniqueCustomerCodes.length > 0 ? db.select().from(pointLogs).where(and(inArray(pointLogs.customerCode, uniqueCustomerCodes), eq(pointLogs.type, 'earn'), eq(pointLogs.branchId, effectiveBranchId))) : Promise.resolve([]),
    invNums.length > 0 ? db.select().from(labelQuotas).where(and(inArray(sql`TRIM(${labelQuotas.invoiceNumber})`, invNums), eq(labelQuotas.branchId, effectiveBranchId))) : Promise.resolve([]),
    uniquePelangganIds.length > 0 ? db.select().from(pelangganProgram).where(and(inArray(pelangganProgram.pelangganId, uniquePelangganIds), or(eq(pelangganProgram.branchId, effectiveBranchId), isNull(pelangganProgram.branchId)))) : Promise.resolve([]),
    uniquePelangganIds.length > 0 ? db.select({ id: paketProgress.id, pelangganId: paketProgress.pelangganId, currentTierId: paketProgress.currentTierId, brandCode: paketMaster.brandCode }).from(paketProgress).innerJoin(paketMaster, eq(paketProgress.paketId, paketMaster.id)).where(and(inArray(paketProgress.pelangganId, uniquePelangganIds), eq(paketProgress.branchId, effectiveBranchId))) : Promise.resolve([]),
    uniquePelangganIds.length > 0 ? db.select().from(principalSubscription).where(and(inArray(principalSubscription.pelangganId, uniquePelangganIds), eq(principalSubscription.branchId, effectiveBranchId))) : Promise.resolve([]),
    db.select().from(pencairanRewards).where(inArray(pencairanRewards.transaksiId, txIds)),
    uniquePelangganIds.length > 0 ? db.select().from(principalClaim).where(and(inArray(principalClaim.pelangganId, uniquePelangganIds), eq(principalClaim.branchId, effectiveBranchId))) : Promise.resolve([])
  ]);

  // 2. Batch Fetch Masters
  const [allCuttingMasters, allCashbackMasters, allPointMasters, allPaketMasters, allPrincipalPrograms, allPointHadiahs] = await Promise.all([
    db.select().from(cuttingMaster).where(eq(cuttingMaster.branchId, effectiveBranchId)),
    db.select().from(cashbackMaster).where(eq(cashbackMaster.branchId, effectiveBranchId)),
    db.select().from(pointMaster).where(eq(pointMaster.branchId, effectiveBranchId)),
    db.select().from(paketMaster).where(and(eq(paketMaster.branchId, effectiveBranchId), eq(paketMaster.status, 'aktif'))),
    db.select().from(principalProgram).where(and(eq(principalProgram.branchId, effectiveBranchId), eq(principalProgram.status, 'aktif'))),
    db.select().from(pointHadiah).where(and(eq(pointHadiah.branchId, effectiveBranchId), eq(pointHadiah.status, 'aktif')))
  ]);

  const [allPrincipalTiers, allPaketTiers, allPointRewards] = await Promise.all([
    allPrincipalPrograms.length > 0 ? db.select().from(principalTier).where(inArray(principalTier.programId, allPrincipalPrograms.map(p => p.id))) : Promise.resolve([]),
    allPaketMasters.length > 0 ? db.select().from(paketTier).where(inArray(paketTier.paketId, allPaketMasters.map(m => m.id))) : Promise.resolve([]),
    allPointHadiahs.length > 0 ? db.select().from(pointReward).where(inArray(pointReward.programId, allPointHadiahs.map(h => h.id))).orderBy(desc(pointReward.pointDibutuhkan)) : Promise.resolve([])
  ]);

  const cbMap = new Map(allCashbackMasters.map(m => [m.id, m.nama]));
  const ctMap = new Map(allCuttingMasters.map(m => [m.id, m.nama]));
  const ptMap = new Map(allPointMasters.map(m => [m.id, m.nama]));
  const pkMap = new Map(allPaketMasters.map(m => [m.id, m.nama]));
  const prMap = new Map(allPrincipalPrograms.map(m => [m.id, m.nama]));

  return rawData.map(t => {
    const tNoFaktur = (t.noFaktur || "").trim().toLowerCase();
    const tBrandCode = (t.brandCode || "FERIO").trim().toLowerCase();

    let activePromoArr: string[] = [];
    let activePromoStr = "-";
    if (t.programAktif) {
      try {
        const parsed = JSON.parse(t.programAktif);
        if (Array.isArray(parsed)) activePromoArr = parsed;
        else activePromoArr = [t.programAktif];
      } catch (e) {
        // Fallback for legacy joined strings like "Cutting: A | Cashback: B"
        activePromoArr = t.programAktif.split(' | ').filter(Boolean);
      }
      activePromoStr = activePromoArr.join(", ");
    } else {
      // Very legacy fallback
      const activeProgs = allPelangganProgs.filter(p => p.pelangganId === t.pelangganId && (p.brandCode || "FERIO").toLowerCase() === tBrandCode && p.status === 'aktif');
      activePromoArr = activeProgs.map(p => {
        let name = p.jenisProgram === 'cashback' ? cbMap.get(p.referensiId) : p.jenisProgram === 'cutting' ? ctMap.get(p.referensiId) : p.jenisProgram === 'point' ? ptMap.get(p.referensiId) : p.jenisProgram === 'paket' ? pkMap.get(p.referensiId) : p.jenisProgram === 'principal' ? prMap.get(p.referensiId) : "";
        return `${p.jenisProgram.charAt(0).toUpperCase() + p.jenisProgram.slice(1)}: ${name}`;
      });
      activePromoStr = activePromoArr.join(", ");
    }

    let parsedRewardData = null;
    if (t.rewardData) {
      try {
        parsedRewardData = typeof t.rewardData === 'string' ? JSON.parse(t.rewardData) : t.rewardData;
      } catch (e) {
        console.error("Error parsing rewardData:", e);
      }
    }

    // 3. Database-backed Rewards (The Source of Truth)
    const myCashbackResults = allCashbacks.filter(r => r.transaksiId === t.id);
    const dbCashbackTotal = myCashbackResults.reduce((sum: number, r: any) => sum + Number(r.nilaiCashback), 0);
    
    const myPencairan = allPencairan.filter(p => p.transaksiId === t.id);
    const dbPaketValue = myPencairan.filter(p => p.rewardType === 'paket').reduce((sum: number, p: any) => sum + Number(p.nilaiReward), 0);
    const dbPrincipalTotal = myPencairan.filter(p => p.rewardType === 'principal').reduce((sum: number, p: any) => sum + Number(p.nilaiReward), 0);
    
    const dbPoints = allPoints.filter(r => (r.invoiceNumber || "").trim().toLowerCase() === tNoFaktur).reduce((sum: number, r: any) => sum + r.point, 0);
    const dbLabelsQty = allLabels.filter(r => (r.invoiceNumber || "").trim().toLowerCase() === tNoFaktur).reduce((sum: number, r: any) => sum + r.amount, 0);
    
    const pointGift = allPointRewards.find(r => dbPoints >= Number(r.pointDibutuhkan))?.namaHadiah;

    // 3. Fallback Hierarchy: rewardData (Stored) -> DB Queries (Calculated)
    const r = parsedRewardData;
    
    // Principal Calculation (Company + Principal shares)
    const principalTotal = r?.principal?.total || (Number(r?.principal?.porsi_perusahaan || 0) + Number(r?.principal?.porsi_principal || 0)) || dbPrincipalTotal;
    
    // Cutting Calculation
    const cuttingTotal = r?.cutting?.nilai || (Number(t.qty || 0) * (Number(allCuttingMasters.find(m => ctMap.get(m.id) === (t.programAktif || "").split(': ')[1])?.nilaiPerLabel || 0))) || 0;

    return {
      ...t, 
      activePromoStr, 
      activePromoArr, 
      rewardData: parsedRewardData,
      rewards: {
        cashback: r?.cashback?.nilai || dbCashbackTotal, 
        points: r?.points?.nilai || dbPoints, 
        pointGift, 
        labels: cuttingTotal, 
        labelsQty: r?.cutting?.qty || dbLabelsQty,
        paket: (r?.paket?.tercapai || dbPaketValue > 0) ? { 
          calculatedValue: r?.paket?.calculatedValue || dbPaketValue,
          qty: r?.paket?.qty || t.qty
        } : null,
        principal: principalTotal,
        cutting: cuttingTotal
      }
    };
  });
}
