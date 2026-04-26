const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function repair() {
  try {
    await client.connect();
    console.log('--- REPAIR: Linking Deposits to Cash Flow ---');
    
    // 1. Get all deposits without a linked cash flow in the cash_flow table
    // We search for cash_flow records where reference_id is null but description contains "Titipan"
    const deposits = await client.query("SELECT id, name, status FROM deposits");
    
    for (const dep of deposits.rows) {
      // Look for cash_flow with matching name in description
      const nameEscaped = dep.name.replace(/'/g, "''");
      const cfQuery = `
        SELECT id FROM cash_flow 
        WHERE reference_id IS NULL 
        AND description ILIKE '%Titipan%' 
        AND description ILIKE '%${nameEscaped}%'
        LIMIT 1
      `;
      const cfMatch = await client.query(cfQuery);
      
      if (cfMatch.rows.length > 0) {
        console.log(`Linking Deposit [${dep.name}] to CF [${cfMatch.rows[0].id}]`);
        await client.query(
          "UPDATE cash_flow SET reference_id = $1, reference_type = 'deposit', status = $2 WHERE id = $3",
          [dep.id, dep.status === 'verified' || dep.status === 'used' ? 'verified' : 'pending', cfMatch.rows[0].id]
        );
      }
    }

    // 2. Also link Payments (Penjualan Unit)
    // This is harder because description might not have customer name, but let's try
    console.log('\n--- REPAIR: Linking Payments to Cash Flow ---');
    const payments = await client.query(`
      SELECT p.id, c.full_name, p.status 
      FROM payments p
      JOIN sales s ON p.sale_id = s.id
      JOIN customers c ON s.customer_id = c.id
    `);

    for (const pay of payments.rows) {
      const nameEscaped = pay.full_name.replace(/'/g, "''");
      const cfQuery = `
        SELECT id FROM cash_flow 
        WHERE reference_id IS NULL 
        AND description ILIKE '%Pembayaran%' 
        AND description ILIKE '%${nameEscaped}%'
        LIMIT 1
      `;
      const cfMatch = await client.query(cfQuery);
      if (cfMatch.rows.length > 0) {
        console.log(`Linking Payment for [${pay.full_name}] to CF [${cfMatch.rows[0].id}]`);
        await client.query(
          "UPDATE cash_flow SET reference_id = $1, reference_type = 'payment', status = $2 WHERE id = $3",
          [pay.id, pay.status === 'verified' ? 'verified' : 'pending', cfMatch.rows[0].id]
        );
      }
    }

    console.log('✅ Repair completed.');
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

repair();
