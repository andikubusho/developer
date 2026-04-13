import { storage } from "../server/storage";
import { db } from "../server/db";
import { auditLogs } from "../shared/schema";
import { eq, desc } from "drizzle-orm";

async function verify() {
  console.log("Starting verification of getLastStockUpdate...");

  // 1. Check current last update for branch 1 (if exists)
  const initial = await storage.getLastStockUpdate(1);
  console.log("Initial last update for branch 1:", initial);

  // 2. Record a new mock update
  console.log("Recording mock UPDATE_STOCK_BULK for branch 1...");
  await storage.recordAuditLog(1, "UPDATE_STOCK_BULK", "items", "Mock update via scratch script", 1);

  // 3. Check again
  const afterBulk = await storage.getLastStockUpdate(1);
  console.log("After bulk update for branch 1:", afterBulk);

  if (afterBulk && (!initial || afterBulk > initial)) {
    console.log("SUCCESS: Bulk update timestamp detected correctly.");
  } else {
    console.log("FAILURE: Bulk update timestamp not updated or not detected.");
  }

  // 4. Record a mock individual update
  console.log("Recording mock UPDATE for items resource for branch 1...");
  await storage.recordAuditLog(1, "UPDATE", "items", "Mock item update via scratch script", 1);

  // 5. Check again
  const afterIndividual = await storage.getLastStockUpdate(1);
  console.log("After individual update for branch 1:", afterIndividual);

  if (afterIndividual && afterIndividual > afterBulk!) {
    console.log("SUCCESS: Individual update timestamp detected correctly.");
  } else {
    console.log("FAILURE: Individual update timestamp not updated or not detected.");
  }
  
  console.log("Verification complete.");
  process.exit(0);
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
