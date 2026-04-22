import { db } from "./server/db";
import { users } from "./shared/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "./server/auth";

async function reset() {
  try {
    const newHash = await hashPassword("ferio");
    const [updated] = await db.update(users)
      .set({ 
        branchId: 3, 
        password: newHash,
        role: "admin"
      })
      .where(eq(users.username, "admin"))
      .returning();
    
    console.log("Admin reset success:", updated.username, "Branch:", updated.branchId);
  } catch (err) {
    console.error("Reset failed:", err);
  }
  process.exit(0);
}

reset();
