import { db, db as globalDb } from "./db";
import { 
  cashbackMaster, cuttingMaster, pointMaster, paketMaster, paketTier, 
  pointSaldo, cuttingProgress, paketProgress,
  promoIntegratedTransactions, promoHasil,
  pelangganProgram, salesCustomers, cashbackReward,
  pointLogs, labelQuotas, promoInputs, branches, promoBrands, promoMasters, rewardClaim,
  pointHadiah, pointRule, pointReward,
  principalMaster, principalProgram, principalTier, principalSubscription, principalClaim,
  pelangganProgramPrincipal, pencairanRewards,
  type PaketTier, type PrincipalTier, type PaketMaster, type PrincipalProgram, type PaketProgress, type SalesCustomer
} from "../shared/schema";
import { eq, and, or, isNull, gte, lte, sql, desc, ilike, inArray } from "drizzle-orm";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, differenceInDays, addMonths, addQuarters, addYears, isAfter } from "date-fns";

/**
 * Helper to get the period identifier (e.g. 2024-01 or 2024-Q1) 
 * and the date range for a given cycle type and date.
 */
export function getPeriodeRange(siklus: 'per_bulan' | 'per_3_bulan' | 'per_6_bulan' | 'per_tahun', date: Date) {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    throw new Error("Invalid time value: date is not a valid Date object in getPeriodeRange");
  }
  let start: Date;
  let end: Date;
  let identifier: string;

  switch (siklus) {
    case 'per_bulan':
      start = startOfMonth(d);
      end = endOfMonth(d);
      identifier = format(start, 'yyyy-MM');
      break;
    case 'per_3_bulan':
      start = startOfQuarter(d);
      end = endOfQuarter(d);
      identifier = `${format(start, 'yyyy')}-Q${Math.floor(start.getMonth() / 3) + 1}`;
      break;
    case 'per_6_bulan':
      const isSecondHalf = d.getMonth() >= 6;
      start = new Date(d.getFullYear(), isSecondHalf ? 6 : 0, 1, 0, 0, 0);
      end = new Date(d.getFullYear(), isSecondHalf ? 11 : 5, 1, 23, 59, 59);
      end = endOfMonth(end);
      identifier = `${format(start, 'yyyy')}-H${isSecondHalf ? 2 : 1}`;
      break;
    case 'per_tahun':
      start = startOfYear(d);
      end = endOfYear(d);
      identifier = format(start, 'yyyy');
      break;
    default:
      start = startOfMonth(d);
      end = endOfMonth(d);
      identifier = format(start, 'yyyy-MM');
  }

  return { start, end, identifier };
}

/**
 * Helper to determine status based on the blueprint formula.
 */
export function getStatusDetails(params: {
  now: Date,
  masaBerlakuSelesai: Date | null,
  periodeStart: Date,
  periodeEnd: Date,
  currentValue: number,
  targetValue: number
}) {
  const { now, masaBerlakuSelesai, periodeStart, periodeEnd, currentValue, targetValue } = params;
  
  const persenProgress = targetValue > 0 ? (currentValue / targetValue) * 100 : 100;
  
  // 1. Check EXPIRED (Overall Validity)
  if (masaBerlakuSelesai && isAfter(now, masaBerlakuSelesai)) {
    return { status: 'expired' as const, statusPeriode: 'expired' as const, persenProgress };
  }

  const totalHariPeriode = differenceInDays(periodeEnd, periodeStart) + 1;
  const hariBerjalanPeriode = differenceInDays(now, periodeStart);
  const sisaHariPeriode = differenceInDays(periodeEnd, now);
  const persenWaktu = totalHariPeriode > 0 ? (hariBerjalanPeriode / totalHariPeriode) * 100 : 0;

  // 2. Check HANGUS (Period ended, target not reached)
  if (sisaHariPeriode < 0 && persenProgress < 100) {
    return { status: 'hangus' as const, statusPeriode: 'hangus' as const, persenProgress };
  }

  // 3. Check SAFE (Target reached)
  if (persenProgress >= 100) {
    return { status: 'safe' as const, statusPeriode: 'safe' as const, persenProgress };
  }

  // 4. On Track / Warning / Critical logic
  let statusPeriode: 'on_track' | 'warning' | 'critical' = 'on_track';
  if (persenWaktu < 50) {
    statusPeriode = 'on_track';
  } else if (persenProgress >= (persenWaktu - 20)) {
    statusPeriode = 'warning';
  } else {
    statusPeriode = 'critical';
  }

  // Final check for status safety
  const finalStatus = sisaHariPeriode < 0 ? 'hangus' : 'berjalan';

  return { 
    status: finalStatus as any, 
    statusPeriode, 
    persenProgress 
  };
}


export interface PromoPreview {
  cashbacks: Array<{
    id: number;
    nama: string;
    nilai: number;
    tipeSyarat?: 'tanpa_syarat' | 'bersyarat';
    minTransaksi?: number;
    akumulasiBulanIni?: number;
    isReached?: boolean;
    persenReward?: number;
  }>;
  cutting: Array<{
    id: number;
    nama: string;
    qty: number;
    nilaiPerLabel: number;
    total: number;
    akumulasiBaruLabel: number;
    akumulasiBaruNilai: number;
  }>;
  point: {
    peroleh: number;
    saldoLama: number;
    saldoBaru: number;
    achievedReward?: string | null;
  } | null;
  pakets: Array<{
    id: number;
    nama: string;
    progressLama: number;
    transaksiIni: number;
    progressBaru: number;
    progressBaruValue: number;
    basisType: 'qty' | 'nilai';
    tier: {
      id: number;
      urutan: number;
      rewardType: string;
      rewardDesc: string | null;
      rewardValue: number | null;
      rewardAmount: number;
      isAchieved: boolean;
    } | null;
    targetBerikutnya: {
      minValue: number;
      selisih: number;
    } | null;
    totalRewardCalculated: number;
    totalRewardClaimed: number;
    rewardTersedia: number;
    warning?: string;
  }>;
  principalPrograms: Array<{
    id: number;
    nama: string;
    principalName: string;
    progressLama: number;
    transaksiIni: number;
    progressBaru: number;
    progressBaruValue: number;
    basisType: 'qty' | 'nilai';
    tier: {
      id: number;
      urutan: number;
      rewardPerusahaan: { type: string; value: number; desc: string | null };
      rewardPrincipal: { type: string; value: number; desc: string | null; detail: string | null };
      totalRewardCalculated: number;
      isAchieved: boolean;
    } | null;
    targetBerikutnya: {
      minValue: number;
      selisih: number;
    } | null;
    warning?: string;
  }>;
}

export async function calculatePromos(
  pelangganId: number, 
  qty: number, 
  nilaiFaktur: number, 
  tglFaktur: Date,
  brandCode: string,
  branchId: number,
  skipDuplicateCheck: boolean = false,
  clientDb: any = null,
  selectedPrograms?: Array<{ id: number; jenisProgram: string }>
): Promise<PromoPreview> {
  const db = clientDb || globalDb;
  const now = new Date();
  const preview: PromoPreview = {
    cashbacks: [],
    cutting: [],
    point: null,
    pakets: [],
    principalPrograms: []
  };

  const [customer] = await db.select().from(salesCustomers).where(eq(salesCustomers.id, pelangganId)).limit(1);
  if (!customer) return preview; // Silent fail if customer not found

  const activePrograms = await db.select()
    .from(pelangganProgram)
    .where(and(
      eq(pelangganProgram.pelangganId, pelangganId),
      or(
        eq(sql`LOWER(${pelangganProgram.brandCode})`, brandCode.toLowerCase()),
        eq(sql`LOWER(${pelangganProgram.brandCode})`, 'semua'),
        isNull(pelangganProgram.brandCode)
      ),
      eq(pelangganProgram.status, 'aktif'),
      eq(pelangganProgram.branchId, branchId)
    ));
    
  // Filter out master programs that are currently non-active
  const filteredActivePrograms = [];
  for (const mapping of activePrograms) {
    let isMasterActive = false;
    if (mapping.jenisProgram === 'cashback') {
      const [m] = await db.select({ status: cashbackMaster.status }).from(cashbackMaster).where(eq(cashbackMaster.id, mapping.referensiId)).limit(1);
      if (m?.status === 'aktif') isMasterActive = true;
    } else if (mapping.jenisProgram === 'cutting') {
      const [m] = await db.select({ status: cuttingMaster.status }).from(cuttingMaster).where(eq(cuttingMaster.id, mapping.referensiId)).limit(1);
      if (m?.status === 'aktif') isMasterActive = true;
    } else if (mapping.jenisProgram === 'paket') {
      const [m] = await db.select({ status: paketMaster.status }).from(paketMaster).where(eq(paketMaster.id, mapping.referensiId)).limit(1);
      if (m?.status === 'aktif') isMasterActive = true;
    } else if (mapping.jenisProgram === 'point') {
      const [m] = await db.select({ status: pointHadiah.status }).from(pointHadiah).where(eq(pointHadiah.id, mapping.referensiId)).limit(1);
      if (m?.status === 'aktif') isMasterActive = true;
      else {
        // Fallback check
        const [pm] = await db.select({ status: pointMaster.status }).from(pointMaster).where(eq(pointMaster.id, mapping.referensiId)).limit(1);
        if (pm?.status === 'aktif') isMasterActive = true;
      }
    } else if (mapping.jenisProgram === 'principal') {
      const [m] = await db.select({ status: principalProgram.status }).from(principalProgram).where(eq(principalProgram.id, mapping.referensiId)).limit(1);
      if (m?.status === 'aktif') isMasterActive = true;
    }
    
    if (isMasterActive) filteredActivePrograms.push(mapping);
  }

  // === SELECTIVE PROGRAM FILTERING ===
  // If selectedPrograms is provided, only keep programs that appear in the selection
  let finalActivePrograms = filteredActivePrograms;
  if (selectedPrograms && selectedPrograms.length > 0) {
    finalActivePrograms = filteredActivePrograms.filter(mapping => 
      selectedPrograms.some(sp => sp.id === mapping.referensiId && sp.jenisProgram === mapping.jenisProgram)
    );
  }

  for (const mapping of finalActivePrograms) {
    // BRAND FILTERING: Only process promos that match the transaction's brandCode
    // Unless the promo is marked for 'SEMUA' or 'Umum'
    let promoBrand = (mapping.brandCode || 'SEMUA').toUpperCase();
    let txBrand = (brandCode || 'FERIO').toUpperCase();
    
    if (promoBrand !== 'SEMUA' && promoBrand !== 'UMUM' && promoBrand !== txBrand) {
      continue;
    }

    if (mapping.jenisProgram === 'cashback') {
      const masters = await db.select().from(cashbackMaster).where(and(
        eq(cashbackMaster.id, mapping.referensiId), 
        eq(cashbackMaster.status, 'aktif'),
        eq(cashbackMaster.branchId, branchId)
      )).limit(1);
      
      if (masters.length > 0) {
        const m = masters[0];
        const minTrans = Number(m.minTransaksi);
        const isBersyarat = m.tipeSyarat === 'bersyarat';
        
        let akumulasiBulanIni = 0;
        let isReached = false;
        let nilaiCb = 0;

        if (isBersyarat) {
          const periode = format(tglFaktur, 'yyyy-MM');
          // SOURCE OF TRUTH: Only from promo_integrated_transactions
          const historyNew = await db.select({ nilai: promoIntegratedTransactions.nilaiFaktur })
            .from(promoIntegratedTransactions)
            .innerJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
            .where(and(
              eq(promoIntegratedTransactions.pelangganId, pelangganId),
              eq(promoBrands.name, brandCode),
              eq(sql`to_char(${promoIntegratedTransactions.tanggalFaktur}, 'YYYY-MM')`, periode),
              eq(promoIntegratedTransactions.branchId, branchId)
            ));

          const totalSblm = historyNew.reduce((sum: number, h: any) => sum + Number(h.nilai), 0);
          akumulasiBulanIni = totalSblm + nilaiFaktur;
          isReached = akumulasiBulanIni >= minTrans;

          if (isReached) {
            if (m.tipeCashback === 'persen') {
              nilaiCb = akumulasiBulanIni * (Number(m.nilai) / 100);
              if (m.maksCashback && Number(m.maksCashback) > 0) {
                nilaiCb = Math.min(nilaiCb, Number(m.maksCashback));
              }
            } else {
              nilaiCb = Number(m.nilai);
            }
          }

          preview.cashbacks.push({ 
            id: m.id, 
            nama: m.nama, 
            nilai: nilaiCb, 
            tipeSyarat: 'bersyarat',
            minTransaksi: minTrans,
            akumulasiBulanIni,
            isReached,
            persenReward: m.tipeCashback === 'persen' ? Number(m.nilai) : undefined
          });
        } else {
          // Tanpa syarat - per transaksi
          if (nilaiFaktur >= minTrans) {
            if (m.tipeCashback === 'persen') {
              nilaiCb = nilaiFaktur * (Number(m.nilai) / 100);
              if (m.maksCashback && Number(m.maksCashback) > 0) {
                nilaiCb = Math.min(nilaiCb, Number(m.maksCashback));
              }
            } else {
              nilaiCb = Number(m.nilai);
            }
            preview.cashbacks.push({ 
              id: m.id, 
              nama: m.nama, 
              nilai: nilaiCb,
              tipeSyarat: 'tanpa_syarat',
              isReached: true
            });
          }
        }
      }
    }

    if (mapping.jenisProgram === 'cutting') {
      const masters = await db.select().from(cuttingMaster).where(and(
        eq(cuttingMaster.id, mapping.referensiId), 
        eq(cuttingMaster.status, 'aktif'),
        eq(cuttingMaster.branchId, branchId)
      )).limit(1);
      
      if (masters.length > 0) {
        const m = masters[0];
        const hasil = qty * Number(m.nilaiPerLabel);
        
        // Re-calculate accumulation from promo_integrated_transactions only
        const historyNew = await db.select({ qty: promoIntegratedTransactions.qty })
          .from(promoIntegratedTransactions)
          .innerJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
          .where(and(
            eq(promoIntegratedTransactions.pelangganId, pelangganId),
            eq(promoBrands.name, brandCode),
            eq(promoIntegratedTransactions.branchId, branchId)
          ));

        const oldLabel = historyNew.reduce((sum: number, h: any) => sum + Number(h.qty), 0);
        const oldNilai = oldLabel * Number(m.nilaiPerLabel);

        preview.cutting.push({
          id: m.id,
          nama: m.nama,
          qty: qty,
          nilaiPerLabel: Number(m.nilaiPerLabel),
          total: hasil,
          akumulasiBaruLabel: oldLabel + qty,
          akumulasiBaruNilai: oldNilai + hasil
        });
      }
    }

    if (mapping.jenisProgram === 'point') {
      const programs = await db.select().from(pointHadiah).where(and(
        eq(pointHadiah.id, mapping.referensiId), 
        eq(pointHadiah.status, 'aktif'),
        eq(pointHadiah.branchId, branchId)
      )).limit(1);
      
      if (programs.length > 0) {
        const prog = programs[0];
        const rules = await db.select().from(pointRule).where(eq(pointRule.programId, prog.id));
        const rewards = await db.select().from(pointReward).where(eq(pointReward.programId, prog.id)).orderBy(desc(pointReward.pointDibutuhkan));

        let peroleh = 0;
        for (const r of rules) {
          if (r.tipe === 'nominal') {
            peroleh += Math.floor(nilaiFaktur / Number(r.nilaiKonversi)) * Number(r.poinDihasilkan);
          } else if (r.tipe === 'qty') {
            peroleh += Math.floor(qty / Number(r.nilaiKonversi)) * Number(r.poinDihasilkan);
          }
        }
        
        // Dual-source Point Accumulation (from pointLogs which covers both tables)
        const [pointSum] = await db.select({ total: sql<number>`SUM(${pointLogs.point})` })
          .from(pointLogs)
          .where(and(
            eq(pointLogs.customerCode, customer.code),
            eq(pointLogs.branchId, branchId),
            eq(sql`LOWER(${pointLogs.brandCode})`, brandCode.toLowerCase()),
            eq(pointLogs.type, 'earn')
          ));
        const oldSaldo = Number(pointSum?.total) || 0;
        const saldoBaru = oldSaldo + peroleh;

        let achievedReward = null;
        // Check for all eligible rewards based on accumulated balance
        // The user wants to see the highest eligible reward (e.g. 400 -> Kulkas Mini)
        // BUG FIX: Prioritize newest rewards or specific names (like Kulkas) for identical thresholds
        const sortedRewards = rewards.sort((a: any, b: any) => {
          if (b.pointDibutuhkan !== a.pointDibutuhkan) return b.pointDibutuhkan - a.pointDibutuhkan;
          // Priority 1: Keyword 'kulkas'
          if (a.namaHadiah.toLowerCase().includes('kulkas')) return -1;
          if (b.namaHadiah.toLowerCase().includes('kulkas')) return 1;
          // Priority 2: Newest ID first
          return (Number(b.id) || 0) - (Number(a.id) || 0);
        });

        for (const rw of sortedRewards) {
          if (saldoBaru >= rw.pointDibutuhkan) {
            achievedReward = rw.namaHadiah;
            break; 
          }
        }

        preview.point = {
          peroleh,
          saldoLama: oldSaldo,
          saldoBaru,
          achievedReward
        };
      } else {
        // Fallback to legacy pointMaster if needed
        const masters = await db.select().from(pointMaster).where(and(
          eq(pointMaster.id, mapping.referensiId), 
          eq(pointMaster.status, 'aktif'),
          eq(pointMaster.branchId, branchId)
        )).limit(1);
        
        if (masters.length > 0) {
          const m = masters[0];
          const peroleh = qty * Number(m.poinPerQty);
          const [pointSum] = await db.select({ total: sql<number>`SUM(${pointLogs.point})` })
            .from(pointLogs)
            .where(and(
              eq(pointLogs.customerCode, customer.code),
              eq(pointLogs.branchId, branchId),
              eq(sql`LOWER(${pointLogs.brandCode})`, brandCode.toLowerCase()),
              eq(pointLogs.type, 'earn')
            ));
          const oldSaldo = Number(pointSum?.total) || 0;
          const saldoBaru = oldSaldo + peroleh;

          // NEW: Even in fallback, search for matching rewards from the new point system
          let achievedReward = null;
          try {
            const activeProg = await db.select().from(pointHadiah).where(and(
              or(
                eq(sql`LOWER(${pointHadiah.brandCode})`, brandCode.toLowerCase()),
                eq(sql`LOWER(${pointHadiah.brandCode})`, 'semua')
              ),
              eq(pointHadiah.status, 'aktif'),
              eq(pointHadiah.branchId, branchId)
            )).limit(1);
            if (activeProg.length > 0) {
              const rewards = await db.select().from(pointReward).where(and(eq(pointReward.programId, activeProg[0].id), eq(pointReward.branchId, branchId))).orderBy(desc(pointReward.pointDibutuhkan));
              
              const sorted = rewards.sort((a: any, b: any) => {
                 if (Number(b.pointDibutuhkan) !== Number(a.pointDibutuhkan)) return Number(b.pointDibutuhkan) - Number(a.pointDibutuhkan);
                 if (a.namaHadiah.toLowerCase().includes('kulkas')) return -1;
                 if (b.namaHadiah.toLowerCase().includes('kulkas')) return 1;
                 return (Number(b.id) || 0) - (Number(a.id) || 0);
              });

              for (const rw of sorted) {
                 if (saldoBaru >= Number(rw.pointDibutuhkan)) {
                    achievedReward = rw.namaHadiah;
                    break;
                 }
              }
            }
          } catch (e) { console.error("Error fetching rewards in pointMaster fallback:", e); }

          preview.point = {
            peroleh,
            saldoLama: oldSaldo,
            saldoBaru,
            achievedReward
          };
        }
      }
    }

    if (mapping.jenisProgram === 'paket') {
      const masters = await db.select().from(paketMaster)
        .where(and(
          eq(paketMaster.id, mapping.referensiId), 
          eq(paketMaster.status, 'aktif'),
          eq(paketMaster.branchId, branchId)
        ))
        .limit(1);
      
      if (masters.length > 0) {
        const m = masters[0];
        const existingProgress = await db.select()
          .from(paketProgress)
          .where(and(
            eq(paketProgress.pelangganId, pelangganId), 
            eq(paketProgress.paketId, m.id),
            eq(paketProgress.branchId, branchId)
          ))
          .limit(1);
        
        const prog = existingProgress.length > 0 ? existingProgress[0] : {
          periodeStart: m.startDate,
          periodeEnd: new Date(new Date(m.startDate).setMonth(new Date(m.startDate).getMonth() + (m.periodeBulan || 1))),
          totalQty: "0",
          totalNilai: "0",
          currentTierId: null
        };

        const tglAcuan = m.acuanTanggal === 'faktur' ? tglFaktur : now;
        
        let warning = "";
        if (tglAcuan < m.startDate || tglAcuan > m.endDate) {
          warning = `Transaksi di luar masa berlaku paket [${m.nama}] (${m.startDate.toLocaleDateString()} - ${m.endDate.toLocaleDateString()})`;
        }

        // Hitung akumulasi dari promo_integrated_transactions only
        const historyNew = await db.select({ qty: promoIntegratedTransactions.qty, nilai: promoIntegratedTransactions.nilaiFaktur })
          .from(promoIntegratedTransactions)
          .innerJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
          .where(and(
            eq(promoIntegratedTransactions.pelangganId, pelangganId),
            eq(promoBrands.name, brandCode),
            eq(promoIntegratedTransactions.branchId, branchId),
            gte(promoIntegratedTransactions.tanggalFaktur, m.startDate),
            lte(promoIntegratedTransactions.tanggalFaktur, m.endDate)
          ));

        const oldQty = historyNew.reduce((sum: number, h: any) => sum + Number(h.qty), 0);
        const oldNilaiRaw = historyNew.reduce((sum: number, h: any) => sum + Number(h.nilai), 0);

        const totalQtyNew = oldQty + qty;
        const totalNilaiNew = oldNilaiRaw + nilaiFaktur;
        
        const oldVal = m.basisType === 'qty' ? oldQty : oldNilaiRaw;
        const newVal = m.basisType === 'qty' ? totalQtyNew : totalNilaiNew;
        const delta = m.basisType === 'qty' ? qty : nilaiFaktur;

        const tiers = await db.select()
          .from(paketTier)
          .where(eq(paketTier.paketId, m.id))
          .orderBy(desc(paketTier.urutanTier));
        
        let currentTier: any = null;
        let nextTier: any = null;

        // 1. Determine Current Achieved Tier (Highest minValue <= newVal)
        for (const t of tiers) {
          const min = Number(t.minValue);
          if (newVal >= min) {
            const rewardVal = t.rewardType === 'percent' 
               ? (t.rewardPercent ? Number(t.rewardPercent) : 0)
               : (t.rewardValue ? Number(t.rewardValue) : 0);
            
            let calculatedReward = 0;
            if (t.rewardType === 'percent') {
                calculatedReward = totalNilaiNew * (rewardVal / 100);
            } else if (t.rewardType === 'cash') {
                calculatedReward = rewardVal;
            }

            currentTier = {
              id: t.id,
              urutan: t.urutanTier,
              rewardType: t.rewardType,
              rewardDesc: t.rewardDesc,
              rewardValue: rewardVal || null,
              rewardAmount: calculatedReward,
              isAchieved: true
            };
            
            // 2. Determine Next Tier (The one immediately above current)
            const higherTiers = tiers.filter((ht: PaketTier) => ht.urutanTier > t.urutanTier).sort((a: PaketTier, b: PaketTier) => a.urutanTier - b.urutanTier);
            if (higherTiers.length > 0) {
               nextTier = {
                 minValue: Number(higherTiers[0].minValue),
                 selisih: Number(higherTiers[0].minValue) - newVal
               };
            }
            break;
          }
        }

        // 3. Fallback: If no tier achieved, find the lowest tier as target
        if (!currentTier && tiers.length > 0) {
           const lowestTier = tiers.sort((a: PaketTier, b: PaketTier) => a.urutanTier - b.urutanTier)[0];
           if (newVal < Number(lowestTier.minValue)) {
              nextTier = {
                minValue: Number(lowestTier.minValue),
                selisih: Number(lowestTier.minValue) - newVal
              };
           }
        }

        // Get existing claimed amount
        const existingClaimed = existingProgress.length > 0 
          ? Number((existingProgress[0] as PaketProgress).totalRewardClaimed || 0) 
          : 0;

        // Calculate total reward based on TOTAL × persen_tier (Full Recalculation)
        let totalRewardCalc = 0;
        if (currentTier) {
          if (currentTier.rewardType === 'percent') {
            totalRewardCalc = totalNilaiNew * ((currentTier.rewardValue || 0) / 100);
          } else if (currentTier.rewardType === 'cash') {
            totalRewardCalc = currentTier.rewardValue || 0;
          }
        }
        const rewardTersedia = Math.max(0, totalRewardCalc - existingClaimed);

        preview.pakets.push({
          id: m.id,
          nama: m.nama,
          progressLama: oldVal,
          transaksiIni: delta,
          progressBaru: newVal,
          progressBaruValue: totalNilaiNew,
          basisType: m.basisType,
          tier: currentTier,
          targetBerikutnya: nextTier,
          totalRewardCalculated: totalRewardCalc,
          totalRewardClaimed: existingClaimed,
          rewardTersedia: rewardTersedia,
          warning: warning || undefined
        });
      }
    }

    if (mapping.jenisProgram === 'principal') {
      const masters = await db.select({
        program: principalProgram,
        principal: principalMaster
      })
      .from(principalProgram)
      .innerJoin(principalMaster, eq(principalProgram.principalId, principalMaster.id))
      .where(and(
        eq(principalProgram.id, mapping.referensiId), 
        eq(principalProgram.status, 'aktif'),
        eq(principalProgram.branchId, branchId)
      ))
      .limit(1);
      
      if (masters.length > 0) {
        const { program: m, principal: p } = masters[0];
        const existingProgress = await db.select()
          .from(principalSubscription)
          .where(and(
            eq(principalSubscription.pelangganId, pelangganId), 
            eq(principalSubscription.programId, m.id),
            eq(principalSubscription.branchId, branchId)
          ))
          .limit(1);
        
        const tglAcuan = m.acuanTanggal === 'faktur' ? tglFaktur : now;
        
        let warning = "";
        if (tglAcuan < m.startDate || tglAcuan > m.endDate) {
          warning = `Transaksi di luar masa berlaku [${m.nama}] (${m.startDate.toLocaleDateString()} - ${m.endDate.toLocaleDateString()})`;
        }

        // Re-calculate accumulation from promo_integrated_transactions only
        const historyNew = await db.select({ qty: promoIntegratedTransactions.qty, nilai: promoIntegratedTransactions.nilaiFaktur })
          .from(promoIntegratedTransactions)
          .innerJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
          .where(and(
            eq(promoIntegratedTransactions.pelangganId, pelangganId),
            eq(promoBrands.name, brandCode),
            eq(promoIntegratedTransactions.branchId, branchId),
            gte(promoIntegratedTransactions.tanggalFaktur, m.startDate),
            lte(promoIntegratedTransactions.tanggalFaktur, m.endDate)
          ));

        const oldQty = historyNew.reduce((sum: number, h: any) => sum + Number(h.qty), 0);
        const oldNilaiRaw = historyNew.reduce((sum: number, h: any) => sum + Number(h.nilai), 0);

        const totalQtyNew = oldQty + qty;
        const totalNilaiNew = oldNilaiRaw + nilaiFaktur;
        
        const oldVal = m.basisType === 'qty' ? oldQty : oldNilaiRaw;
        const newVal = m.basisType === 'qty' ? totalQtyNew : totalNilaiNew;
        const delta = m.basisType === 'qty' ? qty : nilaiFaktur;

        const tiers = await db.select()
          .from(principalTier)
          .where(eq(principalTier.programId, m.id))
          .orderBy(desc(principalTier.urutanTier));
        
        let currentTier: any = null;
        let nextTier: any = null;

        for (const t of tiers) {
          const min = Number(t.minValue);
          if (newVal >= min) {
            // Calculate Perusahaan Share
            const rewardPerusahaanVal = t.rewardPerusahaanType === 'percent' 
              ? (Number(t.rewardPerusahaanPercent || 0) * totalNilaiNew / 100) 
              : Number(t.rewardPerusahaanValue || 0);

            // Calculate Principal Share
            const rewardPrincipalVal = t.rewardPrincipalType === 'percent' 
              ? (Number(t.rewardPrincipalPercent || 0) * totalNilaiNew / 100) 
              : Number(t.rewardPrincipalValue || 0);
            
            currentTier = {
              id: t.id,
              urutan: t.urutanTier,
              rewardPerusahaan: {
                type: t.rewardPerusahaanType,
                value: rewardPerusahaanVal,
                desc: t.rewardPerusahaanDesc
              },
              rewardPrincipal: {
                type: t.rewardPrincipalType,
                value: rewardPrincipalVal,
                desc: t.rewardPrincipalDesc,
                detail: t.rewardPrincipalDetail
              },
              totalRewardCalculated: rewardPerusahaanVal + rewardPrincipalVal,
              isAchieved: true
            };
            
            const higherTiers = tiers.filter((ht: any) => ht.urutanTier > t.urutanTier).sort((a: any, b: any) => a.urutanTier - b.urutanTier);
            if (higherTiers.length > 0) {
               nextTier = {
                 minValue: Number(higherTiers[0].minValue),
                 selisih: Number(higherTiers[0].minValue) - newVal
               };
            }
            break;
          }
        }

        if (!currentTier && tiers.length > 0) {
           const lowestTier = tiers.sort((a: any, b: any) => a.urutanTier - b.urutanTier)[0];
           if (newVal < Number(lowestTier.minValue)) {
              nextTier = {
                minValue: Number(lowestTier.minValue),
                selisih: Number(lowestTier.minValue) - newVal
              };
           }
        }

        preview.principalPrograms.push({
          id: m.id,
          nama: m.nama,
          principalName: p.nama,
          progressLama: oldVal,
          transaksiIni: delta,
          progressBaru: newVal,
          progressBaruValue: totalNilaiNew,
          basisType: m.basisType,
          tier: currentTier,
          targetBerikutnya: nextTier,
          warning: warning || undefined
        });
      }
    }
  }

  // === NEW: PROGRAM PRINCIPAL DETECTION ===
  const enlistedPrincipalPrograms = await db.select({
      id: principalProgram.id,
      nama: principalProgram.nama,
      basisType: principalProgram.basisType,
      startDate: principalProgram.startDate,
      endDate: principalProgram.endDate,
      principalName: principalMaster.nama,
      brandCode: principalProgram.brandCode
    })
    .from(pelangganProgramPrincipal)
    .innerJoin(principalProgram, eq(pelangganProgramPrincipal.programPrincipalId, principalProgram.id))
    .innerJoin(principalMaster, eq(principalProgram.principalId, principalMaster.id))
    .where(and(
      eq(pelangganProgramPrincipal.pelangganId, pelangganId),
      eq(pelangganProgramPrincipal.status, 'aktif'),
      eq(principalProgram.status, 'aktif'),
      or(
        eq(sql`LOWER(${principalProgram.brandCode})`, brandCode.toLowerCase()),
        eq(sql`LOWER(${principalProgram.brandCode})`, 'semua')
      ),
      lte(principalProgram.startDate, tglFaktur),
      gte(principalProgram.endDate, tglFaktur)
    ));

  // Filter principal programs if selectedPrograms is provided
  let finalPrincipalPrograms = enlistedPrincipalPrograms;
  if (selectedPrograms && selectedPrograms.length > 0) {
    finalPrincipalPrograms = enlistedPrincipalPrograms.filter((pr: any) => 
      selectedPrograms.some(sp => sp.id === pr.id && sp.jenisProgram === 'principal')
    );
  }

  for (const pr of finalPrincipalPrograms) {
    const history = await db.select({ qty: promoIntegratedTransactions.qty, nilai: promoIntegratedTransactions.nilaiFaktur })
      .from(promoIntegratedTransactions)
      .innerJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
      .where(and(
        eq(promoIntegratedTransactions.pelangganId, pelangganId),
        eq(promoBrands.name, brandCode),
        eq(promoIntegratedTransactions.branchId, branchId),
        gte(promoIntegratedTransactions.tanggalFaktur, pr.startDate),
        lte(promoIntegratedTransactions.tanggalFaktur, pr.endDate)
      ));

    const oldQty = history.reduce((sum: number, h: any) => sum + Number(h.qty), 0);
    const oldNilai = history.reduce((sum: number, h: any) => sum + Number(h.nilai), 0);

    const newVal = pr.basisType === 'qty' ? oldQty + qty : oldNilai + nilaiFaktur;
    const oldVal = pr.basisType === 'qty' ? oldQty : oldNilai;
    const currentInput = pr.basisType === 'qty' ? qty : nilaiFaktur;

    const tiers = await db.select()
      .from(principalTier)
      .where(eq(principalTier.programId, pr.id))
      .orderBy(desc(principalTier.urutanTier));

    let currentTier: any = null;
    let nextTier: any = null;

    for (const t of tiers) {
      const min = Number(t.minValue);
      if (newVal >= min) {
        let internalCalc = 0;
        let principalCalc = 0;

        if (t.rewardPerusahaanType === 'percent') {
            internalCalc = (pr.basisType === 'nilai' ? (oldNilai + nilaiFaktur) : 0) * (Number(t.rewardPerusahaanPercent || 0) / 100);
        } else if (t.rewardPerusahaanType === 'uang' || String(t.rewardPerusahaanType) === 'uang_tunai' || String(t.rewardPerusahaanType) === 'cash') {
            internalCalc = Number(t.rewardPerusahaanValue || 0);
        }

        if (t.rewardPrincipalType === 'percent') {
            principalCalc = (pr.basisType === 'nilai' ? (oldNilai + nilaiFaktur) : 0) * (Number(t.rewardPrincipalPercent || 0) / 100);
        } else if (t.rewardPrincipalType === 'uang' || String(t.rewardPrincipalType) === 'uang_tunai' || String(t.rewardPrincipalType) === 'cash') {
            principalCalc = Number(t.rewardPrincipalValue || 0);
        }

        currentTier = {
          id: t.id,
          urutan: t.urutanTier,
          rewardPerusahaan: { type: t.rewardPerusahaanType, value: internalCalc, desc: t.rewardPerusahaanDesc },
          rewardPrincipal: { type: t.rewardPrincipalType, value: principalCalc, desc: t.rewardPrincipalDesc, detail: t.rewardPrincipalDetail },
          totalRewardCalculated: internalCalc + principalCalc,
          isAchieved: true
        };

        const higherTiers = tiers.filter((ht: PrincipalTier) => ht.urutanTier > t.urutanTier).sort((a: PrincipalTier, b: PrincipalTier) => a.urutanTier - b.urutanTier);
        if (higherTiers.length > 0) {
           nextTier = {
             minValue: Number(higherTiers[0].minValue),
             selisih: Number(higherTiers[0].minValue) - newVal
           };
        }
        break;
      }
    }

    // Default if no tier reached yet, but show progress towards first tier
    if (!currentTier && tiers.length > 0) {
      const firstTier = tiers[tiers.length - 1]; // Sorted desc, so last is first
      nextTier = {
        minValue: Number(firstTier.minValue),
        selisih: Number(firstTier.minValue) - newVal
      };
    }

    preview.principalPrograms.push({
      id: pr.id,
      nama: pr.nama,
      principalName: pr.principalName,
      progressLama: oldVal,
      transaksiIni: currentInput,
      progressBaru: newVal,
      progressBaruValue: pr.basisType === 'nilai' ? newVal : 0,
      basisType: pr.basisType as any,
      tier: currentTier,
      targetBerikutnya: nextTier,
      warning: ""
    });
  }

  return preview;
}

/**
 * Summarizes the detailed PromoPreview into a flat structure for transaction recording.
 */
function summarizeRewards(preview: PromoPreview) {
  const summary = {
    paket: { tercapai: false, nilai: 0, qty: 0, calculatedValue: 0 },
    cashback: { tercapai: false, nilai: 0 },
    points: { tercapai: false, nilai: 0 },
    cutting: { tercapai: false, nilai: 0, qty: 0 },
    principal: { tercapai: false, porsi_perusahaan: 0, porsi_principal: 0, total: 0 }
  };

  // Paket
  if (preview.pakets && preview.pakets.length > 0) {
    summary.paket.tercapai = preview.pakets.some(p => p.tier?.isAchieved);
    summary.paket.nilai = preview.pakets.reduce((sum: number, p: any) => sum + (p.tier?.rewardValue || 0), 0);
    summary.paket.qty = preview.pakets.reduce((sum: number, p: any) => sum + (p.transaksiIni || 0), 0);
    summary.paket.calculatedValue = preview.pakets.reduce((sum: number, p: any) => sum + (p.tier?.rewardAmount || 0), 0);
  }

  // Cashback
  if (preview.cashbacks && preview.cashbacks.length > 0) {
    const reached = preview.cashbacks.filter(c => c.isReached);
    if (reached.length > 0) {
      summary.cashback.tercapai = true;
      summary.cashback.nilai = reached.reduce((sum: number, c: any) => sum + (Number(c.nilai) || 0), 0);
    }
  }

  // Points
  if (preview.point && preview.point.peroleh > 0) {
    summary.points.tercapai = true;
    summary.points.nilai = preview.point.peroleh;
  }

  // Cutting
  if (preview.cutting && preview.cutting.length > 0) {
    summary.cutting.tercapai = true;
    summary.cutting.nilai = preview.cutting.reduce((sum: number, c: any) => sum + (Number(c.total) || 0), 0);
    summary.cutting.qty = preview.cutting.reduce((sum: number, c: any) => sum + (Number(c.qty) || 0), 0);
  }

  // Principal
  if (preview.principalPrograms && preview.principalPrograms.length > 0) {
    const reached = preview.principalPrograms.filter(p => p.tier && p.tier.isAchieved);
    if (reached.length > 0) {
      summary.principal.tercapai = true;
      const pPerush = reached.reduce((sum: number, p: any) => sum + (p.tier?.rewardPerusahaan?.value || 0), 0);
      const pPrinc = reached.reduce((sum: number, p: any) => sum + (p.tier?.rewardPrincipal?.value || 0), 0);
      summary.principal.porsi_perusahaan = pPerush;
      summary.principal.porsi_principal = pPrinc;
      summary.principal.total = pPerush + pPrinc;
    }
  }

  return summary;
}

export async function saveTransaksiPromo(
  pelangganId: number,
  noFaktur: string,
  tglFaktur: Date,
  qty: number,
  nilaiFaktur: number,
  brandCode: string,
  branchId: number,
  selectedPrograms?: Array<{ id: number; jenisProgram: string }>
) {
  return await db.transaction(async (tx) => {
    // 0. Validate Customer Branch
    const [customer] = await tx.select().from(salesCustomers).where(and(
       eq(salesCustomers.id, pelangganId),
       eq(salesCustomers.branchId, branchId)
    )).limit(1);
    if (!customer) throw new Error("Pelanggan tidak ditemukan atau tidak terdaftar di cabang Anda.");

    // 1. Fetch internal IDs for brandCode
    const brandLabel = await tx.select().from(promoBrands).where(and(eq(sql`LOWER(${promoBrands.name})`, brandCode.toLowerCase()), eq(promoBrands.branchId, branchId))).limit(1);
    const merekId = brandLabel[0]?.id;
    if (!merekId) throw new Error(`Merek '${brandCode}' tidak ditemukan`);

    // 2. Validate Invoice Duplicate (Integrated table)
    const existingRec = await tx.select().from(promoIntegratedTransactions).where(and(eq(promoIntegratedTransactions.noFaktur, noFaktur), eq(promoIntegratedTransactions.branchId, branchId))).limit(1);
    if (existingRec.length > 0) throw new Error(`Nomor Faktur ${noFaktur} sudah pernah diinput`);

    // 3. Calculate Rewards for this transaction (snapshot)
    const preview = await calculatePromos(pelangganId, qty, nilaiFaktur, tglFaktur, brandCode, branchId, false, tx, selectedPrograms);
    const rewardSummary = summarizeRewards(preview);
    
    // 3.5 Validation: Ensure there's at least one active program/benefit
    const hasActivePromo = 
      (preview.cashbacks && preview.cashbacks.length > 0) ||
      (preview.pakets && preview.pakets.length > 0) ||
      (preview.principalPrograms && preview.principalPrograms.length > 0) ||
      (preview.point && preview.point.peroleh > 0) ||
      (preview.cutting && preview.cutting.length > 0);

    if (!hasActivePromo) {
      throw new Error("Tidak ada promo aktif untuk merek ini. Transaksi tidak dapat disimpan.");
    }
    
    // Summary of Active Programs
    const activeProgs = [];
    if (preview.cashbacks.length > 0) activeProgs.push(`Cashback: ${preview.cashbacks.map(c => c.nama).join(', ')}`);
    if (preview.pakets.length > 0) activeProgs.push(`Paket: ${preview.pakets.map(p => p.nama).join(', ')}`);
    if (preview.principalPrograms && preview.principalPrograms.length > 0) activeProgs.push(`Principal: ${preview.principalPrograms.map(p => p.nama).join(', ')}`);
    if (preview.point) activeProgs.push(`Point: +${preview.point.peroleh}`);
    if (preview.cutting && preview.cutting.length > 0) activeProgs.push(`Cutting Label: ${preview.cutting.map(c => c.nama).join(', ')}`);

    // 3.8 Determine Reward Status for easy filtering
    const isReached = rewardSummary.paket.tercapai || 
                      rewardSummary.cashback.tercapai || 
                      rewardSummary.points.tercapai || 
                      rewardSummary.cutting.tercapai || 
                      rewardSummary.principal.tercapai;
    
    let primaryType = null;
    let primaryNilai = 0;
    if (rewardSummary.cashback.tercapai) { primaryType = 'cashback'; primaryNilai = rewardSummary.cashback.nilai; }
    else if (rewardSummary.paket.tercapai) { primaryType = 'paket'; primaryNilai = rewardSummary.paket.calculatedValue || rewardSummary.paket.nilai; }
    else if (rewardSummary.principal.tercapai) { primaryType = 'principal'; primaryNilai = rewardSummary.principal.total; }
    else if (rewardSummary.points.tercapai) { primaryType = 'point'; primaryNilai = rewardSummary.points.nilai; }
    else if (rewardSummary.cutting.tercapai) { primaryType = 'cutting'; primaryNilai = rewardSummary.cutting.nilai; }

    // 4. Insert transaction record to NEW table
    const records = await tx.insert(promoIntegratedTransactions).values({
      pelangganId,
      noFaktur,
      tanggalFaktur: tglFaktur,
      qty,
      nilaiFaktur: nilaiFaktur.toString(),
      branchId,
      merekId,
      programAktif: JSON.stringify(activeProgs),
      rewardData: rewardSummary,
      rewardTercapai: isReached,
      rewardType: primaryType,
      rewardNilai: primaryNilai.toString(),
      statusPencairan: isReached ? 'siap_dicairkan' : 'tidak_ada_reward'
    }).returning();
    
    const inserted = records[0];

    // 5. Update overall progress
    await recalculateCustomerPromos(pelangganId, branchId, brandCode, tx);
    
    return inserted;
  });
}

export async function recalculateCustomerPromos(pelangganId: number, branchId: number, brandCode?: string, tx?: any) {
  const startTime = Date.now();
  const now = new Date();
  console.log(`[PROMO] Starting advanced recalculation for Customer ${pelangganId} at Branch ${branchId}...`);
  
  const process = async (internalTx: any) => {
    // 1. Fetch Foundations (Customer & Integrated Transactions)
    const [customer] = await internalTx.select({ code: salesCustomers.code }).from(salesCustomers).where(eq(salesCustomers.id, pelangganId)).limit(1);
    if (!customer) throw new Error("Customer not found during recalculation");

    const transactionsRaw = await internalTx.select({
        id: promoIntegratedTransactions.id,
        qty: promoIntegratedTransactions.qty,
        nilaiFaktur: promoIntegratedTransactions.nilaiFaktur,
        tanggalFaktur: promoIntegratedTransactions.tanggalFaktur,
        noFaktur: promoIntegratedTransactions.noFaktur,
        brandCode: promoBrands.name
      })
      .from(promoIntegratedTransactions)
      .innerJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
      .where(and(
        eq(promoIntegratedTransactions.pelangganId, pelangganId),
        eq(promoIntegratedTransactions.branchId, branchId)
      ));
    
    // Map for compatibility with existing calculation logic
    const transactions = transactionsRaw.map((t: any) => ({
      ...t,
      tglFaktur: t.tanggalFaktur
    }));

    if (transactions.length === 0) return;

    const txIds = transactions.map((t: any) => t.id);
    const invNums = transactions.map((t: any) => (t.noFaktur || "").trim().toLowerCase()).filter(Boolean);

    // 2. Pre-fetch Masters & Existing Progress
    const allMasters = {
      pSaldos: await internalTx.select().from(pointSaldo).where(and(eq(pointSaldo.pelangganId, pelangganId), eq(pointSaldo.branchId, branchId))),
      cProgs: await internalTx.select().from(cuttingProgress).where(and(eq(cuttingProgress.pelangganId, pelangganId), eq(cuttingProgress.branchId, branchId))),
      pkProgs: await internalTx.select().from(paketProgress).where(and(eq(paketProgress.pelangganId, pelangganId), eq(paketProgress.branchId, branchId))),
      pTiers: await internalTx.select().from(paketTier).innerJoin(paketMaster, eq(paketTier.paketId, paketMaster.id)).where(eq(paketMaster.branchId, branchId)),
      pMasters: await internalTx.select().from(paketMaster).where(eq(paketMaster.branchId, branchId)),
      cMasters: await internalTx.select().from(cuttingMaster).where(eq(cuttingMaster.branchId, branchId)),
      cbMasters: await internalTx.select().from(cashbackMaster).where(eq(cashbackMaster.branchId, branchId)),
      cbRewards: await internalTx.select().from(cashbackReward).where(and(eq(cashbackReward.pelangganId, pelangganId), eq(cashbackReward.branchId, branchId))),
      pointHadiahMasters: await internalTx.select().from(pointHadiah).where(eq(pointHadiah.branchId, branchId)),
      pointRuleMasters: await internalTx.select().from(pointRule).where(eq(pointRule.branchId, branchId)),
      
      prMasters: await internalTx.select({ program: principalProgram, principal: principalMaster })
        .from(principalProgram)
        .innerJoin(principalMaster, eq(principalProgram.principalId, principalMaster.id))
        .where(eq(principalProgram.branchId, branchId)),
      prTiers: await internalTx.select().from(principalTier).where(eq(principalTier.branchId, branchId)),
      prSubs: await internalTx.select().from(principalSubscription).where(and(eq(principalSubscription.pelangganId, pelangganId), eq(principalSubscription.branchId, branchId))),
      prClaims: await internalTx.select().from(principalClaim).where(and(eq(principalClaim.pelangganId, pelangganId), eq(principalClaim.branchId, branchId))),
      
      mappings: await internalTx.select().from(pelangganProgram).where(and(eq(pelangganProgram.pelangganId, pelangganId), eq(pelangganProgram.branchId, branchId), eq(pelangganProgram.status, 'aktif'))),
      mappingsPrincipal: await internalTx.select().from(pelangganProgramPrincipal).where(and(eq(pelangganProgramPrincipal.pelangganId, pelangganId), eq(pelangganProgramPrincipal.branchId, branchId), eq(pelangganProgramPrincipal.status, 'aktif')))
    };

    // 3. Clear Dynamic (Calculation-based) Results
    if (txIds.length > 0) {
      await internalTx.delete(promoHasil).where(inArray(promoHasil.transaksiId, txIds));
      await internalTx.delete(principalClaim).where(and(
        eq(principalClaim.pelangganId, pelangganId),
        eq(principalClaim.branchId, branchId),
        eq(principalClaim.status, 'belum_klaim')
      ));
    }
    if (invNums.length > 0) {
      await internalTx.delete(pointLogs).where(and(inArray(pointLogs.invoiceNumber, invNums), eq(pointLogs.type, 'earn'), eq(pointLogs.branchId, branchId)));
      await internalTx.delete(labelQuotas).where(and(inArray(labelQuotas.invoiceNumber, invNums), eq(labelQuotas.branchId, branchId)));
    }

    // 4. In-Memory Aggregators (Grouped by Period where applicable)
    const pointsState = new Map<string, any>(allMasters.pSaldos.map((s: any) => [s.brandCode, { ...s, saldoPoin: 0, totalDiperoleh: 0 }]));
    const cuttingState = new Map<number, any>(allMasters.cProgs.map((p: any) => [p.cuttingId, { ...p, totalLabel: 0, totalNilai: "0" }]));
    
    // Key: programId_periodeIdentifier
    const paketState = new Map<string, any>();
    const principalState = new Map<string, any>();
    const cbRewardState = new Map<string, any>(); 
    
    const logs = {
      cashbacks: [] as any[],
      points: [] as any[],
      labels: [] as any[],
      prClaims: [] as any[]
    };

    // 5. Aggregation Phase
    for (const t of transactions) {
      const tBrand = (t.brandCode || 'FERIO').trim().toLowerCase();
      const tNoFaktur = (t.noFaktur || "").trim();
      const tDate = new Date(t.tglFaktur);
      if (isNaN(tDate.getTime())) {
        console.error(`[PROMO] Skipping transaction ${t.noFaktur} due to invalid date: ${t.tglFaktur}`);
        continue;
      }
      
      const activeMappings = allMasters.mappings.filter((m: any) => (m.brandCode || "FERIO").toLowerCase() === tBrand);
      
      for (const m of activeMappings) {
        // Cashback
        if (m.jenisProgram === 'cashback') {
          const pm = allMasters.cbMasters.find((x: any) => x.id === m.referensiId);
          if (pm) {
            if (pm.tipeSyarat === 'bersyarat') {
              const { identifier, start, end } = getPeriodeRange((pm.siklus as any) || 'per_bulan', tDate);
              const key = `${pm.id}_${identifier}`;
              if (!cbRewardState.has(key)) {
                cbRewardState.set(key, { 
                  pelangganId, cashbackId: pm.id, periode: identifier, 
                  periodeStart: start, periodeEnd: end,
                  totalTransaksiPeriode: 0, branchId, master: pm 
                });
              }
              cbRewardState.get(key).totalTransaksiPeriode += Number(t.nilaiFaktur);
            } else {
              const val = pm.tipeCashback === 'persen' ? Number(t.nilaiFaktur) * (Number(pm.nilai) / 100) : Number(pm.nilai);
              if (val > 0) logs.cashbacks.push({ transaksiId: t.id, cashbackId: pm.id, nilaiCashback: val.toString(), branchId });
            }
          }
        }

        // Points
        if (m.jenisProgram === 'point') {
          const prog = allMasters.pointHadiahMasters.find((x: any) => x.id === m.referensiId);
          if (prog) {
            const rules = allMasters.pointRuleMasters.filter((r: any) => r.programId === prog.id);
            let earn = 0;
            for (const r of rules) {
              if (r.tipe === 'nominal') earn += Math.floor(Number(t.nilaiFaktur) / Number(r.nilaiKonversi)) * Number(r.poinDihasilkan);
              else if (r.tipe === 'qty') earn += Math.floor(t.qty / Number(r.nilaiKonversi)) * Number(r.poinDihasilkan);
            }
            if (earn > 0) {
              if (!pointsState.has(tBrand)) pointsState.set(tBrand, { brandCode: tBrand, pelangganId, branchId, saldoPoin: 0, totalDiperoleh: 0, totalDitukar: "0", updatedAt: new Date() });
              const state = pointsState.get(tBrand);
              state.saldoPoin += earn;
              state.totalDiperoleh += earn;
              logs.points.push({ customerCode: customer.code, point: earn, type: 'earn', invoiceNumber: tNoFaktur, brandCode: tBrand, branchId });
            }
          }
        }

        // Cashback (Auto-Hasil for PER_TRANSAKSI or reached BERSYARAT)
        const previews = await calculatePromos(pelangganId, t.qty, Number(t.nilaiFaktur), tDate, tBrand, branchId, false, internalTx);
        if (previews.cashbacks.length > 0) {
           for (const cb of previews.cashbacks) {
              if (cb.isReached) {
                 // Sync to promo_hasil
                 const [existingHasil] = await internalTx.select().from(promoHasil).where(and(eq(promoHasil.transaksiId, t.id), eq(promoHasil.cashbackId, cb.id))).limit(1);
                 let hId = existingHasil?.id;
                 if (!existingHasil) {
                    const [ins] = await internalTx.insert(promoHasil).values({
                       transaksiId: t.id, cashbackId: cb.id, nilaiCashback: cb.nilai.toString(), branchId, status: 'SIAP'
                    }).returning({ id: promoHasil.id });
                    hId = ins.id;
                 }

                 // Sync to pencairan_rewards (QUEUE)
                 const [existingPencairan] = await internalTx.select().from(pencairanRewards).where(and(
                    eq(pencairanRewards.transaksiId, t.id),
                    eq(pencairanRewards.rewardType, 'cashback')
                 )).limit(1);

                 if (!existingPencairan) {
                    await internalTx.insert(pencairanRewards).values({
                       transaksiId: t.id, pelangganId, rewardType: 'cashback', nilaiReward: cb.nilai.toString(), branchId, status: 'siap_dicairkan'
                    });
                 }
              }
           }
        }

        // Cutting
        if (m.jenisProgram === 'cutting') {
          const ctM = allMasters.cMasters.find((x: any) => x.id === m.referensiId);
          if (ctM) {
            if (!cuttingState.has(ctM.id)) cuttingState.set(ctM.id, { cuttingId: ctM.id, pelangganId, branchId, totalLabel: 0, totalNilai: "0", statusCair: 'belum', updatedAt: new Date() });
            const state = cuttingState.get(ctM.id);
            state.totalLabel += t.qty;
            state.totalNilai = (parseFloat(state.totalNilai) + (t.qty * parseFloat(ctM.nilaiPerLabel || "0"))).toString();
            logs.labels.push({ customerCode: customer.code, amount: t.qty, invoiceNumber: tNoFaktur, productName: ctM.nama, brandCode: tBrand, branchId });
          }
        }

        // Paket
        if (m.jenisProgram === 'paket') {
          const pM = allMasters.pMasters.find((x: any) => x.id === m.referensiId);
          if (pM) {
            const { identifier, start, end } = getPeriodeRange((pM.siklus as any) || 'per_bulan', tDate);
            const key = `${pM.id}_${identifier}`;
            if (!paketState.has(key)) {
              paketState.set(key, { 
                paketId: pM.id, pelangganId, branchId, periode: identifier, periodeStart: start, periodeEnd: end,
                totalQty: "0", totalNilai: "0", currentTierId: null, status: 'berjalan', statusPeriode: 'on_track',
                totalRewardCalculated: "0", totalRewardClaimed: "0", lastClaimDate: null, 
                master: pM
              });
            }
            const state = paketState.get(key);
            state.totalQty = (parseFloat(state.totalQty) + t.qty).toString();
            state.totalNilai = (parseFloat(state.totalNilai) + Number(t.nilaiFaktur)).toString();
          }
        }

        // Principal (Old/Backup source)
        if (m.jenisProgram === 'principal') {
          const mData = allMasters.prMasters.find((x: any) => x.program.id === m.referensiId);
          if (mData) {
            const pM = mData.program;
            const pP = mData.principal;
            const { identifier, start, end } = getPeriodeRange((pM.siklus as any) || 'per_bulan', tDate);
            const key = `${pM.id}_${identifier}`;
            if (!principalState.has(key)) {
              principalState.set(key, {
                programId: pM.id, pelangganId, branchId, periodeSiklus: identifier, periodeStart: start, periodeEnd: end,
                totalQty: "0", totalNilai: "0", currentTierId: null, status: 'berjalan', statusPeriode: 'on_track',
                totalRewardCalculated: "0", totalRewardClaimed: "0", lastClaimDate: null,
                master: pM, principal: pP
              });
            }
            const state = principalState.get(key);
            state.totalQty = (parseFloat(state.totalQty) + t.qty).toString();
            state.totalNilai = (parseFloat(state.totalNilai) + Number(t.nilaiFaktur)).toString();
          }
        }
      }

      // NEW: Principal Program (New standalone table)
      const activePrincipalMappings = allMasters.mappingsPrincipal.filter((m: any) => {
         const pM = allMasters.prMasters.find((x: any) => x.program.id === m.programPrincipalId)?.program;
         if (!pM) return false;
         const brandMatches = (pM.brandCode || "SEMUA").toLowerCase() === tBrand || (pM.brandCode || "SEMUA").toLowerCase() === 'semua';
         return brandMatches;
      });

      for (const m of activePrincipalMappings) {
        const mData = allMasters.prMasters.find((x: any) => x.program.id === m.programPrincipalId);
        if (mData) {
          const pM = mData.program;
          const pP = mData.principal;
          const { identifier, start, end } = getPeriodeRange((pM.siklus as any) || 'per_bulan', tDate);
          const key = `${pM.id}_${identifier}`;
          if (!principalState.has(key)) {
             principalState.set(key, {
                programId: pM.id, pelangganId, branchId, periodeSiklus: identifier, periodeStart: start, periodeEnd: end,
                totalQty: "0", totalNilai: "0", currentTierId: null, status: 'berjalan', statusPeriode: 'on_track',
                totalRewardCalculated: "0", totalRewardClaimed: "0", lastClaimDate: null,
                master: pM, principal: pP
             });
          }
          const state = principalState.get(key);
          state.totalQty = (parseFloat(state.totalQty) + t.qty).toString();
          state.totalNilai = (parseFloat(state.totalNilai) + Number(t.nilaiFaktur)).toString();
        }
      }
    }

    // 6. Post-Aggregation logic (Status & Rewards)
    
    // Process Paket Progress
    for (const state of Array.from(paketState.values())) {
      const pM = state.master;
      const tiers = allMasters.pTiers.filter((x: any) => x.paket_tier.paketId === pM.id).map((x: any) => x.paket_tier).sort((a: any, b: any) => b.urutanTier - a.urutanTier);
      
      let tid: number | null = null;
      let rewardCalc = 0;
      const val = pM.basisType === 'qty' ? parseFloat(state.totalQty) : parseFloat(state.totalNilai);
      
      for (const tr of tiers) {
        if (val >= parseFloat(tr.minValue)) {
          tid = tr.id;
          rewardCalc = tr.rewardType === 'percent' ? parseFloat(state.totalNilai) * (parseFloat(tr.rewardPercent || "0") / 100) : parseFloat(tr.rewardValue || "0");
          break;
        }
      }

      const [existing] = await internalTx.select().from(paketProgress).where(and(
        eq(paketProgress.pelangganId, pelangganId),
        eq(paketProgress.paketId, pM.id),
        eq(paketProgress.periode, state.periode),
        eq(paketProgress.branchId, branchId!)
      )).limit(1);
      
      const { status, statusPeriode, persenProgress } = getStatusDetails({ 
        now, masaBerlakuSelesai: pM.endDate, periodeStart: state.periodeStart, periodeEnd: state.periodeEnd, 
        currentValue: val, targetValue: tid ? tiers.find((t: any) => t.id === tid)?.minValue : (tiers[0]?.minValue || 0)
      });

      state.currentTierId = tid;
      state.totalRewardCalculated = rewardCalc.toString();
      state.status = status;
      state.statusPeriode = statusPeriode;
      state.persenTercapai = persenProgress.toString();
      
      if (existing) {
        state.totalRewardClaimed = existing.totalRewardClaimed;
        state.lastClaimDate = existing.lastClaimDate;
        await internalTx.update(paketProgress).set(state).where(eq(paketProgress.id, existing.id));
      } else {
        await internalTx.insert(paketProgress).values(state);
      }

      // Sync to pencairan_rewards (QUEUE) for Paket
      if (tid && (Number(state.totalRewardCalculated) > Number(state.totalRewardClaimed))) {
          const [latestTx] = await internalTx.select({ id: promoIntegratedTransactions.id })
            .from(promoIntegratedTransactions)
            .where(and(eq(promoIntegratedTransactions.pelangganId, pelangganId), eq(promoIntegratedTransactions.branchId, branchId)))
            .orderBy(desc(promoIntegratedTransactions.tanggalFaktur), desc(promoIntegratedTransactions.id))
            .limit(1);

          if (latestTx) {
             const [existingPencairan] = await internalTx.select().from(pencairanRewards).where(and(
                eq(pencairanRewards.pelangganId, pelangganId),
                eq(pencairanRewards.rewardType, 'paket'),
                eq(pencairanRewards.status, 'siap_dicairkan')
             )).limit(1);

             if (!existingPencairan) {
                await internalTx.insert(pencairanRewards).values({
                   transaksiId: latestTx.id, pelangganId, rewardType: 'paket', 
                   nilaiReward: (Number(state.totalRewardCalculated) - Number(state.totalRewardClaimed)).toString(), 
                   branchId, status: 'siap_dicairkan'
                });
             }
          }
      }
    }

    // Process Principal Progress
    for (const state of Array.from(principalState.values())) {
      const pM = state.master;
      const pP = state.principal;
      const tiers = allMasters.prTiers.filter((x: any) => x.programId === pM.id).sort((a: any, b: any) => b.urutanTier - a.urutanTier);
      
      let tid: number | null = null;      let achievedTier: any = null;
      let internalCalc = 0;
      let principalCalc = 0;
      const val = pM.basisType === 'qty' ? parseFloat(state.totalQty) : parseFloat(state.totalNilai);

      for (const tr of tiers) {
        if (val >= parseFloat(tr.minValue)) {
          tid = tr.id;
          achievedTier = tr;
          
          if (tr.rewardPerusahaanType === 'percent') {
              internalCalc = (pM.basisType === 'nilai' ? parseFloat(state.totalNilai) : 0) * (Number(tr.rewardPerusahaanPercent || 0) / 100);
          } else if (tr.rewardPerusahaanType === 'uang') {
              internalCalc = Number(tr.rewardPerusahaanValue || 0);
          }

          if (tr.rewardPrincipalType === 'percent') {
              principalCalc = (pM.basisType === 'nilai' ? parseFloat(state.totalNilai) : 0) * (Number(tr.rewardPrincipalPercent || 0) / 100);
          } else if (tr.rewardPrincipalType === 'uang') {
              principalCalc = Number(tr.rewardPrincipalValue || 0);
          }
          break;
        }
      }

      const { status, statusPeriode, persenProgress } = getStatusDetails({
        now, masaBerlakuSelesai: pM.endDate, periodeStart: state.periodeStart, periodeEnd: state.periodeEnd,
        currentValue: val, targetValue: tid ? tiers.find((t: any) => t.id === tid)?.minValue : (tiers[0]?.minValue || 0)
      });

      state.currentTierId = tid;
      state.totalRewardCalculated = (internalCalc + principalCalc).toString();
      state.status = status;
      state.statusPeriode = statusPeriode;
      state.persenTercapai = persenProgress.toString();
      
      const [existing] = await internalTx.select().from(principalSubscription).where(and(
         eq(principalSubscription.pelangganId, pelangganId),
         eq(principalSubscription.programId, pM.id),
         eq(principalSubscription.periodeSiklus, state.periodeSiklus),
         eq(principalSubscription.branchId, branchId)
      )).limit(1);

      let subId = 0;
      if (existing) {
         subId = existing.id;
         state.totalRewardClaimed = existing.totalRewardClaimed;
         state.lastClaimDate = existing.lastClaimDate;
         await internalTx.update(principalSubscription).set(state).where(eq(principalSubscription.id, existing.id));
      } else {
         const [ins] = await internalTx.insert(principalSubscription).values(state).returning({ id: principalSubscription.id });
         subId = ins.id;
      }

      // Sync to principal_claim and pencairan_rewards
      if (tid && achievedTier && (Number(state.totalRewardCalculated) > Number(state.totalRewardClaimed))) {
          // Check if claim for this tier already exists
          const [existingClaim] = await internalTx.select().from(principalClaim).where(and(
             eq(principalClaim.subscriptionId, subId),
             eq(principalClaim.tierId, tid)
          )).limit(1);

          if (!existingClaim) {
             await internalTx.insert(principalClaim).values({
                subscriptionId: subId,
                programId: pM.id,
                tierId: tid,
                pelangganId,
                principalId: pP.id,
                rewardPrincipalType: achievedTier.rewardPrincipalType,
                rewardPrincipalDesc: achievedTier.rewardPrincipalDesc,
                rewardPrincipalValue: principalCalc.toString(),
                nilaiRewardTotal: state.totalRewardCalculated,
                tanggunganPrincipal: principalCalc.toString(),
                tanggunganInternal: internalCalc.toString(),
                nilaiKlaim: principalCalc.toString(),
                status: 'belum_klaim',
                branchId
             });

             // Also sync to general pencairan_rewards
             const [latestTx] = await internalTx.select({ id: promoIntegratedTransactions.id })
                .from(promoIntegratedTransactions)
                .where(and(eq(promoIntegratedTransactions.pelangganId, pelangganId), eq(promoIntegratedTransactions.branchId, branchId)))
                .orderBy(desc(promoIntegratedTransactions.tanggalFaktur), desc(promoIntegratedTransactions.id))
                .limit(1);

             if (latestTx) {
                await internalTx.insert(pencairanRewards).values({
                   transaksiId: latestTx.id,
                   pelangganId,
                   rewardType: 'principal',
                   nilaiReward: (Number(state.totalRewardCalculated) - Number(state.totalRewardClaimed)).toString(),
                   branchId,
                   status: 'siap_dicairkan'
                });
             }
          }
      }
    }

    // Finally, persist everything else
    if (logs.cashbacks.length > 0) await internalTx.insert(promoHasil).values(logs.cashbacks);
    if (logs.points.length > 0) await internalTx.insert(pointLogs).values(logs.points);
    if (logs.labels.length > 0) await internalTx.insert(labelQuotas).values(logs.labels);
    if (logs.prClaims.length > 0) await internalTx.insert(principalClaim).values(logs.prClaims);

    // Points persistence
    for (const s of Array.from(pointsState.values())) {
      const { id, ...data } = s as any;
      if (id) await internalTx.update(pointSaldo).set({ ...data, updatedAt: new Date() }).where(eq(pointSaldo.id, id));
      else await internalTx.insert(pointSaldo).values({ ...data, updatedAt: new Date() });
    }

    // Cutting persistence
    for (const s of Array.from(cuttingState.values())) {
      const { id, ...data } = s as any;
      if (id) await internalTx.update(cuttingProgress).set({ ...data, updatedAt: new Date() }).where(eq(cuttingProgress.id, id));
      else await internalTx.insert(cuttingProgress).values({ ...data, updatedAt: new Date() });
    }

    // Cashback Rewards (Monthly) persistence
    for (const state of Array.from(cbRewardState.values())) {
      const pm = state.master;
      const isReached = state.totalTransaksiPeriode >= Number(pm.minTransaksi);
      let nilaiCb = 0;
      if (isReached) {
        nilaiCb = pm.tipeCashback === 'persen' ? state.totalTransaksiPeriode * (Number(pm.nilai) / 100) : Number(pm.nilai);
        if (pm.maksCashback) nilaiCb = Math.min(nilaiCb, Number(pm.maksCashback));
      }
      
      const { status, statusPeriode, persenProgress } = getStatusDetails({
        now, masaBerlakuSelesai: pm.masaBerlakuSelesai, 
        periodeStart: state.periodeStart, periodeEnd: state.periodeEnd,
        currentValue: state.totalTransaksiPeriode, targetValue: Number(pm.minTransaksi)
      });

      const existing = allMasters.cbRewards.find((r: any) => r.cashbackId === pm.id && r.periode === state.periode);
      if (existing) {
        if (existing.status !== 'dicairkan') {
          await internalTx.update(cashbackReward).set({
            totalTransaksiPeriode: state.totalTransaksiPeriode.toString(),
            nilaiCashback: nilaiCb.toString(),
            status: isReached ? 'tercapai' : status,
            statusPeriode, persenTercapai: persenProgress.toString(),
            updatedAt: new Date()
          }).where(eq(cashbackReward.id, existing.id));
        }
      } else {
        await internalTx.insert(cashbackReward).values({
          pelangganId, cashbackId: pm.id, periode: state.periode, 
          totalTransaksiPeriode: state.totalTransaksiPeriode.toString(), nilaiCashback: nilaiCb.toString(), 
          status: isReached ? 'tercapai' : status, statusPeriode, persenTercapai: persenProgress.toString(),
          branchId, createdAt: new Date(), updatedAt: new Date()
        });
      }
    }
  };

  if (tx) await process(tx);
  else await db.transaction(async (newTx) => await process(newTx));

  console.log(`[PROMO] Recalculation COMPLETED in ${Date.now() - startTime}ms`);
}

export async function deleteTransaksiPromo(idRaw: number | string, branchIdRaw: number | string, isSuperAdmin: boolean = false) {
  const id = Number(idRaw);
  const branchIdFromReq = Number(branchIdRaw);
  console.log(`[DEBUG] Attempting to delete transaction ID: ${id} at Branch: ${branchIdFromReq} (isSuperAdmin: ${isSuperAdmin})`);
  return await db.transaction(async (tx) => {
    // Only search in promo_integrated_transactions
    const existingNewAll = await tx.select({
        id: promoIntegratedTransactions.id,
        pelangganId: promoIntegratedTransactions.pelangganId,
        branchId: promoIntegratedTransactions.branchId,
        brandCode: promoBrands.name,
        noFaktur: promoIntegratedTransactions.noFaktur
      })
      .from(promoIntegratedTransactions)
      .leftJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
      .where(eq(promoIntegratedTransactions.id, id));

    if (existingNewAll.length === 0) {
      throw new Error("Transaksi tidak ditemukan.");
    }

    const t = existingNewAll[0];
    if (!isSuperAdmin && Number(t.branchId) !== Number(branchIdFromReq)) {
        throw new Error(`Transaksi ID ${id} milik Cabang ${t.branchId} (Anda berafiliasi dengan Cabang ${branchIdFromReq}).`);
    }
    
    const { pelangganId, brandCode } = t;
    const branchId = t.branchId as number;

    await tx.delete(promoHasil).where(eq(promoHasil.transaksiId, id));
    await tx.delete(promoIntegratedTransactions).where(eq(promoIntegratedTransactions.id, id));

    if (t.noFaktur) {
        const invoiceClean = t.noFaktur.trim();
        await tx.delete(pointLogs).where(and(
            eq(pointLogs.invoiceNumber, invoiceClean),
            eq(pointLogs.branchId, branchId),
            eq(pointLogs.type, 'earn')
        ));
        await tx.delete(labelQuotas).where(and(
            eq(labelQuotas.invoiceNumber, invoiceClean),
            eq(labelQuotas.branchId, branchId)
        ));
    }
    
    await recalculateCustomerPromos(pelangganId, branchId, brandCode || "", tx);
    return { success: true, table: 'integrated' };
  });
}

export async function getConsolidatedMonitoring(branchId: number) {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const diffDays = (date: Date, fromDate?: Date) => {
    if (!date) return 0;
    const d1 = new Date(date);
    const d2 = fromDate ? new Date(fromDate) : new Date();
    d1.setHours(0,0,0,0);
    d2.setHours(0,0,0,0);
    return Math.ceil((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  };

  // 1. Fetch Masters
  const cbMasters = await db.select({ 
      id: cashbackMaster.id, nama: cashbackMaster.nama, status: cashbackMaster.status, 
      minTransaksi: cashbackMaster.minTransaksi, masaBerlakuSelesai: cashbackMaster.masaBerlakuSelesai,
      tipeSyarat: cashbackMaster.tipeSyarat, brandCode: cashbackMaster.brandCode
    })
    .from(cashbackMaster)
    .where(and(eq(cashbackMaster.branchId, branchId), eq(cashbackMaster.status, 'aktif')));

  const pkMasters = await db.select({
      id: paketMaster.id, nama: paketMaster.nama, status: paketMaster.status, 
      basisType: paketMaster.basisType, siklus: paketMaster.siklus, endDate: paketMaster.endDate,
      brandCode: paketMaster.brandCode
    })
    .from(paketMaster)
    .where(and(eq(paketMaster.branchId, branchId), eq(paketMaster.status, 'aktif')));

  const prMasters = await db.select({
      id: principalProgram.id, nama: principalProgram.nama,
      periodeBulan: principalProgram.periodeBulan, basisType: principalProgram.basisType,
      endDate: principalProgram.endDate, brandCode: principalProgram.brandCode
    })
    .from(principalProgram)
    .where(and(eq(principalProgram.branchId, branchId), eq(principalProgram.status, 'aktif')));

  const pkTiers = await db.select().from(paketTier).where(inArray(paketTier.paketId, pkMasters.length > 0 ? pkMasters.map(m => m.id) : [0]));
  const ptMasters = await db.select().from(pointHadiah).where(and(eq(pointHadiah.branchId, branchId), eq(pointHadiah.status, 'aktif')));
  const ptRewards = await db.select().from(pointReward).where(inArray(pointReward.programId, ptMasters.length > 0 ? ptMasters.map(m => m.id) : [0]));
  const prTiers = await db.select().from(principalTier).where(inArray(principalTier.programId, prMasters.length > 0 ? prMasters.map(m => m.id) : [0]));

  // 2. Aggregate Transactions from promo_integrated_transactions
  const transactionStats = await db.select({
      pelangganId: promoIntegratedTransactions.pelangganId,
      totalOmzet: sql<number>`SUM(${promoIntegratedTransactions.nilaiFaktur})`,
      totalQty: sql<number>`SUM(${promoIntegratedTransactions.qty})`,
      countFaktur: sql<number>`COUNT(*)`
    })
    .from(promoIntegratedTransactions)
    .where(eq(promoIntegratedTransactions.branchId, branchId))
    .groupBy(promoIntegratedTransactions.pelangganId);

  const autoTransactions = await db.select({
      id: promoIntegratedTransactions.id,
      pelangganId: promoIntegratedTransactions.pelangganId,
      nilaiFaktur: promoIntegratedTransactions.nilaiFaktur,
      qty: promoIntegratedTransactions.qty,
      rewardData: promoIntegratedTransactions.rewardData,
      brandCode: promoBrands.name
    })
    .from(promoIntegratedTransactions)
    .leftJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
    .where(eq(promoIntegratedTransactions.branchId, branchId));

  const autoRewards = await db.select({
      id: promoHasil.id,
      transaksiId: promoHasil.transaksiId,
      nilaiCashback: promoHasil.nilaiCashback,
      promoName: cashbackMaster.nama
    })
    .from(promoHasil)
    .innerJoin(cashbackMaster, eq(promoHasil.cashbackId, cashbackMaster.id))
    .where(eq(promoHasil.branchId, branchId));

  // Logika Filter Merek & Pelanggan: Kelompokkan transaksi per Pelanggan dan Merek
  const txByCustBrand = new Map<number, Map<string, typeof autoTransactions>>();
  autoTransactions.forEach(tx => {
    const pId = tx.pelangganId;
    const b = (tx.brandCode || 'FERIO').toUpperCase();
    if (!txByCustBrand.has(pId)) txByCustBrand.set(pId, new Map());
    if (!txByCustBrand.get(pId)!.has(b)) txByCustBrand.get(pId)!.set(b, []);
    txByCustBrand.get(pId)!.get(b)!.push(tx);
  });

  const transactionPelangganIds = transactionStats.map(t => t.pelangganId);
  
  // Ambil semua pelanggan yang memiliki program AKTIF di cabang ini
  const activePromoCustIds = await db.select({ id: pelangganProgram.id, pelangganId: pelangganProgram.pelangganId })
    .from(pelangganProgram)
    .where(and(eq(pelangganProgram.branchId, branchId), eq(pelangganProgram.status, 'aktif')));
  
  const allRelevantPelangganIds = transactionPelangganIds;

  if (allRelevantPelangganIds.length === 0) return [];

  const relevantCustomers = await db.select({ 
      id: salesCustomers.id, 
      code: salesCustomers.code, 
      name: salesCustomers.name,
      phone: salesCustomers.phone
    })
    .from(salesCustomers)
    .where(inArray(salesCustomers.id, allRelevantPelangganIds));
  
  const custMap = new Map(relevantCustomers.map(c => [c.id, c]));

  const txIds = autoTransactions.map(t => t.id);
  let autoCashbacks: any[] = [];
  if (txIds.length > 0) {
    autoCashbacks = await db.select().from(promoHasil).where(inArray(promoHasil.transaksiId, txIds));
  }

  const aPaketProgress = await db.select().from(paketProgress).where(and(eq(paketProgress.branchId, branchId), inArray(paketProgress.pelangganId, allRelevantPelangganIds)));
  const aPrincipalSubs = await db.select().from(principalSubscription).where(and(eq(principalSubscription.branchId, branchId), inArray(principalSubscription.pelangganId, allRelevantPelangganIds)));
  const aCashbackRewards = await db.select().from(cashbackReward).where(and(eq(cashbackReward.branchId, branchId), inArray(cashbackReward.pelangganId, allRelevantPelangganIds)));
  const aPointSaldos = await db.select().from(pointSaldo).where(and(eq(pointSaldo.branchId, branchId), inArray(pointSaldo.pelangganId, allRelevantPelangganIds)));
  const aPelangganPrograms = await db.select().from(pelangganProgram).where(and(eq(pelangganProgram.branchId, branchId), eq(pelangganProgram.status, 'aktif'), inArray(pelangganProgram.pelangganId, allRelevantPelangganIds.length > 0 ? allRelevantPelangganIds : [0])));
  const aPelangganProgramsPrincipal = await db.select().from(pelangganProgramPrincipal).where(and(eq(pelangganProgramPrincipal.branchId, branchId), eq(pelangganProgramPrincipal.status, 'aktif'), inArray(pelangganProgramPrincipal.pelangganId, allRelevantPelangganIds.length > 0 ? allRelevantPelangganIds : [0])));

  const customerMap = new Map<number, any>();
  
  relevantCustomers.forEach(c => {
    customerMap.set(c.id, {
      id: c.id,
      pelangganId: c.id,
      pelangganNama: c.name,
      customerCode: c.code,
      totalOmzet: 0,
      totalReward: 0,
      rewardDetails: { cashback: 0, point: 0, label: 0, paket: 0, principal: 0 },
      countFaktur: 0,
      activePromos: [],
      customerStatus: 'SAFE' 
    });
  });

  transactionStats.forEach(stat => {
    const entry = customerMap.get(stat.pelangganId);
    if (entry) {
      entry.totalOmzet = Number(stat.totalOmzet || 0);
      entry.countFaktur = Number(stat.countFaktur || 0);
    }
  });

  // Calculate rewards from reward_data JSON column in promo_integrated_transactions
  autoTransactions.forEach(at => {
    const entry = customerMap.get(at.pelangganId);
    if (entry && at.rewardData) {
      const rd = at.rewardData as any;
      
      // Cashback
      if (rd.cashbacks && Array.isArray(rd.cashbacks)) {
        rd.cashbacks.forEach((cb: any) => {
          const val = Number(cb.nilai || 0);
          entry.totalReward += val;
          entry.rewardDetails.cashback += val;
        });
      } else if (rd.cashback && rd.cashback.tercapai) {
        const val = Number(rd.cashback.nilai || 0);
        entry.totalReward += val;
        entry.rewardDetails.cashback += val;
      }
      
      // Points
      if (rd.points && rd.points.tercapai) {
         // Points handled in separate point_saldo table usually, but we can track peroleh here if needed
      }

      // Cutting Label
      if (rd.cutting) {
        if (Array.isArray(rd.cutting)) {
          rd.cutting.forEach((c: any) => {
            const val = Number(c.nilaiTotal || 0);
            entry.totalReward += val;
            entry.rewardDetails.label += val;
          });
        } else if (rd.cutting.tercapai) {
          const val = Number(rd.cutting.nilai || 0);
          entry.totalReward += val;
          entry.rewardDetails.label += val;
        }
      }

      // Principal & Paket (New unified reward_data)
      if (rd.principal && rd.principal.tercapai) {
        const val = Number(rd.principal.total || 0);
        entry.totalReward += val;
        entry.rewardDetails.cashback += Number(rd.principal.porsi_perusahaan || 0); // Monitoring uses totalReward but details might differ
      }
      if (rd.paket && rd.paket.tercapai) {
        const val = Number(rd.paket.calculatedValue || rd.paket.nilai || 0);
        entry.totalReward += val;
      }
    }
  });

  // 5. Build Final Map with Advanced Logic
  for (const [pId, entry] of Array.from(customerMap.entries())) {
    const myPrograms = [
      ...aPelangganPrograms.filter(p => p.pelangganId === pId),
      ...aPelangganProgramsPrincipal.filter(p => p.pelangganId === pId).map(p => ({
        ...p,
        jenisProgram: 'principal',
        referensiId: p.programPrincipalId
      }))
    ];
    let worstStatusRank = 0; // 0=SAFE, 1=ON TRACK, 2=WARNING, 3=CRITICAL, 4=HANGUS, 5=EXPIRED
    const statusRankMap = { 'safe': 0, 'on_track': 1, 'warning': 2, 'critical': 3, 'hangus': 4, 'expired': 5 };

    const myActiveBrands = txByCustBrand.get(pId) || new Map<string, any>();

    for (const prog of myPrograms) {
      let promoInfo: any = null;
      const currentMonth = format(now, 'yyyy-MM');

      if (prog.jenisProgram === 'cashback') {
        const m = cbMasters.find(x => x.id === prog.referensiId);
        if (m && m.tipeSyarat === 'bersyarat') {
          const brandCode = (m as any).brandCode || 'FERIO';
          // BRAND FILTER: Only show if customer has transactions for this brand
          if (!myActiveBrands.has(brandCode.toUpperCase())) continue;

          const myTxs = myActiveBrands.get(brandCode.toUpperCase()) || [];
          const { identifier, start, end } = getPeriodeRange('per_bulan', now);
          
          // Filter transactions for CURRENT month
          const curVal = myTxs
            .filter((tx: any) => {
               return true; 
            })
            .reduce((sum: number, tx: any) => sum + Number(tx.nilaiFaktur), 0);

          const target = Number(m.minTransaksi);
          
          const stats = getStatusDetails({
            now, masaBerlakuSelesai: m.masaBerlakuSelesai, periodeStart: start, periodeEnd: end,
            currentValue: curVal, targetValue: target
          });

          promoInfo = {
            id: m.id, name: m.nama, type: 'Cashback',
            currentValue: curVal, targetValue: target, basisType: 'nilai',
            progressPercent: (stats as any).persenProgress,
            remainingValue: Math.max(0, target - curVal),
            daysLeft: diffDays(end),
            status: ((stats as any).statusPeriode || 'ON TRACK').toUpperCase(),
            periode: identifier
          };

          if ((stats as any).status === "tercapai" || (stats as any).statusPeriode === "safe") {
            // Priority: use value from integrated transaction if available
            const myActiveTxs = myActiveBrands.get(brandCode.toUpperCase()) || [];
            const reachedTx = myActiveTxs.find((tx: any) => tx.rewardTercapai && (tx.rewardType === 'cashback' || tx.rewardType === 'multiple'));
            const val = reachedTx ? Number(reachedTx.rewardNilai) : (Number(m.minTransaksi) * 0.01); 
            // In monitoring, we summarize the entry totals later
          }
        }
      } else if (prog.jenisProgram === 'paket') {
        const m = pkMasters.find(x => x.id === prog.referensiId);
        if (m) {
          const brandCode = (m as any).brandCode || 'FERIO';
          
          // BRAND FILTER
          if (!myActiveBrands.has(brandCode.toUpperCase())) continue;

          const myTxs = myActiveBrands.get(brandCode.toUpperCase()) || [];
          const { identifier, start, end } = getPeriodeRange(((m as any).siklus || 'per_bulan') as any, now);
          
          const curVal = m.basisType === 'qty' 
            ? myTxs.reduce((sum: number, tx: any) => sum + Number(tx.qty), 0)
            : myTxs.reduce((sum: number, tx: any) => sum + Number(tx.nilaiFaktur), 0);

          const tiers = pkTiers.filter(t => t.paketId === m.id).sort((a,b) => Number(a.minValue) - Number(b.minValue));
          const stats = getStatusDetails({
            now, masaBerlakuSelesai: m.endDate, periodeStart: start, periodeEnd: end,
            currentValue: curVal, targetValue: tiers[0] ? Number(tiers[0].minValue) : 0
          });
          
          let targetTier = tiers.find(t => curVal < Number(t.minValue)) || tiers[tiers.length - 1];
          const target = targetTier ? Number(targetTier.minValue) : 0;

          promoInfo = {
            id: m.id, name: m.nama, type: 'Paket',
            currentValue: curVal, targetValue: target, basisType: m.basisType,
            progressPercent: (stats as any).persenProgress,
            remainingValue: Math.max(0, target - curVal),
            daysLeft: diffDays(end),
            status: ((stats as any).statusPeriode || 'ON TRACK').toUpperCase(),
            periode: identifier
          };

          if (stats && ((stats as any).status === "tercapai" || (stats as any).statusPeriode === "safe")) {
            const val = Number((stats as any).totalRewardCalculated || 0);
            entry.totalReward += val;
            entry.rewardDetails.paket += val;
          }
        }
      } else if (prog.jenisProgram === 'principal') {
        const m = prMasters.find(x => x.id === prog.referensiId);
        if (m) {
          const brandCode = (m as any).brandCode || 'FERIO';
          
          // BRAND FILTER
          if (!myActiveBrands.has(brandCode.toUpperCase())) continue;

          const myTxs = myActiveBrands.get(brandCode.toUpperCase()) || [];
          const siklus = (m as any).periodeBulan ? `per_${(m as any).periodeBulan}_bulan` : 'per_bulan';
          const { identifier, start, end } = getPeriodeRange(siklus as any, now);
          
          const curVal = m.basisType === 'qty' 
            ? myTxs.reduce((sum: number, tx: any) => sum + Number(tx.qty), 0)
            : myTxs.reduce((sum: number, tx: any) => sum + Number(tx.nilaiFaktur), 0);

          const tiers = prTiers.filter(t => t.programId === m.id).sort((a,b) => Number(a.minValue) - Number(b.minValue));
          const stats = getStatusDetails({
            now, masaBerlakuSelesai: m.endDate, periodeStart: start, periodeEnd: end,
            currentValue: curVal, targetValue: tiers[0] ? Number(tiers[0].minValue) : 0
          });

          let targetTier = tiers.find(t => curVal < Number(t.minValue)) || tiers[tiers.length - 1];
          const target = targetTier ? Number(targetTier.minValue) : 0;

          promoInfo = {
            id: m.id, name: m.nama, type: 'Principal',
            currentValue: curVal, targetValue: target, basisType: m.basisType,
            progressPercent: (stats as any).persenProgress,
            remainingValue: Math.max(0, target - curVal),
            daysLeft: diffDays(end),
            status: ((stats as any).statusPeriode || 'ON TRACK').toUpperCase(),
            periode: identifier
          };

          if ((stats as any).status === 'tercapai' || (stats as any).statusPeriode === 'safe') {
            const val = Number((stats as any).totalRewardCalculated || 0);
            entry.totalReward += val;
            entry.rewardDetails.principal += val;
          }
        }
      } else if (prog.jenisProgram === 'point') {
        const m = ptMasters.find(x => x.id === prog.referensiId);
        if (m) {
          const brandCode = (m.brandCode || 'FERIO').toUpperCase();
          // BRAND FILTER
          if (!myActiveBrands.has(brandCode)) continue;

          const saldo = aPointSaldos.find(s => s.pelangganId === pId && (s.brandCode || '').toLowerCase() === (m?.brandCode || '').toLowerCase());
          const rewards = ptRewards.filter(r => r.programId === m.id).sort((a,b) => a.pointDibutuhkan - b.pointDibutuhkan);
          const curVal = saldo ? Number(saldo.saldoPoin) : 0;
          let targetReward = rewards.find(r => curVal < r.pointDibutuhkan) || rewards[rewards.length - 1];
          const target = targetReward ? Number(targetReward.pointDibutuhkan) : 0;
          const percent = target > 0 ? Math.min(100, (curVal / target) * 100) : 100;
          
          promoInfo = {
            id: m.id, name: m.namaProgram, type: 'Poin Hadiah',
            currentValue: curVal, targetValue: target, progressPercent: percent,
            basisType: 'qty', // Points are usually quantity-like
            remainingValue: Math.max(0, target - curVal), daysLeft: diffDays(m.tanggalSelesai),
            status: percent >= 100 ? 'SAFE' : (diffDays(m.tanggalSelesai) < 0 ? 'EXPIRED' : 'ON TRACK')
          };
        }
      }

      if (promoInfo) {
        entry.activePromos.push(promoInfo);
        const currentRank = statusRankMap[promoInfo.status.toLowerCase() as keyof typeof statusRankMap] || 0;
        if (currentRank > worstStatusRank) worstStatusRank = currentRank;
      }
    }

    const rankToStatus = ['SAFE', 'ON TRACK', 'WARNING', 'CRITICAL', 'HANGUS', 'EXPIRED'];
    entry.customerStatus = rankToStatus[worstStatusRank];
  }

  return Array.from(customerMap.values());
}

export async function getConsolidatedRedemption(branchId: number) {
  let allBrands: any[] = [];
  try {
    allBrands = await db.select().from(promoBrands);
  } catch (err) {}
  const brandNameMap = new Map(allBrands.map(b => [(b.name || "").toUpperCase(), b.name]));
  const getBrandName = (code?: string | null) => {
    if (!code) return 'Umum';
    return brandNameMap.get(code.toUpperCase()) || code;
  };

  // 1. Ambil transaksi dari TABEL BARU (Integrated)
  const transactionsRaw = await db.select({
      id: promoIntegratedTransactions.id,
      pelangganId: promoIntegratedTransactions.pelangganId,
      noFaktur: promoIntegratedTransactions.noFaktur,
      tglFaktur: promoIntegratedTransactions.tanggalFaktur,
      qty: promoIntegratedTransactions.qty,
      nilaiFaktur: promoIntegratedTransactions.nilaiFaktur,
      rewardTercapai: promoIntegratedTransactions.rewardTercapai,
      rewardType: promoIntegratedTransactions.rewardType,
      rewardNilai: promoIntegratedTransactions.rewardNilai,
      statusPencairan: promoIntegratedTransactions.statusPencairan,
      brandCode: promoBrands.name
    })
    .from(promoIntegratedTransactions)
    .innerJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
    .where(eq(promoIntegratedTransactions.branchId, branchId));

  const transactions = transactionsRaw;
  const txMap = new Map<number, any>(transactions.map((t: any) => [
    t.id, 
    { 
      ...t, 
      brandName: getBrandName(t.brandCode),
      rewards: { cashback: [] as any[], points: [] as any[], labels: [] as any[], pakets: [] as any[], principals: [] as any[] } 
    }
  ]));

  // 1.5 Masukkan Hadiah Langsung dari Integrated Transactions (Tercapai)
  transactions.filter(t => t.rewardTercapai && t.statusPencairan !== 'sudah_dicairkan' && Number(t.rewardNilai) > 0).forEach(t => {
     const tx = txMap.get(t.id);
     if (tx) {
        const item = {
          id: `int_${t.id}`,
          transaksiId: t.id,
          pelangganId: t.pelangganId,
          type: t.rewardType || 'cashback',
          nilai: Number(t.rewardNilai),
          desc: `Reward ${t.rewardType || 'Cashback'} (${tx.brandName}) - Faktur ${t.noFaktur}`,
          refId: t.id
        };
        // Map ke list yang sesuai
        const rType = t.rewardType || 'cashback';
        if (rType === 'cashback') tx.rewards.cashback.push(item);
        else if (rType === 'principal') tx.rewards.principals.push(item);
        else if (rType === 'paket') tx.rewards.pakets.push(item);
        else if (rType === 'point') tx.rewards.points.push(item);
        else if (rType === 'cutting') tx.rewards.labels.push(item);
     }
  });

  const invToTxId = new Map(transactions.map((t: any) => [(t.noFaktur || "").trim().toLowerCase(), t.id]));

  // 2. Ambil Reward dari TABEL PENDUKUNG (pencairan_rewards)
  const readyReservations = await db.select({
    id: pencairanRewards.id,
    transaksiId: pencairanRewards.transaksiId,
    pelangganId: pencairanRewards.pelangganId,
    rewardType: pencairanRewards.rewardType,
    nilaiReward: pencairanRewards.nilaiReward,
    status: pencairanRewards.status,
    noFaktur: promoIntegratedTransactions.noFaktur,
    brandName: promoBrands.name
  })
  .from(pencairanRewards)
  .innerJoin(promoIntegratedTransactions, eq(pencairanRewards.transaksiId, promoIntegratedTransactions.id))
  .innerJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
  .where(and(eq(pencairanRewards.branchId, branchId), eq(pencairanRewards.status, 'siap_dicairkan')));

  readyReservations.forEach(r => {
    const tx = txMap.get(r.transaksiId);
    if (tx) {
      const item = {
        id: `pr_${r.id}`, // Custom prefix for pencairan_rewards
        transaksiId: r.transaksiId,
        pelangganId: r.pelangganId,
        type: r.rewardType,
        nilai: Number(r.nilaiReward),
        desc: `Reward ${r.rewardType} (${r.brandName}) - Faktur ${r.noFaktur}`,
        refId: r.id
      };

      if (r.rewardType === 'cashback') tx.rewards.cashback.push(item);
      else if (r.rewardType === 'principal') tx.rewards.principals.push(item);
      else if (r.rewardType === 'paket') tx.rewards.pakets.push(item);
    }
  });

  // Points & Labels remain achievement-based for now or can be migrated similarly
  // ... (keeping existing logic for points and labels if needed, but the user wanted the new table)
  const allSaldos = await db.select().from(pointSaldo).where(eq(pointSaldo.branchId, branchId));
  const activePrograms = await db.select().from(pointHadiah).where(and(eq(pointHadiah.branchId, branchId), eq(pointHadiah.status, 'aktif')));
  const allRewards = await db.select().from(pointReward).where(eq(pointReward.branchId, branchId));

  // Labels: Exclude already claimed (has matching rewardClaim with sumber='cutting')
  const allLabelQuotas = await db.select({
    id: labelQuotas.id,
    invoiceNumber: labelQuotas.invoiceNumber,
    amount: labelQuotas.amount,
    nilaiPerLabel: cuttingMaster.nilaiPerLabel,
    namaPromo: cuttingMaster.nama
  })
  .from(labelQuotas)
  .leftJoin(cuttingMaster, and(
    eq(labelQuotas.productName, cuttingMaster.nama),
    eq(labelQuotas.branchId, cuttingMaster.branchId),
    eq(cuttingMaster.status, 'aktif')
  ))
  .where(eq(labelQuotas.branchId, branchId));
  const cuttingClaims = await db.select({ refId: rewardClaim.refId }).from(rewardClaim).where(and(eq(rewardClaim.branchId, branchId), eq(rewardClaim.sumber, 'cutting'), eq(rewardClaim.status, 'selesai')));
  const claimedCuttingRefIds = new Set(cuttingClaims.map(c => c.refId));
  const pendingLabels = allLabelQuotas.filter(l => !claimedCuttingRefIds.has(l.id));
  
  // Pakets: Only show if reward tersedia > 0
  const pendingPakets = await db.select({
    id: paketProgress.id,
    pelangganId: paketProgress.pelangganId,
    pelangganNama: salesCustomers.name,
    paketName: paketMaster.nama,
    rewardDesc: paketTier.rewardDesc,
    rewardValue: paketTier.rewardValue,
    rewardType: paketTier.rewardType,
    rewardPercent: paketTier.rewardPercent,
    totalNilai: paketProgress.totalNilai,
    totalRewardCalculated: paketProgress.totalRewardCalculated,
    totalRewardClaimed: paketProgress.totalRewardClaimed,
    brandCode: paketMaster.brandCode,
    periodeEnd: paketProgress.periodeEnd,
    totalQty: paketProgress.totalQty
  })
  .from(paketProgress)
  .innerJoin(paketMaster, eq(paketProgress.paketId, paketMaster.id))
  .innerJoin(paketTier, eq(paketProgress.currentTierId, paketTier.id))
  .innerJoin(salesCustomers, eq(paketProgress.pelangganId, salesCustomers.id))
  .where(and(eq(paketProgress.branchId, branchId), eq(paketProgress.status, 'tercapai')));

  // Principal Program Claims: Show pending principal-funded rewards
  const pendingPrincipalClaims = await db.select({
    id: principalClaim.id,
    pelangganId: principalClaim.pelangganId,
    pelangganNama: salesCustomers.name,
    programName: principalProgram.nama,
    rewardDesc: principalClaim.rewardPrincipalDesc,
    rewardValue: principalClaim.rewardPrincipalValue,
    rewardType: principalClaim.rewardPrincipalType,
    principalName: principalMaster.nama,
    brandCode: principalProgram.brandCode
  })
  .from(principalClaim)
  .innerJoin(principalProgram, eq(principalClaim.programId, principalProgram.id))
  .innerJoin(principalMaster, eq(principalClaim.principalId, principalMaster.id))
  .innerJoin(salesCustomers, eq(principalClaim.pelangganId, salesCustomers.id))
  .where(and(eq(principalClaim.branchId, branchId), eq(principalClaim.status, 'belum_klaim')));

  const autoRewards = await db.select({
      id: promoHasil.id,
      transaksiId: promoHasil.transaksiId,
      nilaiCashback: promoHasil.nilaiCashback,
      promoName: cashbackMaster.nama
    })
    .from(promoHasil)
    .innerJoin(cashbackMaster, eq(promoHasil.cashbackId, cashbackMaster.id))
    .where(eq(promoHasil.branchId, branchId));

  // Also Company-funded part of Principal Program (if any)
  const pendingPrincipalSubs = await db.select({
    id: principalSubscription.id,
    pelangganId: principalSubscription.pelangganId,
    pelangganNama: salesCustomers.name,
    programName: principalProgram.nama,
    currentTierId: principalSubscription.currentTierId,
    totalRewardCalculated: principalSubscription.totalRewardCalculated,
    totalRewardClaimed: principalSubscription.totalRewardClaimed,
    brandCode: principalProgram.brandCode,
    periodeEnd: principalSubscription.periodeEnd,
    totalQty: principalSubscription.totalQty,
    totalNilai: principalSubscription.totalNilai
  })
  .from(principalSubscription)
  .innerJoin(principalProgram, eq(principalSubscription.programId, principalProgram.id))
  .innerJoin(salesCustomers, eq(principalSubscription.pelangganId, salesCustomers.id))
  .where(and(eq(principalSubscription.branchId, branchId), eq(principalSubscription.status, 'tercapai')));

  autoRewards.forEach((ar: any) => {
    const tx = txMap.get(ar.transaksiId);
    if (tx) tx.rewards.cashback.push({ id: `ar_${ar.id}`, nilai: Number(ar.nilaiCashback), namaPromo: ar.promoName || 'CASHBACK' });
  });

  // Points: Achievement-based virtual rewards injection
  allSaldos.forEach((s: any) => {
    const bCode = (s.brandCode || '').toLowerCase().trim();
    const program = activePrograms.find((prog: any) => 
      (prog.brandCode || '').toLowerCase().trim() === bCode || 
      (prog.brandCode || '').toLowerCase().trim() === 'semua'
    );

    if (program && Number(s.saldoPoin) > 0) {
       const rewards = allRewards
          .filter((r: any) => r.programId === program.id)
          .sort((a: any, b: any) => b.pointDibutuhkan - a.pointDibutuhkan);
       
       let remainingSaldo = Number(s.saldoPoin);
       
       // Create a unique virtual ID for this customer + brand combination
       // to avoid collision when customer has points in multiple brands
       const brandHash = Array.from((s.brandCode || "UMUM") as string).reduce((h: number, c: string) => h + c.charCodeAt(0), 0);
       const virtualTxId = 9999000 + (s.pelangganId * 100) + (brandHash % 100);

       // Greedily find what rewards can be claimed with CURRENT saldo
       let rewardsFound = false;
       for (const rw of rewards as any[]) {
          const count = Math.floor(remainingSaldo / rw.pointDibutuhkan);
          if (count > 0) {
             rewardsFound = true;
             for (let i = 0; i < count; i++) {
                if (!txMap.has(virtualTxId)) {
                   txMap.set(virtualTxId, {
                     id: virtualTxId,
                     pelangganId: s.pelangganId,
                     noFaktur: 'Akumulasi Poin',
                     tglFaktur: new Date(),
                     nilaiFaktur: 0,
                     brandCode: s.brandCode,
                     rewards: { cashback: [], points: [], labels: [], pakets: [], principals: [] }
                   });
                }

                txMap.get(virtualTxId)?.rewards.points.push({
                   id: `vpt_${s.id}_${rw.id}_${i}`,
                   refId: rw.id, // Reference catalog ID
                   nilai: rw.pointDibutuhkan,
                   namaPromo: rw.namaHadiah,
                   desc: `${program.namaProgram}: ${rw.namaHadiah}`,
                   brandCode: s.brandCode,
                   brandName: getBrandName(s.brandCode),
                   isVirtual: true
                });
                
                remainingSaldo -= rw.pointDibutuhkan;
             }
          }
       }
    }
  });

  pendingLabels.forEach(pl => {
    const txId = invToTxId.get((pl.invoiceNumber || "").trim().toLowerCase());
    if (txId) {
      const totalNilai = pl.amount * Number(pl.nilaiPerLabel || 0);
      txMap.get(txId)?.rewards.labels.push({ 
        id: `al_${pl.id}`, 
        refId: pl.id,
        nilai: totalNilai, 
        namaPromo: pl.namaPromo || 'CUTTING LABEL', 
        qty: pl.amount 
      });
    }
  });

  const customers = await db.select().from(salesCustomers).where(eq(salesCustomers.branchId, branchId));
  const custMap = new Map(customers.map(c => [c.id, c]));

  const virtualTransactions = Array.from(txMap.values()).filter(t => 
    t.rewards.cashback.length > 0 || 
    t.rewards.points.length > 0 || 
    t.rewards.labels.length > 0 ||
    t.rewards.pakets?.length > 0 ||
    t.rewards.principals?.length > 0
  ).map(t => ({
    ...t,
    pelangganNama: custMap.get(t.pelangganId)?.name || 'N/A',
    brandName: getBrandName(t.brandCode),
    createdAt: (t as any).tglFaktur || (t as any).createdAt,
    isPaketTx: false
  }));

  // Paket: Calculate reward tersedia (calculated - claimed), only include if > 0
  const virtualPaketTx = pendingPakets
    .filter(pk => {
      const totalCalc = Number(pk.totalRewardCalculated || 0);
      const totalClaimed = Number(pk.totalRewardClaimed || 0);
      const totalNilai = Number(pk.totalNilai || 0);
      const totalQty = Number(pk.totalQty || 0);
      return (totalCalc - totalClaimed) > 0 && (totalNilai > 0 || totalQty > 0);
    })
    .map(pk => {
      const totalCalc = Number(pk.totalRewardCalculated || 0);
      const totalClaimed = Number(pk.totalRewardClaimed || 0);
      const tersedia = totalCalc - totalClaimed;
    
      return {
        id: `pk_tx_${pk.id}`,
        pelangganId: pk.pelangganId,
        noFaktur: 'Program Paket',
        tglFaktur: pk.periodeEnd,
        nilaiFaktur: 0,
        brandCode: pk.brandCode,
        pelangganNama: pk.pelangganNama || custMap.get(pk.pelangganId)?.name || 'N/A',
        brandName: getBrandName(pk.brandCode),
        createdAt: pk.periodeEnd,
        isPaketTx: true,
        rewards: { cashback: [], points: [], labels: [], pakets: [{ 
          id: pk.id, 
          refId: pk.id, 
          nilai: tersedia,
          brandCode: pk.brandCode,
          brandName: getBrandName(pk.brandCode),
          namaPromo: 'PROGRAM PAKET', 
          desc: `${pk.paketName}: ${pk.rewardDesc || 'Hadiah'}`,
          totalRewardCalculated: totalCalc,
          totalRewardClaimed: totalClaimed,
          pelangganId: pk.pelangganId,
          pelangganNama: pk.pelangganNama || custMap.get(pk.pelangganId)?.name || 'N/A'
        }] }
      };
    });

  const aCashbackRewardsAll = await db.select({
      id: cashbackReward.id,
      pelangganId: cashbackReward.pelangganId,
      periode: cashbackReward.periode,
      nilai: cashbackReward.nilaiCashback,
      nama: cashbackMaster.nama,
      brandCode: cashbackMaster.brandCode
    })
    .from(cashbackReward)
    .innerJoin(cashbackMaster, eq(cashbackReward.cashbackId, cashbackMaster.id))
    .leftJoin(rewardClaim, and(
      eq(rewardClaim.refId, cashbackReward.id),
      eq(rewardClaim.sumber, 'cashback_reward')
    ))
    .where(and(
      eq(cashbackReward.branchId, branchId),
      eq(cashbackReward.status, 'tercapai'),
      isNull(rewardClaim.id)
    ));

  const virtualCashbackRewards = aCashbackRewardsAll
    .filter((cr: any) => Number(cr.nilai) > 0)
    .map((cr: any) => {
      const c: any = custMap.get(cr.pelangganId);
      return {
        pelangganId: cr.pelangganId,
        pelangganNama: c?.name || 'N/A',
        noFaktur: `Bulanan ${cr.periode}`,
        brandCode: cr.brandCode || 'FERIO',
        rewards: { cashback: [{ id: `cr_${cr.id}`, nilai: Number(cr.nilai), namaPromo: cr.nama || 'CASHBACK BULANAN' }], points: [], labels: [], pakets: [] }
      };
    });

  const itemsMap = new Map<number, any>();

  const addToGroup = (t: any) => {
    if (!itemsMap.has(t.pelangganId)) {
      itemsMap.set(t.pelangganId, {
        id: t.pelangganId,
        pelangganId: t.pelangganId,
        pelangganNama: t.pelangganNama,
        rewardDetails: { cashback: 0, point: 0, label: 0, paket: 0, principal: 0 },
        readyItems: { cashback: [], points: [], labels: [], pakets: [], principals: [] }
      });
    }
    const group = itemsMap.get(t.pelangganId);
    t.rewards.cashback.forEach((cb: any) => { 
      group.rewardDetails.cashback += cb.nilai; 
      group.readyItems.cashback.push({ ...cb, noFaktur: t.noFaktur, brandCode: t.brandCode, brandName: t.brandName, pelangganId: t.pelangganId, pelangganNama: t.pelangganNama }); 
    });
    t.rewards.points.forEach((pt: any) => { 
      group.rewardDetails.point += pt.nilai; 
      group.readyItems.points.push({ ...pt, noFaktur: t.noFaktur, brandCode: t.brandCode, brandName: t.brandName, saldoPoin: pt.nilai, pelangganId: t.pelangganId, pelangganNama: t.pelangganNama }); 
    });
    t.rewards.labels.forEach((lb: any) => { 
      group.rewardDetails.label += lb.qty; 
      group.readyItems.labels.push({ ...lb, noFaktur: t.noFaktur, brandCode: t.brandCode, brandName: t.brandName, totalNilai: lb.nilai, totalLabel: lb.qty, namaCutting: lb.namaPromo, pelangganId: t.pelangganId, pelangganNama: t.pelangganNama }); 
    });
    t.rewards.pakets?.forEach((pk: any) => { 
      group.rewardDetails.paket += pk.nilai; 
      group.readyItems.pakets.push({ ...pk, type: 'paket', noFaktur: t.noFaktur, pelangganId: t.pelangganId, pelangganNama: t.pelangganNama }); 
    });
    t.rewards.principals?.forEach((pr: any) => {
      group.rewardDetails.principal = (group.rewardDetails.principal || 0) + pr.nilai;
      if (!group.readyItems.principals) group.readyItems.principals = [];
      group.readyItems.principals.push({ ...pr, noFaktur: t.noFaktur, pelangganId: t.pelangganId, pelangganNama: t.pelangganNama });
    });
  };

  // 1. Principal Claims (Principal portion)
  const virtualPrincipalClaimTx = pendingPrincipalClaims.map(pc => ({
    id: `pr_claim_${pc.id}`,
    pelangganId: pc.pelangganId,
    noFaktur: 'Klaim Principal',
    tglFaktur: new Date(),
    nilaiFaktur: 0,
    brandCode: pc.brandCode,
    pelangganNama: pc.pelangganNama,
    brandName: getBrandName(pc.brandCode),
    createdAt: new Date(),
    isPrincipalTx: true,
    rewards: { cashback: [], points: [], labels: [], pakets: [], principals: [{
      id: pc.id,
      refId: pc.id,
      nilai: Number(pc.rewardValue || 0),
      namaPromo: 'KLAIM PRINCIPAL',
      desc: `${pc.programName} (${pc.principalName}): ${pc.rewardDesc}`,
      source: 'principal',
      rewardType: pc.rewardType
    }] }
  }));

  // 2. Principal Subscriptions (Company portion)
  const virtualPrincipalSubTx = pendingPrincipalSubs
    .filter(ps => {
       const calc = Number(ps.totalRewardCalculated || 0);
       const claimed = Number(ps.totalRewardClaimed || 0);
       const totalNilai = Number(ps.totalNilai || 0);
       const totalQty = Number(ps.totalQty || 0);
       return (calc - claimed) > 0 && (totalNilai > 0 || totalQty > 0);
    })
    .map(ps => {
       const tersedia = Number(ps.totalRewardCalculated) - Number(ps.totalRewardClaimed);
       return {
         id: `pr_sub_${ps.id}`,
         pelangganId: ps.pelangganId,
         noFaktur: 'Program Principal (Perusahaan)',
         tglFaktur: ps.periodeEnd,
         nilaiFaktur: 0,
         brandCode: ps.brandCode,
         pelangganNama: ps.pelangganNama,
         brandName: getBrandName(ps.brandCode),
         createdAt: ps.periodeEnd,
         isPrincipalTx: true,
         rewards: { cashback: [], points: [], labels: [], pakets: [], principals: [{
           id: ps.id,
           refId: ps.id,
           nilai: tersedia,
           namaPromo: 'HADIAH PROGRAM PRINCIPAL',
           desc: `${ps.programName}: Share Perusahaan`,
           source: 'company'
         }] }
       };
    });

  virtualTransactions.forEach(t => addToGroup(t));
  virtualPaketTx.forEach(t => addToGroup(t));
  virtualCashbackRewards.forEach(t => addToGroup(t));
  virtualPrincipalClaimTx.forEach(t => addToGroup(t));
  virtualPrincipalSubTx.forEach(t => addToGroup(t));

  const allTransactions = [
    ...virtualTransactions, 
    ...virtualPaketTx, 
    ...virtualCashbackRewards,
    ...virtualPrincipalClaimTx,
    ...virtualPrincipalSubTx
  ].sort((a,b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());

  return { items: Array.from(itemsMap.values()), allTransactions };
}


export async function getCustomerTransactionsDetail(branchId: number, pelangganId: number) {
  const [customer] = await db.select().from(salesCustomers).where(eq(salesCustomers.id, pelangganId)).limit(1);
  if (!customer) return [];

  const transactionsIntegrated = await db.select({
      id: promoIntegratedTransactions.id,
      pelangganId: promoIntegratedTransactions.pelangganId,
      noFaktur: promoIntegratedTransactions.noFaktur,
      tglFaktur: promoIntegratedTransactions.tanggalFaktur, 
      qty: promoIntegratedTransactions.qty,
      nilaiFaktur: promoIntegratedTransactions.nilaiFaktur,
      merekId: promoIntegratedTransactions.merekId,
      brandCode: promoBrands.name,
      rewardData: promoIntegratedTransactions.rewardData,
      source: sql`'integrated'` as any
    })
    .from(promoIntegratedTransactions)
    .innerJoin(promoBrands, eq(promoIntegratedTransactions.merekId, promoBrands.id))
    .where(and(eq(promoIntegratedTransactions.branchId, branchId), eq(promoIntegratedTransactions.pelangganId, pelangganId)))
    .orderBy(desc(promoIntegratedTransactions.tanggalFaktur));

  const transactions = transactionsIntegrated;
  // Build set of active brands for this customer
  const myActiveBrands = new Set(transactions.map(t => (t.brandCode || 'FERIO').toUpperCase()));
  const txIds = transactions.map(t => t.id);
  const invs = transactions.map(t => (t.noFaktur || "").trim().toLowerCase());

  const cashback: any[] = []; // Cleared

  const points = invs.length > 0
    ? await db.select({ id: pointLogs.id, invoiceNumber: pointLogs.invoiceNumber, nilai: pointLogs.point }).from(pointLogs).where(and(eq(pointLogs.branchId, branchId), eq(pointLogs.customerCode, customer.code), inArray(sql`TRIM(LOWER(${pointLogs.invoiceNumber}))`, invs)))
    : [];

  const labels = invs.length > 0
    ? await db.select({ 
        id: labelQuotas.id, 
        invoiceNumber: labelQuotas.invoiceNumber, 
        qty: labelQuotas.amount,
        nilaiPerLabel: cuttingMaster.nilaiPerLabel,
        namaPromo: cuttingMaster.nama
      })
      .from(labelQuotas)
      .leftJoin(cuttingMaster, and(
        eq(labelQuotas.productName, cuttingMaster.nama),
        eq(labelQuotas.branchId, cuttingMaster.branchId)
      ))
      .where(and(
        eq(labelQuotas.branchId, branchId), 
        eq(labelQuotas.customerCode, customer.code), 
        inArray(sql`TRIM(LOWER(${labelQuotas.invoiceNumber}))`, invs)
      ))
    : [];

  const pakets = await db.select({ 
      id: paketProgress.id, 
      paketId: paketMaster.id,
      name: paketMaster.nama, 
      val: paketTier.rewardValue, 
      rewardType: paketTier.rewardType,
      rewardPercent: paketTier.rewardPercent,
      totalNilaiAll: paketProgress.totalNilai,
      desc: paketTier.rewardDesc,
      brandCode: paketMaster.brandCode
    }).from(paketProgress)
    .innerJoin(paketMaster, eq(paketProgress.paketId, paketMaster.id))
    .innerJoin(paketTier, eq(paketProgress.currentTierId, paketTier.id))
    .where(and(eq(paketProgress.branchId, branchId), eq(paketProgress.pelangganId, pelangganId), eq(paketProgress.status, 'tercapai')));

   // BRAND FILTER
   const filteredPakets = pakets.filter(pk => {
      const bCode = (pk as any).brandCode || 'FERIO';
      return myActiveBrands.has((bCode).toUpperCase());
   });

  const cbRewards = await db.select({
      id: cashbackReward.id,
      periode: cashbackReward.periode,
      totalTransaksiPeriode: cashbackReward.totalTransaksiPeriode,
      nilaiCashback: cashbackReward.nilaiCashback,
      status: cashbackReward.status,
      nama: cashbackMaster.nama,
      minTransaksi: cashbackMaster.minTransaksi,
      brandCode: cashbackMaster.brandCode
    })
    .from(cashbackReward)
    .innerJoin(cashbackMaster, eq(cashbackReward.cashbackId, cashbackMaster.id))
    .where(and(eq(cashbackReward.branchId, branchId), eq(cashbackReward.pelangganId, pelangganId)));





  const txMap = new Map<number, any>(transactions.map(t => {
    const rd = t.rewardData as any;
    const rewardItems: any[] = [];
    let totalReward = 0;
    const details = { cashback: 0, point: 0, label: 0, paket: 0, principal: 0 };
    
    if (rd) {
      if (rd.cashbacks) {
        rd.cashbacks.forEach((cb: any) => {
          const v = Number(cb.nilai || 0);
          totalReward += v;
          details.cashback += v;
          rewardItems.push({ type: 'cashback', name: cb.name || 'CASHBACK', value: v });
        });
      }
      if (rd.cutting) {
        rd.cutting.forEach((c: any) => {
          const v = Number(c.nilaiTotal || 0);
          totalReward += v;
          details.label += c.amount || 0;
          rewardItems.push({ type: 'cutting', name: 'CUTTING LABEL', value: v, desc: `${c.amount} label` });
        });
      }
      if (rd.pakets) {
        rd.pakets.forEach((p: any) => {
          const v = Number(p.rewardValue || 0);
          totalReward += v;
          details.paket += v;
          rewardItems.push({ type: 'paket', name: p.paketName || 'PAKET', value: v, desc: p.tierName });
        });
      }
      if (rd.principalPrograms) {
        rd.principalPrograms.forEach((p: any) => {
          const v = Number(p.rewardValue || 0);
          totalReward += v;
          (details as any).principal = ((details as any).principal || 0) + v;
          rewardItems.push({ type: 'principal', name: p.programName || 'PRINCIPAL', value: v, desc: p.tierName });
        });
      }
    }

    return [t.id, { 
      ...t, 
      totalReward, 
      details, 
      rewardItems,
      basisType: 'nominal'
    }];
  }));
  const invMap = new Map(transactions.map(t => [(t.noFaktur || "").trim().toLowerCase(), t.id]));
  
  // 1. Map Pakets back to transactions if they were achieved
  filteredPakets.forEach((pk: any) => {
    transactions.forEach((t: any) => {
      // If transaction is for the same customer (checked) and branch (checked)
      // and brand matches (we should check brand from paketMaster)
      // and it's within the paket period (not strictly tracked but usually implied)
      // For this "minimal surgical fix", we will apply the achieved tier rate to related invoices
      const tx = txMap.get(t.id);
      if (tx) {
        let calculatedReward = 0;
        if (pk.rewardType === 'percent') {
          calculatedReward = Number(t.nilaiFaktur) * (Number(pk.rewardPercent) / 100);
        } else if (pk.rewardType === 'cash' && t.id === transactions[0].id) {
           // Fixed cash reward: apply only to the first (latest) invoice to avoid double counting
           calculatedReward = Number(pk.val || 0);
        }

        if (calculatedReward > 0) {
          const brandPrefix = tx.brandCode ? `[${tx.brandCode.toUpperCase()}] ` : '';
          tx.totalReward += calculatedReward;
          tx.details.paket += calculatedReward;
          tx.rewardItems.push({ 
            type: 'paket', 
            name: `${brandPrefix}PROGRAM PAKET ${calculatedReward.toLocaleString()}`, 
            value: calculatedReward, 
            desc: pk.name 
          });
          tx.basisType = 'nominal';
        }
      }
    });
  });

  // Skip legacy per-transaction reward fetching as it's now handled by rewardData integration
  /*
  cashback.forEach(cb => { ... });
  labels.forEach(lb => { ... });
  */

  // 2. Fetch point programs more proactively (not just from mappings if it's points)
  const brandsWithPoints = Array.from(new Set(Array.from(txMap.values()).map(t => (t.brandCode || '').toLowerCase().trim()))).filter(Boolean);
  
  for (const bCode of brandsWithPoints) {
      // Find point award program for this brand at this branch
      const programs = await db.select().from(pointHadiah).where(and(
        sql`TRIM(LOWER(${pointHadiah.brandCode})) = ${bCode}`,
        eq(pointHadiah.status, 'aktif'),
        eq(pointHadiah.branchId, branchId)
      )).limit(1);

      if (programs.length > 0) {
          const prog = programs[0];
          const rewards = await db.select().from(pointReward).where(eq(pointReward.programId, prog.id)).orderBy(desc(pointReward.pointDibutuhkan));
          
          // Get ALL point logs for this customer and brand to calculate running totals
          const allCustomerLogs = await db.select().from(pointLogs).where(and(
              eq(pointLogs.customerCode, customer.code),
              eq(pointLogs.branchId, branchId),
              sql`TRIM(LOWER(${pointLogs.brandCode})) = ${bCode}`,
              eq(pointLogs.type, 'earn')
          ));

          const brandPrefix = prog.brandCode ? `[${prog.brandCode.toUpperCase()}] ` : '';
          
          // Calculate running total per transaction individually
          Array.from(txMap.values()).forEach(t => {
             if ((t.brandCode || '').toLowerCase().trim() === bCode) {
                // Calculate cumulative sum up to this transaction's creation date (inclusive) or matching invoice
                const runningTotal = allCustomerLogs
                   .filter(log => 
                      new Date(log.createdAt || 0).getTime() <= new Date(t.createdAt).getTime() ||
                      (log.invoiceNumber || "").trim().toLowerCase() === (t.noFaktur || "").trim().toLowerCase()
                   )
                   .reduce((sum, log) => sum + Number(log.point || 0), 0);
                
                // Find highest eligible reward for THIS specific running total
                const achievedReward = rewards.find(r => runningTotal >= Number(r.pointDibutuhkan));
                
                if (achievedReward) {
                   t.rewardItems.forEach((ri: any) => {
                      if (ri.type === 'point') {
                         ri.name = `${brandPrefix}${achievedReward.namaHadiah}`;
                      }
                   });
                }
             }
          });
      }
  }

  // Flatten into separate rows for each reward type to fulfill different Omzet display requirements (Nominal vs Qty)
  const finalResult: any[] = [];
  Array.from(txMap.values()).forEach(t => {
     // Groups: Paket, Point, Others (Cashback/Label)
     const categories = {
        paket: t.rewardItems.filter((ri: any) => ri.type === 'paket'),
        point: t.rewardItems.filter((ri: any) => ri.type === 'point'),
        others: t.rewardItems.filter((ri: any) => ri.type !== 'paket' && ri.type !== 'point')
     };

     // Create row for Paket (if any)
     if (categories.paket.length > 0) {
        finalResult.push({
           ...t,
           id: `${t.id}_pk`,
           totalReward: t.details.paket,
           rewardItems: categories.paket,
           basisType: 'nominal'
        });
     }

     // Create row for Points (if any)
     if (categories.point.length > 0) {
        finalResult.push({
           ...t,
           id: `${t.id}_pt`,
           totalReward: 0, // Points usually 0 monetary
           rewardItems: categories.point,
           basisType: 'point'
        });
     }

     // Create row for Others (if any, e.g. normal Cashback or Labels)
     if (categories.others.length > 0) {
        finalResult.push({
           ...t,
           id: `${t.id}_ot`,
           totalReward: categories.others.reduce((acc: number, curr: any) => acc + (Number(curr.value) || 0), 0),
           rewardItems: categories.others,
           basisType: 'nominal'
        });
     }

     // Fallback if no rewards but it's a valid transaction - show as base
     if (t.rewardItems.length === 0) {
        finalResult.push({
           ...t,
           id: `${t.id}_base`,
           totalReward: 0,
           rewardItems: [],
           basisType: 'nominal'
        });
     }
  });

   // 3. Inject Monthly Cashback Rewards (Conditional)
   const filteredCbRewards = cbRewards.filter((cr: any) => {
      const bCode = cr.brandCode || 'FERIO';
      return myActiveBrands.has(bCode.toUpperCase());
   });

   filteredCbRewards.forEach((cr: any) => {
     const isAchieved = cr.status === 'tercapai' || cr.status === 'dicairkan';
     const rewardVal = isAchieved ? Number(cr.nilaiCashback) : 0;
     const progressPercent = Math.min(100, Math.round((Number(cr.totalTransaksiPeriode) / Number(cr.minTransaksi)) * 100));
     
     const brandPrefix = cr.brandCode ? `[${cr.brandCode.toUpperCase()}] ` : '';

     finalResult.push({
        id: `cr_${cr.id}`,
        pelangganId: pelangganId,
        noFaktur: `Bulanan ${cr.periode}`,
        tglFaktur: new Date(), 
        nilaiFaktur: Number(cr.totalTransaksiPeriode), 
        totalReward: rewardVal,
        rewardItems: [{ 
           type: 'cashback', 
           name: `${brandPrefix}${cr.nama}`, 
           value: rewardVal, 
           desc: isAchieved 
              ? `Tercapai (Rp ${Number(cr.totalTransaksiPeriode).toLocaleString()})` 
              : `Progres: ${progressPercent}% (Rp ${Number(cr.totalTransaksiPeriode).toLocaleString()} dari Rp ${Number(cr.minTransaksi).toLocaleString()})`
        }],
        basisType: 'nominal'
     });
  });

  return finalResult;
}
