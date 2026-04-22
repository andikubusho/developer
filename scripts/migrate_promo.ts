
import "dotenv/config";
import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";

async function migrate() {
  console.log("Starting manual migration for Integrated Promo System...");
  
  const queries = [
    `CREATE TABLE IF NOT EXISTS promo_pelanggan (
        id            SERIAL PRIMARY KEY,
        pelanggan_id  INT NOT NULL,
        promo_id      INT NOT NULL,
        status        TEXT NOT NULL,
        tgl_mulai     TIMESTAMP NOT NULL,
        tgl_selesai   TIMESTAMP NULL
    );`,
    `CREATE TABLE IF NOT EXISTS paket_pelanggan (
        id            SERIAL PRIMARY KEY,
        pelanggan_id  INT NOT NULL,
        paket_id      INT NOT NULL,
        status        TEXT NOT NULL,
        tgl_mulai     TIMESTAMP NOT NULL,
        tgl_selesai   TIMESTAMP NULL
    );`,
    `CREATE TABLE IF NOT EXISTS cashback_master (
        id             SERIAL PRIMARY KEY,
        nama           VARCHAR(100) NOT NULL,
        tipe_cashback  TEXT NOT NULL,
        nilai          DECIMAL(15,2) NOT NULL,
        min_transaksi  DECIMAL(15,2) NOT NULL DEFAULT 0,
        maks_cashback  DECIMAL(15,2) NULL,
        status         TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS cutting_master (
        id              SERIAL PRIMARY KEY,
        nama            VARCHAR(100) NOT NULL,
        nilai_per_label DECIMAL(15,2) NOT NULL,
        status          TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS cutting_progress (
        id            SERIAL PRIMARY KEY,
        pelanggan_id  INT NOT NULL,
        cutting_id    INT NOT NULL,
        total_label   INT NOT NULL DEFAULT 0,
        total_nilai   DECIMAL(15,2) NOT NULL DEFAULT 0,
        status_cair   TEXT NOT NULL DEFAULT 'belum',
        updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS point_master (
        id           SERIAL PRIMARY KEY,
        nama         VARCHAR(100) NOT NULL,
        poin_per_qty DECIMAL(10,2) NOT NULL,
        status       TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS point_saldo (
        pelanggan_id    INT PRIMARY KEY,
        saldo_poin      DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_diperoleh DECIMAL(12,2) NOT NULL DEFAULT 0,
        total_ditukar   DECIMAL(12,2) NOT NULL DEFAULT 0,
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS hadiah_katalog (
        id               SERIAL PRIMARY KEY,
        nama_hadiah      VARCHAR(150) NOT NULL,
        poin_dibutuhkan  DECIMAL(12,2) NOT NULL,
        stok             INT NOT NULL DEFAULT 0,
        status           TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS paket_master (
        id             SERIAL PRIMARY KEY,
        nama           VARCHAR(100) NOT NULL,
        periode_bulan  INT NOT NULL,
        start_date     TIMESTAMP NOT NULL,
        basis_type     TEXT NOT NULL,
        acuan_tanggal  TEXT NOT NULL DEFAULT 'faktur',
        status         TEXT NOT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS paket_tier (
        id           SERIAL PRIMARY KEY,
        paket_id     INT NOT NULL,
        urutan_tier  INT NOT NULL,
        min_value    DECIMAL(15,2) NOT NULL,
        max_value    DECIMAL(15,2) NULL,
        reward_type  TEXT NOT NULL,
        reward_value DECIMAL(15,2) NULL,
        reward_desc  VARCHAR(255) NULL
    );`,
    `CREATE TABLE IF NOT EXISTS paket_progress (
        id              SERIAL PRIMARY KEY,
        pelanggan_id    INT NOT NULL,
        paket_id        INT NOT NULL,
        total_qty       DECIMAL(15,2) NOT NULL DEFAULT 0,
        total_nilai     DECIMAL(15,2) NOT NULL DEFAULT 0,
        current_tier_id INT NULL,
        periode_start   TIMESTAMP NOT NULL,
        periode_end     TIMESTAMP NOT NULL,
        status          TEXT NOT NULL,
        updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS reward_claim (
        id             SERIAL PRIMARY KEY,
        pelanggan_id   INT NOT NULL,
        sumber         TEXT NOT NULL,
        ref_id         INT NOT NULL,
        reward_type    TEXT NOT NULL,
        reward_desc    VARCHAR(255) NULL,
        jumlah         DECIMAL(15,2) NOT NULL,
        hadiah_id      INT NULL,
        tanggal_klaim  TIMESTAMP NOT NULL,
        approved_by    VARCHAR(100) NULL,
        claimed_date   TIMESTAMP NULL,
        status         TEXT NOT NULL DEFAULT 'pending',
        catatan        TEXT NULL
    );`,
    `CREATE TABLE IF NOT EXISTS transaksi_promo_new (
        id            SERIAL PRIMARY KEY,
        pelanggan_id  INT NOT NULL,
        no_faktur     TEXT NOT NULL UNIQUE,
        tgl_faktur    TIMESTAMP NOT NULL,
        qty           INT NOT NULL,
        nilai_faktur  DECIMAL(15,2) NOT NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT NOW()
    );`,
    `CREATE TABLE IF NOT EXISTS promo_hasil (
        id             SERIAL PRIMARY KEY,
        transaksi_id   INT NOT NULL,
        cashback_id    INT NOT NULL,
        nilai_cashback DECIMAL(15,2) NOT NULL
    );`,
  ];

  for (const query of queries) {
    try {
      console.log(`Executing: ${query.split('\n')[0]}...`);
      await db.execute(sql.raw(query));
      console.log("Success.");
    } catch (err: any) {
      console.error(`Failed executing query: ${err.message}`);
    }
  }

  console.log("Manual migration complete.");
  await pool.end();
  process.exit(0);
}

migrate();
