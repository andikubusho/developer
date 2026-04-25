const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function checkData() {
  try {
    await client.connect();
    const res = await client.query("SELECT id, email, full_name, password FROM profiles WHERE email LIKE 'admin_%'");
    console.log('--- DATA PROFIL ADMIN ---');
    console.log(JSON.stringify(res.rows, (key, value) => key === 'password' ? value.substring(0, 10) + '...' : value, 2));
  } catch (err) {
    console.error(err.message);
  } finally {
    await client.end();
  }
}

checkData();
