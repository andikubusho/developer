import { api } from './src/lib/api.ts';

async function main() {
  const payments = await api.get('payments', 'select=id,sale_id,amount,payment_date,status,created_at');
  const groups: Record<string, any[]> = {};
  
  payments.forEach(p => {
    const key = `${p.sale_id}|${p.amount}|${p.payment_date}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(p);
  });
  
  const duplicates = Object.entries(groups).filter(([_, list]) => list.length > 1);
  
  console.log(`Found ${duplicates.length} duplicate groups.`);
  duplicates.forEach(([key, list]) => {
    console.log(`Key: ${key}`);
    list.forEach(p => console.log(`  - ID: ${p.id}, Status: ${p.status}, Created: ${p.created_at}`));
  });
}

main();
