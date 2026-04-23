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
        // N-01: (200, 750), Interval +23X, -24Y, Rot -46
        const i = num - 1;
        const gap = num >= 14 ? 60 : 0; // Gap jalan antara N-10 dan N-14
        x = 200 + (i * 23) + gap;
        y = 750 + (i * -24) - gap;
        rot = -46;
      } else if (blok === 'East' || blok === 'E') {
        // E-01: (750, 100), Vertikal
        const i = num - 1;
        x = 750;
        y = 100 + (i * 45);
        rot = 0;
      } else if (blok === 'GC') {
        // GC-01 to 09 (Row 1), 10 to 18 (Row 2)
        if (num <= 9) {
          x = 550 + ((num-1) * 35);
          y = 550;
        } else {
          x = 515 + ((num-10) * 35);
          y = 600;
        }
        rot = 0;
      } else if (blok === 'South' || blok === 'S') {
        // S-12 at left, S-01 at right
        const i = num; // 1 to 12
        x = 350 + (i * 40);
        y = 850;
        rot = 0;
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
