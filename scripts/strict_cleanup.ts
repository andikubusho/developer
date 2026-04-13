import { db } from "../server/db";
import { 
  transaksiPromo, pelangganProgram, paketProgress, 
  cuttingProgress, pointSaldo, rewardClaim, 
  paketMaster, cashbackMaster, cuttingMaster, pointMaster
} from "../shared/schema";
import { or, isNull, notInArray, and } from "drizzle-orm";

async function cleanup() {
  console.log("=== STARTING STRICT CLEANUP ===");
  const validBranchIds = [2, 3]; // PJM and FERIO
  
  const tables = [
    { name: "transaksiPromo", table: transaksiPromo },
    { name: "pelangganProgram", table: pelangganProgram },
    { name: "paketProgress", table: paketProgress },
    { name: "cuttingProgress", table: cuttingProgress },
    { name: "pointSaldo", table: pointSaldo },
    { name: "rewardClaim", table: rewardClaim },
    { name: "paketMaster", table: paketMaster },
    { name: "cashbackMaster", table: cashbackMaster },
    { name: "cuttingMaster", table: cuttingMaster },
    { name: "pointMaster", table: pointMaster }
  ];

  for (const t of tables) {
    console.log(`Cleaning table: ${t.name}...`);
    try {
      // Delete if branchId is NULL OR not in valid list
      const res = await db.delete(t.table).where(
        or(
          isNull(t.table.branchId),
          notInArray(t.table.branchId, validBranchIds)
        )
      );
      console.log(`- Success cleaning ${t.name}`);
    } catch (err) {
      console.error(`- FAILED cleaning ${t.name}:`, err);
    }
  }

  console.log("=== CLEANUP COMPLETE ===");
}

cleanup();
