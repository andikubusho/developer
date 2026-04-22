import { db } from "../server/db";
import { getConsolidatedRedemption } from "../server/promo_service";

async function checkGhostData() {
  for (const branchId of [1, 2, 3]) {
    console.log(`\n=== Branch: ${branchId} ===`);
    const { items, allTransactions } = await getConsolidatedRedemption(branchId);
    for (const group of items) {
       if (group.pelangganNama?.includes("Cemerlang") || group.pelangganNama?.includes("Duta Motor")) {
          console.log(`Customer: ${group.pelangganNama} (ID: ${group.pelangganId})`);
          console.log("Ready Items:", JSON.stringify(group.readyItems, null, 2));
       }
    }
  }
}

checkGhostData().catch(console.error).finally(() => process.exit());
