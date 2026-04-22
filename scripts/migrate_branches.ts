import { db } from "../server/db";
import { 
  cashbackMaster, cuttingMaster, pointMaster, paketMaster, 
  hadiahKatalog, paketPelanggan, promoPelanggan, paketProgress, 
  pointSaldo, cuttingProgress, transaksiPromo, rewardClaim,
  branches
} from "../shared/schema";
import { isNull, eq } from "drizzle-orm";

async function migrateBranchIds() {
  console.log("Starting branchId migration...");

  try {
    // 1. Get default branch
    const branchList = await db.select().from(branches).limit(1);
    if (branchList.length === 0) {
      console.error("No branches found! Run server first to seed database.");
      return;
    }
    const defaultBranchId = branchList[0].id;
    console.log(`Using default branchId: ${defaultBranchId} (${branchList[0].name})`);

    const tables = [
      { name: "cashbackMaster", table: cashbackMaster },
      { name: "cuttingMaster", table: cuttingMaster },
      { name: "pointMaster", table: pointMaster },
      { name: "paketMaster", table: paketMaster },
      { name: "hadiahKatalog", table: hadiahKatalog },
      { name: "paketPelanggan", table: paketPelanggan },
      { name: "promoPelanggan", table: promoPelanggan },
      { name: "paketProgress", table: paketProgress },
      { name: "pointSaldo", table: pointSaldo },
      { name: "cuttingProgress", table: cuttingProgress },
      { name: "transaksiPromo", table: transaksiPromo },
      { name: "rewardClaim", table: rewardClaim }
    ];

    for (const item of tables) {
      try {
        console.log(`Migrating table: ${item.name}...`);
        // @ts-ignore
        const result = await db.update(item.table)
          // @ts-ignore
          .set({ branchId: defaultBranchId })
          // @ts-ignore
          .where(isNull(item.table.branchId))
          .returning();
        console.log(`Updated ${result.length} records in ${item.name}.`);
      } catch (err: any) {
        console.error(`Error migrating ${item.name}:`, err.message);
      }
    }

    console.log("Migration completed.");
    process.exit(0);
  } catch (err: any) {
    console.error("Critical error:", err.message);
    process.exit(1);
  }
}

migrateBranchIds();
