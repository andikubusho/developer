
import { db } from "./server/db";
import { paketMaster } from "./shared/schema";
import { eq } from "drizzle-orm";

async function checkData() {
  console.log("Checking paketMaster data...");
  const data = await db.select().from(paketMaster);
  console.log("Total paket:", data.length);
  data.forEach(p => {
    console.log(`ID: ${p.id}, Nama: ${p.nama}, BranchId: ${p.branchId}, Start: ${p.startDate}, End: ${p.endDate}`);
  });
  process.exit(0);
}

checkData();
