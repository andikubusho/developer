const pkg = require('pg');
const { Client } = pkg;

const TARGET_DB = "postgresql://postgres.krdcnrlruuurnwtiqmym:raGFxoqCHaIrxAyK@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres";
const GOLDEN_CANYON_ID = '28680951-0ab9-4722-a58c-6436a9401e42';

async function seed() {
  const client = new Client({ connectionString: TARGET_DB });
  try {
    await client.connect();
    console.log('🌱 Memulai seeding koordinat Golden Canyon...');

    // 1. Set Background Image untuk Golden Canyon
    await client.query(`UPDATE projects SET site_plan_image_url = '/src/assets/siteplan/golden-canyon.png' WHERE id = '${GOLDEN_CANYON_ID}'`);

    // 2. Fetch all units for Golden Canyon
    const { rows: units } = await client.query(`SELECT id, unit_number FROM units WHERE project_id = '${GOLDEN_CANYON_ID}'`);

    // First, hide all units
    await client.query(`UPDATE units SET sp_x = 0, sp_y = 0`);

    for (const unit of units) {
      const [blok, numStr] = unit.unit_number.split('/');
      const num = parseInt(numStr);
      let x = 0, y = 0, rot = 0;
      let type = 'Rumah';

      if (blok === 'North' || blok === 'N') {
        if (num > 19) continue;
        // 19 Units diagonal (Grey Boxes)
        const i = num - 1;
        x = 35.5 + (i * 1.5);
        y = 48.5 + (i * -1.8);
        rot = -48;
        type = 'Rumah';
      } else if (blok === 'South' || blok === 'S') {
        if (num > 12) continue;
        // 12 Units horizontal (Grey Boxes)
        const i = num - 1;
        x = 42.5 + (i * 2.1);
        y = 52.8;
        rot = 0;
        type = 'Rumah';
      } else if (blok === 'East' || blok === 'E') {
        if (num <= 7) {
          // 7 Units Ruko (Top Right)
          const i = num - 1;
          x = 73.0 + (i * 0.7);
          y = 15.5 + (i * 2.5);
          rot = -5;
          type = 'Ruko';
        } else if (num <= 11) {
          // 4 Units Rumah (Bottom Right)
          const i = num - 8;
          x = 71.0 + (i * 0.6);
          y = 36.5 + (i * 2.2);
          rot = -10;
          type = 'Rumah';
        } else {
          continue;
        }
      } else {
        continue;
      }

      if (x > 0) {
        await client.query(`UPDATE units SET sp_x = $1, sp_y = $2, sp_rotation = $3, type = $4 WHERE id = $5`, [parseFloat(x.toFixed(2)), parseFloat(y.toFixed(2)), rot, type, unit.id]);
      }
    }

    console.log('✅ Seeding selesai!');
  } catch (err) {
    console.error('❌ Error Seeding:', err.message);
  } finally {
    await client.end();
  }
}

seed();
