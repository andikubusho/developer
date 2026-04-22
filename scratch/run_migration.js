import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const runMigration = async () => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');

    const sqlPath = path.join(process.cwd(), 'price_list_data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');

  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await client.end();
  }
};

runMigration();
