import { calculatePromos } from "./server/promo_service";

async function run() {
  const preview = await calculatePromos(64, 200, 15000000, new Date("2026-03-30"), "Petronas", 2);
  console.log("preview:", JSON.stringify(preview, null, 2));
  process.exit(0);
}
run();
