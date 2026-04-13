import { db } from "../server/db";
import { principalSubscription, cashbackReward, promoIntegratedTransactions } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function cleanup() {
  console.log("Starting DB garbage cleanup...");

  // 1. Delete the bad principal subscription for Duta Motor
  const delSub = await db.delete(principalSubscription).where(eq(principalSubscription.id, 1)).returning();
  console.log(`Deleted ${delSub.length} corrupted principalSubscription records.`);

  // 2. Delete 0-value cashback rewards (which caused Cemerlang to appear)
  const delCb = await db.delete(cashbackReward).where(eq(cashbackReward.nilaiCashback, '0')).returning();
  console.log(`Deleted ${delCb.length} zero-value cashbackReward records.`);

  // 3. Mark integrated transactions with 0 reward as not tercapai (cleaner than deleting)
  const updInt = await db.update(promoIntegratedTransactions)
    .set({ rewardTercapai: false })
    .where(and(eq(promoIntegratedTransactions.rewardTercapai, true), eq(promoIntegratedTransactions.rewardNilai, '0')))
    .returning();
  console.log(`Corrected ${updInt.length} zero-value promoIntegratedTransactions records.`);

  console.log("Cleanup complete!");
}

cleanup().catch(console.error).finally(() => process.exit(0));
