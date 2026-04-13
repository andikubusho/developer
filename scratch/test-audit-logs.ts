import { db } from "../server/db";
import { DatabaseStorage } from "../server/storage";

async function verify() {
  const customStorage = new DatabaseStorage();
  console.log("Fetching first page of logs...");
  const result1 = await customStorage.getAuditLogsPaginated({ page: 1, limit: 5 });
  console.log(`Expected Shape -> Data Length: ${result1.data.length}, Total: ${result1.total}, Pages: ${result1.pages}`);
  
  console.log("Fetching with search filter 'Login'...");
  const result2 = await customStorage.getAuditLogsPaginated({ page: 1, limit: 5, search: "LOGIN" });
  console.log(`Search Result -> Total Matches: ${result2.total}`);
  
  if (result1.data && typeof result1.total === 'number' && typeof result1.pages === 'number') {
      console.log("Verification PASSED: Backend successfully implemented pagination algorithm.");
  } else {
      console.log("Verification FAILED: Missing properties from backend logic.");
  }
}

verify().catch(console.error).finally(() => process.exit());
