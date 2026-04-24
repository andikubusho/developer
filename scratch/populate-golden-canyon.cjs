const { Client } = require('pg');
require('dotenv').config();

async function populate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  try {
    // 1. Get or Create Golden Canyon Project
    let projectRes = await client.query("SELECT id FROM projects WHERE name = 'Golden Canyon'");
    let projectId;

    if (projectRes.rows.length === 0) {
      const newProject = await client.query(
        "INSERT INTO projects (id, name, developer, location, description, status, active) VALUES (gen_random_uuid(), 'Golden Canyon', 'Abadi Lestari Mandiri', 'Location', 'Golden Canyon Site Plan', 'ongoing', true) RETURNING id"
      );
      projectId = newProject.rows[0].id;
    } else {
      projectId = projectRes.rows[0].id;
    }

    console.log(`Using Project ID: ${projectId}`);

    // Helper to generate units
    const units = [];

    // Blok N-Atas: ~14 unit, diagonal kiri atas, rotasi ±-30°
    // Estimasi: x: 15->45, y: 15->35
    for (let i = 1; i <= 14; i++) {
      units.push({
        unit_number: `N-${i.toString().padStart(2, '0')}`,
        type: 'Rumah',
        status: 'available',
        sp_x: 15 + (i * 2.5),
        sp_y: 50 - (i * 1.5),
        sp_rotation: -30,
        sp_width: 2.5,
        sp_height: 5
      });
    }

    // Blok N-Bawah: ~14 unit, diagonal kiri bawah, rotasi ±-20°
    // Estimasi: x: 15->45, y: 70->85
    for (let i = 1; i <= 14; i++) {
      units.push({
        unit_number: `NB-${i.toString().padStart(2, '0')}`,
        type: 'Rumah',
        status: 'available',
        sp_x: 15 + (i * 2.8),
        sp_y: 75 + (i * 0.8),
        sp_rotation: -20,
        sp_width: 2.5,
        sp_height: 5
      });
    }

    // Blok E (Vertical, 2 columns)
    const generateBlockE = (prefix, startY, count, startX = 75) => {
      for (let i = 1; i <= count; i++) {
        // Col 1
        units.push({
          unit_number: `${prefix}-${i.toString().padStart(2, '0')}`,
          type: 'Rumah',
          status: 'available',
          sp_x: startX,
          sp_y: startY + (i * 4),
          sp_rotation: 0,
          sp_width: 4,
          sp_height: 3
        });
        // Col 2 (Optional or just follow the 2 column description)
      }
    };

    // Blok E-Atas: ~12 unit
    generateBlockE('EA', 10, 12, 75);
    generateBlockE('EB', 10, 12, 85); // 2nd column

    // Blok E-Tengah: ~10 unit
    generateBlockE('ET', 45, 10, 75);

    // Blok E-Bawah: ~8 unit
    generateBlockE('EW', 75, 8, 75);

    console.log(`Inserting ${units.length} units...`);

    for (const unit of units) {
      await client.query(
        "INSERT INTO units (id, project_id, unit_number, type, status, sp_x, sp_y, sp_rotation, sp_width, sp_height) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9) ON CONFLICT (project_id, unit_number) DO UPDATE SET sp_x = EXCLUDED.sp_x, sp_y = EXCLUDED.sp_y, sp_rotation = EXCLUDED.sp_rotation, sp_width = EXCLUDED.sp_width, sp_height = EXCLUDED.sp_height",
        [projectId, unit.unit_number, unit.type, unit.status, unit.sp_x, unit.sp_y, unit.sp_rotation, unit.sp_width, unit.sp_height]
      );
    }

    console.log("Migration complete!");

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

populate();
