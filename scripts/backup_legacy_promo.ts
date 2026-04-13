import { db, pool } from '../server/db';
import { promoMasters, promoInputs, pointLogs, labelClaims, labelQuotas } from '../shared/schema';
import * as fs from 'fs';
import * as path from 'path';

async function backup() {
  const backupDir = path.join(process.cwd(), 'backups');
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  const tables = [
    { name: 'promo_masters', table: promoMasters },
    { name: 'promo_inputs', table: promoInputs },
    { name: 'point_logs', table: pointLogs },
    { name: 'label_claims', table: labelClaims },
    { name: 'label_quotas', table: labelQuotas },
  ];

  for (const t of tables) {
    try {
      console.log(`Backing up ${t.name}...`);
      const data = await db.select().from(t.table);
      const filePath = path.join(backupDir, `${t.name}_${new Date().getTime()}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✓ ${t.name} backed up to ${filePath}`);
    } catch (err) {
      console.error(`✗ Failed to backup ${t.name}:`, err);
    }
  }

  process.exit(0);
}

backup();
