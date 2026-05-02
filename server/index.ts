import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./auth";
import compression from "compression";
import fs from "fs";
import path from "path";

const app = express();
export { app };
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "50mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(compression());

process.on("uncaughtException", (err) => {
  console.error("FATAL: Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("FATAL: Unhandled Rejection at:", promise, "reason:", reason);
});

app.use(express.urlencoded({ limit: "50mb", extended: false }));

import { log } from "./logger";
export { log };


app.get("/api/ping", (req, res) => {
  res.json({ status: "ok", message: "Server is alive" });
});

app.get("/api/health", async (req, res) => {
  log("Health check requested...");
  try {
    const { db } = await import("./db");
    const { sql } = await import("drizzle-orm");
    log("Executing DB health query...");
    await db.execute(sql`SELECT 1`);
    log("DB health query successful.");
    res.json({ status: "ok", db: "connected" });
  } catch (err: any) {
    log(`DB health query failed: ${err.message}`);
    res.status(500).json({ status: "error", message: err.message });
  }
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`, "debug");
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization...");
    const dbUrl = process.env.DATABASE_URL || "";
    if (dbUrl) {
      const redacted = dbUrl.replace(/:([^@]+)@/, ":****@");
      log(`DATABASE_URL: ${redacted}`);
    } else {
      log("WARNING: DATABASE_URL is not set!");
    }

    log("Step 0: Running database migrations...");
    try {
      const { db } = await import("./db");
      const { sql } = await import("drizzle-orm");
      
      await db.execute(sql`
        ALTER TABLE IF EXISTS users 
        ADD COLUMN IF NOT EXISTS authorized_dashboards jsonb DEFAULT '["gudang"]'::jsonb NOT NULL;

        ALTER TABLE IF EXISTS user_permissions ADD COLUMN IF NOT EXISTS can_export BOOLEAN DEFAULT TRUE NOT NULL;
        ALTER TABLE IF EXISTS user_permissions ADD COLUMN IF NOT EXISTS can_print BOOLEAN DEFAULT TRUE NOT NULL;
        
        ALTER TABLE IF EXISTS shipments ADD COLUMN IF NOT EXISTS merek_id INTEGER REFERENCES promo_brands(id);
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS merek_id INTEGER REFERENCES promo_brands(id);

        ALTER TABLE IF EXISTS spks ADD COLUMN IF NOT EXISTS unit_id TEXT;
        ALTER TABLE IF EXISTS spks ADD COLUMN IF NOT EXISTS contractor_name TEXT;
        ALTER TABLE IF EXISTS spks ADD COLUMN IF NOT EXISTS work_description TEXT;
        ALTER TABLE IF EXISTS spks ADD COLUMN IF NOT EXISTS contract_value NUMERIC DEFAULT 0;
        ALTER TABLE IF EXISTS spks ADD COLUMN IF NOT EXISTS start_date TIMESTAMP;
        ALTER TABLE IF EXISTS spks ADD COLUMN IF NOT EXISTS end_date TIMESTAMP;
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          action TEXT NOT NULL,
          resource TEXT NOT NULL,
          details TEXT,
          timestamp TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS promos (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP NOT NULL,
          active BOOLEAN DEFAULT TRUE NOT NULL,
          banner_url TEXT,
          branch_id INTEGER,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS items (
          id SERIAL PRIMARY KEY,
          code TEXT NOT NULL UNIQUE,
          name TEXT NOT NULL,
          brand_code TEXT NOT NULL,
          selling_price INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          location TEXT,
          status TEXT,
          site_plan_image_url TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS materials (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          unit TEXT NOT NULL,
          category TEXT,
          specification TEXT,
          stock NUMERIC DEFAULT '0' NOT NULL,
          min_stock NUMERIC DEFAULT '0' NOT NULL,
          unit_price NUMERIC DEFAULT '0',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS units (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          unit_number TEXT NOT NULL,
          type TEXT,
          price NUMERIC DEFAULT '0',
          status TEXT DEFAULT 'available',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS rab_projects (
          id TEXT PRIMARY KEY,
          nama_proyek TEXT NOT NULL,
          lokasi TEXT,
          total_anggaran NUMERIC DEFAULT '0',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS rab_items (
          id TEXT PRIMARY KEY,
          rab_project_id TEXT NOT NULL,
          parent_id TEXT,
          level INTEGER DEFAULT 0,
          uraian TEXT NOT NULL,
          volume NUMERIC DEFAULT '0',
          satuan TEXT,
          harga_rab NUMERIC DEFAULT '0',
          urutan INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS purchase_requests (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          unit_id TEXT,
          item_name TEXT,
          status TEXT DEFAULT 'SUBMITTED' NOT NULL,
          items JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS purchase_orders (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          supplier_id INTEGER,
          date TIMESTAMP,
          due_date TIMESTAMP,
          status TEXT DEFAULT 'PENDING' NOT NULL,
          items JSONB,
          total_price NUMERIC DEFAULT '0',
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS material_suppliers (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT,
          phone TEXT,
          contact_person TEXT,
          bank_name TEXT,
          bank_account_number TEXT,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS project_material_stocks (
          id SERIAL PRIMARY KEY,
          project_id TEXT NOT NULL,
          material_id TEXT NOT NULL,
          stock NUMERIC DEFAULT '0' NOT NULL,
          UNIQUE(project_id, material_id)
        );

        CREATE TABLE IF NOT EXISTS material_stock_logs (
          id SERIAL PRIMARY KEY,
          material_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          unit_id TEXT,
          transaction_type TEXT NOT NULL,
          qty_change NUMERIC NOT NULL,
          qty_before NUMERIC NOT NULL,
          qty_after NUMERIC NOT NULL,
          reference_type TEXT,
          reference_id TEXT,
          created_by INTEGER NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          notes TEXT
        );

        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          salesman_id INTEGER NOT NULL,
          date TIMESTAMP NOT NULL,
          shop_name TEXT NOT NULL,
          city TEXT NOT NULL,
          region TEXT NOT NULL,
          expedition_name TEXT NOT NULL,
          total_amount INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INTEGER NOT NULL,
          item_code TEXT NOT NULL,
          item_name TEXT NOT NULL,
          qty INTEGER NOT NULL,
          discount TEXT DEFAULT '0' NOT NULL,
          price INTEGER NOT NULL,
          total INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS sales_customers (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          address TEXT NOT NULL,
          phone TEXT,
          branch_id INTEGER,
          price_type TEXT DEFAULT 'retail' NOT NULL
        );

        CREATE TABLE IF NOT EXISTS taxes (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          rate NUMERIC NOT NULL,
          is_active BOOLEAN DEFAULT TRUE NOT NULL
        );

        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS ppn_rate NUMERIC DEFAULT 0 NOT NULL;
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS ppn_amount INTEGER DEFAULT 0 NOT NULL;
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS final_total INTEGER DEFAULT 0 NOT NULL;
        ALTER TABLE IF EXISTS orders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'menunggu' NOT NULL;
        ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS city TEXT;
        ALTER TABLE IF EXISTS sales_customers ADD COLUMN IF NOT EXISTS city TEXT;

        DO $$
        BEGIN
          IF NOT EXISTS(SELECT * FROM taxes LIMIT 1) THEN
            INSERT INTO taxes (name, rate, is_active) VALUES ('PPN', 11, true);
          END IF;
        END $$;

        ALTER TABLE IF EXISTS customers ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'retail' NOT NULL;
        
        DO $$
        BEGIN
          IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name='items' and column_name='selling_price') THEN
            ALTER TABLE items RENAME COLUMN selling_price TO retail_price;
          END IF;
        END $$;
        ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS wholesale_price INTEGER DEFAULT 0 NOT NULL;
        ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS retail_price INTEGER DEFAULT 0 NOT NULL;
        ALTER TABLE IF EXISTS items ADD COLUMN IF NOT EXISTS semi_wholesale_price INTEGER DEFAULT 0 NOT NULL;

        UPDATE items SET semi_wholesale_price = retail_price WHERE semi_wholesale_price = 0 AND retail_price > 0;
        ALTER TABLE IF EXISTS order_items ALTER COLUMN discount TYPE TEXT USING discount::text;
        ALTER TABLE IF EXISTS branches ADD COLUMN IF NOT EXISTS use_ppn BOOLEAN DEFAULT FALSE NOT NULL;

        ALTER TABLE IF EXISTS items ALTER COLUMN wholesale_price TYPE BIGINT;
        ALTER TABLE IF EXISTS items ALTER COLUMN semi_wholesale_price TYPE BIGINT;
        ALTER TABLE IF EXISTS items ALTER COLUMN retail_price TYPE BIGINT;
        ALTER TABLE IF EXISTS orders ALTER COLUMN total_amount TYPE BIGINT;
        ALTER TABLE IF EXISTS orders ALTER COLUMN ppn_amount TYPE BIGINT;
        ALTER TABLE IF EXISTS orders ALTER COLUMN final_total TYPE BIGINT;
        ALTER TABLE IF EXISTS order_items ALTER COLUMN price TYPE BIGINT;
        ALTER TABLE IF EXISTS order_items ALTER COLUMN total TYPE BIGINT;
        ALTER TABLE IF EXISTS promo_inputs ALTER COLUMN invoice_total TYPE BIGINT;
        ALTER TABLE IF EXISTS promo_inputs ALTER COLUMN calculated_value TYPE BIGINT;
        ALTER TABLE IF EXISTS promo_inputs ALTER COLUMN paid_amount TYPE BIGINT;
        ALTER TABLE IF EXISTS payment_confirmations ALTER COLUMN amount TYPE BIGINT;

        UPDATE sales_customers SET branch_id = (SELECT id FROM branches ORDER BY id LIMIT 1) WHERE branch_id IS NULL;
        UPDATE sales_customers SET total_point = 0 WHERE total_point IS NULL;
        UPDATE sales_customers SET total_label = 0 WHERE total_label IS NULL;
        UPDATE sales_customers SET total_claim = 0 WHERE total_claim IS NULL;
        UPDATE sales_customers SET total_promo = 0 WHERE total_promo IS NULL;

        CREATE TABLE IF NOT EXISTS pelanggan_program (
          id SERIAL PRIMARY KEY,
          pelanggan_id INTEGER NOT NULL,
          jenis_program TEXT NOT NULL,
          referensi_id INTEGER NOT NULL,
          tgl_mulai TIMESTAMP DEFAULT NOW() NOT NULL,
          status TEXT DEFAULT 'aktif' NOT NULL,
          branch_id INTEGER REFERENCES branches(id)
        );

        CREATE TABLE IF NOT EXISTS transaksi_promo_new (
          id SERIAL PRIMARY KEY,
          pelanggan_id INTEGER NOT NULL,
          no_faktur TEXT NOT NULL UNIQUE,
          tgl_faktur TIMESTAMP NOT NULL,
          qty INTEGER NOT NULL,
          nilai_faktur NUMERIC NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          branch_id INTEGER REFERENCES branches(id)
        );

        CREATE TABLE IF NOT EXISTS promo_hasil (
          id SERIAL PRIMARY KEY,
          transaksi_id INTEGER NOT NULL,
          cashback_id INTEGER NOT NULL,
          nilai_cashback NUMERIC NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cutting_progress (
          id SERIAL PRIMARY KEY,
          pelanggan_id INTEGER NOT NULL,
          cutting_id INTEGER NOT NULL,
          total_label INTEGER DEFAULT 0 NOT NULL,
          total_nilai NUMERIC DEFAULT 0 NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          branch_id INTEGER REFERENCES branches(id)
        );

        CREATE TABLE IF NOT EXISTS point_saldo (
          id SERIAL PRIMARY KEY,
          pelanggan_id INTEGER NOT NULL,
          saldo_poin NUMERIC DEFAULT 0 NOT NULL,
          total_diperoleh NUMERIC DEFAULT 0 NOT NULL,
          branch_id INTEGER REFERENCES branches(id)
        );

        CREATE TABLE IF NOT EXISTS paket_progress (
          id SERIAL PRIMARY KEY,
          pelanggan_id INTEGER NOT NULL,
          paket_id INTEGER NOT NULL,
          total_qty NUMERIC DEFAULT 0 NOT NULL,
          total_nilai NUMERIC DEFAULT 0 NOT NULL,
          current_tier_id INTEGER,
          periode_start TIMESTAMP NOT NULL,
          periode_end TIMESTAMP NOT NULL,
          status TEXT DEFAULT 'berjalan' NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          branch_id INTEGER REFERENCES branches(id)
        );

        ALTER TABLE IF EXISTS pelanggan_program ADD COLUMN IF NOT EXISTS brand_code TEXT DEFAULT 'FERIO' NOT NULL;
        ALTER TABLE IF EXISTS transaksi_promo_new ADD COLUMN IF NOT EXISTS brand_code TEXT DEFAULT 'FERIO' NOT NULL;
        ALTER TABLE IF EXISTS point_saldo ADD COLUMN IF NOT EXISTS brand_code TEXT DEFAULT 'FERIO' NOT NULL,
        ADD COLUMN IF NOT EXISTS total_ditukar NUMERIC DEFAULT 0 NOT NULL,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;

        ALTER TABLE IF EXISTS cutting_progress ADD COLUMN IF NOT EXISTS status_cair TEXT DEFAULT 'belum' NOT NULL;
        ALTER TABLE IF EXISTS paket_master ADD COLUMN IF NOT EXISTS end_date TIMESTAMP NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS brand_code TEXT DEFAULT 'SEMUA',
        ADD COLUMN IF NOT EXISTS branch_id INTEGER,
        ADD COLUMN IF NOT EXISTS acuan_tanggal TEXT DEFAULT 'faktur' NOT NULL;

        ALTER TABLE IF EXISTS paket_tier ADD COLUMN IF NOT EXISTS reward_percent NUMERIC DEFAULT 0;

        DO $$ 
        BEGIN 
          IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paket_tier' AND column_name='branch_id') THEN
            ALTER TABLE paket_tier ALTER COLUMN branch_id DROP NOT NULL;
          END IF;
        END $$;

        CREATE TABLE IF NOT EXISTS point_hadiah (
          id SERIAL PRIMARY KEY,
          nama_program TEXT NOT NULL,
          tanggal_mulai TIMESTAMP NOT NULL,
          tanggal_selesai TIMESTAMP NOT NULL,
          status TEXT NOT NULL DEFAULT 'aktif',
          branch_id INTEGER NOT NULL REFERENCES branches(id),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS point_rule (
          id SERIAL PRIMARY KEY,
          program_id INTEGER NOT NULL REFERENCES point_hadiah(id) ON DELETE CASCADE,
          tipe TEXT NOT NULL,
          nilai_konversi NUMERIC NOT NULL,
          poin_dihasilkan NUMERIC DEFAULT '1' NOT NULL,
          branch_id INTEGER NOT NULL REFERENCES branches(id)
        );

        CREATE TABLE IF NOT EXISTS point_reward (
          id SERIAL PRIMARY KEY,
          program_id INTEGER NOT NULL REFERENCES point_hadiah(id) ON DELETE CASCADE,
          nama_hadiah TEXT NOT NULL,
          point_dibutuhkan INTEGER NOT NULL,
          stok INTEGER DEFAULT 0,
          keterangan TEXT,
          branch_id INTEGER NOT NULL REFERENCES branches(id)
        );

        ALTER TABLE IF EXISTS reward_claim
          ADD COLUMN IF NOT EXISTS metode_pencairan TEXT DEFAULT 'cash',
          ADD COLUMN IF NOT EXISTS tanggal_cair TIMESTAMP,
          ADD COLUMN IF NOT EXISTS keterangan_cash TEXT,
          ADD COLUMN IF NOT EXISTS nama_bank TEXT,
          ADD COLUMN IF NOT EXISTS nomor_rekening TEXT,
          ADD COLUMN IF NOT EXISTS nama_pemilik_rekening TEXT,
          ADD COLUMN IF NOT EXISTS nomor_faktur_potong TEXT,
          ADD COLUMN IF NOT EXISTS nilai_faktur_potong NUMERIC;

        ALTER TABLE IF EXISTS cashback_master
          ADD COLUMN IF NOT EXISTS tipe_syarat TEXT DEFAULT 'tanpa_syarat' NOT NULL,
          ADD COLUMN IF NOT EXISTS masa_berlaku_mulai TIMESTAMP,
          ADD COLUMN IF NOT EXISTS masa_berlaku_selesai TIMESTAMP;

        CREATE TABLE IF NOT EXISTS cashback_reward (
          id SERIAL PRIMARY KEY,
          pelanggan_id INTEGER NOT NULL REFERENCES sales_customers(id),
          cashback_id INTEGER NOT NULL REFERENCES cashback_master(id),
          periode TEXT NOT NULL,
          total_transaksi_periode NUMERIC DEFAULT 0 NOT NULL,
          nilai_cashback NUMERIC DEFAULT 0 NOT NULL,
          status TEXT DEFAULT 'pending' NOT NULL,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          branch_id INTEGER NOT NULL REFERENCES branches(id),
          UNIQUE(pelanggan_id, cashback_id, periode)
        );

        CREATE TABLE IF NOT EXISTS principal_master (
          id SERIAL PRIMARY KEY,
          nama TEXT NOT NULL,
          merek TEXT,
          pic_name TEXT,
          pic_phone TEXT,
          kontak TEXT,
          pic_email TEXT,
          alamat TEXT,
          status TEXT DEFAULT 'aktif' NOT NULL,
          branch_id INTEGER NOT NULL REFERENCES branches(id),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS principal_program (
          id SERIAL PRIMARY KEY,
          nama TEXT NOT NULL,
          principal_id INTEGER NOT NULL REFERENCES principal_master(id),
          brand_code TEXT,
          start_date TIMESTAMP NOT NULL,
          end_date TIMESTAMP DEFAULT NOW() NOT NULL,
          periode_bulan INTEGER,
          siklus TEXT DEFAULT 'per_bulan',
          basis_type TEXT NOT NULL,
          acuan_tanggal TEXT DEFAULT 'faktur' NOT NULL,
          status TEXT DEFAULT 'aktif' NOT NULL,
          tanggal_nonaktif TIMESTAMP,
          branch_id INTEGER NOT NULL REFERENCES branches(id),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        CREATE TABLE IF NOT EXISTS principal_tier (
          id SERIAL PRIMARY KEY,
          program_id INTEGER NOT NULL REFERENCES principal_program(id) ON DELETE CASCADE,
          urutan_tier INTEGER NOT NULL,
          min_value NUMERIC NOT NULL,
          max_value NUMERIC,
          reward_perusahaan_type TEXT DEFAULT 'uang_tunai' NOT NULL,
          reward_perusahaan_value NUMERIC,
          reward_perusahaan_percent NUMERIC,
          reward_perusahaan_desc TEXT,
          reward_principal_type TEXT DEFAULT 'uang_tunai' NOT NULL,
          reward_principal_value NUMERIC,
          reward_principal_percent NUMERIC,
          reward_principal_desc TEXT,
          reward_principal_detail TEXT,
          branch_id INTEGER NOT NULL REFERENCES branches(id)
        );

        CREATE TABLE IF NOT EXISTS principal_subscription (
          id SERIAL PRIMARY KEY,
          pelanggan_id INTEGER NOT NULL,
          program_id INTEGER NOT NULL,
          total_qty NUMERIC DEFAULT 0 NOT NULL,
          total_nilai NUMERIC DEFAULT 0 NOT NULL,
          current_tier_id INTEGER,
          total_reward_calculated NUMERIC DEFAULT 0 NOT NULL,
          total_reward_claimed NUMERIC DEFAULT 0 NOT NULL,
          last_claim_date TIMESTAMP,
          status TEXT DEFAULT 'berjalan' NOT NULL,
          status_periode TEXT DEFAULT 'on_track',
          persen_tercapai NUMERIC DEFAULT 0,
          periode_siklus TEXT,
          periode_start TIMESTAMP NOT NULL,
          periode_end TIMESTAMP NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
          branch_id INTEGER NOT NULL REFERENCES branches(id)
        );

        CREATE TABLE IF NOT EXISTS principal_claim (
          id SERIAL PRIMARY KEY,
          subscription_id INTEGER NOT NULL REFERENCES principal_subscription(id),
          program_id INTEGER NOT NULL REFERENCES principal_program(id),
          tier_id INTEGER NOT NULL REFERENCES principal_tier(id),
          pelanggan_id INTEGER NOT NULL,
          principal_id INTEGER NOT NULL REFERENCES principal_master(id),
          reward_principal_type TEXT NOT NULL,
          reward_principal_desc TEXT,
          reward_principal_value NUMERIC,
          nilai_reward_total NUMERIC,
          tanggungan_principal NUMERIC,
          tanggungan_internal NUMERIC,
          nilai_klaim NUMERIC,
          status TEXT DEFAULT 'belum_klaim' NOT NULL,
          status_periode TEXT,
          persen_tercapai NUMERIC,
          periode TEXT,
          catatan_ditolak TEXT,
          tanggal_klaim TIMESTAMP,
          tanggal_approval TIMESTAMP,
          branch_id INTEGER NOT NULL REFERENCES branches(id),
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );

        ALTER TABLE IF EXISTS paket_master ADD COLUMN IF NOT EXISTS siklus TEXT DEFAULT 'per_bulan';
        ALTER TABLE IF EXISTS cashback_master ADD COLUMN IF NOT EXISTS siklus TEXT DEFAULT 'per_bulan';
        ALTER TABLE IF EXISTS principal_program ADD COLUMN IF NOT EXISTS siklus TEXT DEFAULT 'per_bulan';
        
        ALTER TABLE IF EXISTS cashback_reward 
          ADD COLUMN IF NOT EXISTS status_periode TEXT DEFAULT 'on_track',
          ADD COLUMN IF NOT EXISTS persen_tercapai NUMERIC DEFAULT 0;

        ALTER TABLE IF EXISTS paket_progress 
          ADD COLUMN IF NOT EXISTS periode TEXT,
          ADD COLUMN IF NOT EXISTS status_periode TEXT DEFAULT 'on_track',
          ADD COLUMN IF NOT EXISTS persen_tercapai NUMERIC DEFAULT 0;

        ALTER TABLE IF EXISTS pencairan_rewards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL;
        ALTER TABLE IF EXISTS principal_claim ADD COLUMN IF NOT EXISTS catatan_revisi TEXT,
          ADD COLUMN IF NOT EXISTS riwayat_status JSONB DEFAULT '[]'::JSONB;
      `);
      log("Step 0: Migration complete.");
    } catch (migErr: any) {
      log(`Step 0: Migration skipped or failed (Legacy): ${migErr.message}`, "warn");
    }

    log("Step 2: Registering routes...");
    await registerRoutes(app, httpServer);
    log("Step 2: Routes registration complete.");

    log("Step 3: Checking environment for Vite/Static...");
    const distExists = fs.existsSync(path.resolve(process.cwd(), "dist", "index.html"));
    const isProduction = process.env.NODE_ENV === "production" || distExists;

    if (isProduction) {
      log(`Step 3: Serving static files (dist exists: ${distExists}, NODE_ENV: ${process.env.NODE_ENV})`);
      serveStatic(app);
    } else {
      log("Step 3: Setting up Vite (Development mode)...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      log("Step 3: Vite setup complete.");
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      log(`ERROR: ${status} - ${message}`);
      res.status(status).json({ message });
    });

    log("Step 4: Starting HTTP server...");
    const port = parseInt(process.env.PORT || "5000", 10);
    httpServer.listen({ port, host: "0.0.0.0" }, () => {
      log(`serving on port ${port}`);
    });

  } catch (err: any) {
    log(`FATAL ERROR during startup: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
})();
