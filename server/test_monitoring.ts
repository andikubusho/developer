
import { getConsolidatedMonitoring } from "./promo_service";

async function testMonitoring() {
  const branchId = 2; // PJM
  console.log(`Testing Monitoring for Branch ${branchId}...`);
  try {
    const data = await getConsolidatedMonitoring(branchId);
    console.log(`Found ${data.length} records.`);
    if (data.length > 0) {
      console.log("First record:", JSON.stringify(data[0], null, 2));
    } else {
      console.log("Result is EMPTY.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

testMonitoring();
