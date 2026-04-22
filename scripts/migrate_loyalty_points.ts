import 'dotenv/config';
import { db } from '../server/db';
import { salesCustomers } from '../shared/schema';
import { sql } from 'drizzle-orm';

async function migrate() {
  console.log('Starting migration for loyalty points...');

  // 1. Get all customers that don't have a code or totalPoint initialized
  const customers = await db.select().from(salesCustomers);
  console.log(`Found ${customers.length} customers to check/migrate.`);

  for (let i = 0; i < customers.length; i++) {
    const customer = customers[i];
    
    // If code is missing, generate one
    const code = customer.code || `CUST-${customer.id.toString().padStart(4, '0')}`;
    const totalPoint = customer.totalPoint || 0;

    console.log(`Updating customer ${customer.id}: ${customer.name} -> Code: ${code}, Points: ${totalPoint}`);

    await db.update(salesCustomers)
      .set({ 
        code: code,
        totalPoint: totalPoint 
      })
      .where(sql`id = ${customer.id}`);
  }

  console.log('Migration completed successfully.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
