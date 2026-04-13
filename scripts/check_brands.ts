import { db } from "../server/db";
import { promoBrands } from "../shared/schema";
import { eq, or, isNull } from "drizzle-orm";

async function main() {
    console.log("Testing brand query for branchId: 2...");
    try {
        const effectiveBranchId = 2;
        let query = db.select().from(promoBrands).$dynamic();
        
        if (effectiveBranchId) {
            query = query.where(or(
                eq(promoBrands.branchId, effectiveBranchId),
                isNull(promoBrands.branchId)
            ));
        }

        const data = await query;
        console.log("Result:", JSON.stringify(data, null, 2));
    } catch (e: any) {
        console.error("Query Error:", e.message);
    }
}

main();
