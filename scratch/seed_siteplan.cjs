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
        // Mengikuti garis teknik miring ke kiri atas
        const i = num - 1;
        const gap = num >= 14 ? 100 : 0; 
        x = 160 + (i * 20) + gap;
        y = 860 + (i * -38) - gap; // Lebih tegak miringnya
        rot = -28; 
      } else if (blok === 'East' || blok === 'E') {
        // Cluster kanan atas
        const i = num - 1;
        x = 680 + (i * 10);
        y = 120 + (i * 55);
        rot = -10;
      } else if (blok === 'GC') {
        // Sisi kanan tengah
        if (num <= 9) {
          x = 720 + ((num-1) * 15);
          y = 420 + ((num-1) * 35);
          rot = -15;
        } else {
          x = 420 + ((num-10) * 45);
          y = 560 + ((num-10) * 18);
          rot = -22;
        }
      } else if (blok === 'South' || blok === 'S') {
        // Mengikuti garis teknik bawah yang miring ke kanan atas
        const i = num - 1;
        x = 240 + (i * 45);
        y = 920 + (i * -18);
        rot = -22;
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
