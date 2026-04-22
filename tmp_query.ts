import { db } from "./server/db";
import { pelangganProgram } from "./shared/schema";

async function run() {
  const all = await db.select().from(pelangganProgram);
  console.log("All pelangganProgram:", all);
  process.exit(0);
}
run();
