
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { users, expeditions, customers } from "../shared/schema.js";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  const connectionString = "postgresql://postgres.yubjdtqcvbwevocfawib:vEBftPhnbrmYa6dz@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres";
  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });
  const db = drizzle(pool);

  console.log("Starting seeding...");

  try {
    // Check if admin exists
    const adminCheck = await pool.query("SELECT * FROM users WHERE username = 'admin' LIMIT 1");
    
    if (adminCheck.rows.length === 0) {
      console.log("Creating admin user...");
      const hashedPassword = await hashPassword("admin123");
      await pool.query(
        "INSERT INTO users (username, password, display_name) VALUES ($1, $2, $3)",
        ["admin", hashedPassword, "Administrator"]
      );
      console.log("Admin user created successfully!");
    } else {
      console.log("Admin user already exists.");
    }

    // Seed others if needed
    const expCheck = await pool.query("SELECT COUNT(*) FROM expeditions");
    if (expCheck.rows[0].count === '0') {
      console.log("Seeding master data...");
      await pool.query("INSERT INTO expeditions (name, active) VALUES ('JNE', true), ('SiCepat', true), ('J&T Express', true)");
      await pool.query("INSERT INTO customers (name, address, phone) VALUES ('PT. Maju Mundur', 'Jl. Sudirman No. 1', '081234567890'), ('Toko Sinar Jaya', 'Pasar Pagi Blok A/1', '081987654321')");
      console.log("Master data seeded!");
    }

    console.log("Seeding completed!");
  } catch (error) {
    console.error("Seeding failed:", error);
  } finally {
    await pool.end();
  }
}

seed();
