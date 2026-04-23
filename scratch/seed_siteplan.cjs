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

    for (const unit of units) {
      const [blok, numStr] = unit.unit_number.split('/');
      const num = parseInt(numStr);
      let x = 0, y = 0, rot = 0;

      if (blok === 'North' || blok === 'N') {
        const i = num - 1;
        const gap = num >= 14 ? 110 : 0; 
        x = 165 + (i * 19) + gap;
        y = 865 + (i * -38) - gap; 
        rot = -27; 
      } else if (blok === 'East' || blok === 'E') {
        const i = num - 1;
        x = 690 + (i * 8);
        y = 115 + (i * 58);
        rot = -12;
      } else if (blok === 'GC') {
        if (num <= 9) {
          x = 730 + ((num-1) * 14);
          y = 415 + ((num-1) * 36);
          rot = -14;
        } else {
          x = 425 + ((num-10) * 46);
          y = 565 + ((num-10) * 17);
          rot = -21;
        }
      } else if (blok === 'South' || blok === 'S') {
        const i = num - 1;
        x = 245 + (i * 44);
        y = 925 + (i * -17);
        rot = -21;
      }

      if (x > 0) {
        await client.query(`UPDATE units SET sp_x = $1, sp_y = $2, sp_rotation = $3 WHERE id = $4`, [Math.round(x), Math.round(y), rot, unit.id]);
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
