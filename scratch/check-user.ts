import "dotenv/config";
import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function checkUser() {
  const [user] = await db.select().from(users).where(eq(users.id, 1)).limit(1);
  console.log("Current User (ID 1):", JSON.stringify(user, null, 2));
}

checkUser();
