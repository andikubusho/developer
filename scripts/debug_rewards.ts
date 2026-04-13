import { db } from "../server/db";
import { pointHadiah, pointRule, pointReward, pointSaldo, pelangganProgram, pointMaster } from "../shared/schema";
import { eq, and } from "drizzle-orm";

async function checkData() {
  const h = await db.select().from(pointHadiah);
  console.log("Point Hadiah:", JSON.stringify(h, null, 2));

  const r = await db.select().from(pointReward);
  console.log("Point Rewards:", JSON.stringify(r, null, 2));
  
  const rules = await db.select().from(pointRule);
  console.log("Point Rules:", JSON.stringify(rules, null, 2));

  const pm = await db.select().from(pointMaster);
  console.log("Point Masters:", JSON.stringify(pm, null, 2));

  const pp = await db.select().from(pelangganProgram);
  console.log("Pelanggan Program:", JSON.stringify(pp, null, 2));
}

checkData();
