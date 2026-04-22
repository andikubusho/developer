import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
    console.log("Creating table promo_integrated_transactions...");
    
    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS promo_integrated_transactions (
                id SERIAL PRIMARY KEY,
                branch_id INTEGER NOT NULL,
                pelanggan_id INTEGER NOT NULL,
                merek_id INTEGER NOT NULL,
                no_faktur VARCHAR(100) NOT NULL,
                tanggal_faktur DATE NOT NULL,
                qty INTEGER NOT NULL DEFAULT 0,
                nilai_faktur DECIMAL NOT NULL DEFAULT 0,
                program_aktif TEXT,
                reward_data JSONB,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        console.log("Creating indexes...");
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_promo_integrated_branch ON promo_integrated_transactions(branch_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_promo_integrated_pelanggan ON promo_integrated_transactions(pelanggan_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_promo_integrated_merek ON promo_integrated_transactions(merek_id);`);
        
        console.log("Migration successful!");
    } catch (err: any) {
        console.error("Migration failed:", err.message);
        process.exit(1);
    }
    process.exit(0);
}

migrate();
