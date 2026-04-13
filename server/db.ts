import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

import { log } from "./logger";

const url = process.env.DATABASE_URL || "";

if (!url) {
  console.error("DATABASE_URL is not set! The server will likely crash on DB access.");
}

console.log("[DB] Initializing pool...");
export const pool = new pg.Pool({
  connectionString: url,
  ssl: {
    rejectUnauthorized: false
  },
  connectionTimeoutMillis: 30000, 
  max: 20, 
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => {
  log(`New client connected. Pool: ${pool.totalCount} total, ${pool.idleCount} idle`, "db");
});

pool.on('error', (err) => {
  log(`Unexpected error on idle client: ${err.message}`, "db");
});

pool.on('acquire', () => {
  // log(`Client acquired. Pool: ${pool.totalCount} total, ${pool.idleCount} idle`, "db");
});

export const db = drizzle(pool, { schema });
