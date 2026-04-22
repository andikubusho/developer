import { db } from "../server/db";
import { expeditions, customers, shipments } from "../shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding sample data...");

  // 1. Master Ekspedisi
  const [expedition] = await db.insert(expeditions).values({
    name: "Sample Ekspedisi Lintas",
    active: true,
  }).returning();

  console.log("Created Expedition:", expedition.id);

  // 2. Master Pelanggan
  const [customer] = await db.insert(customers).values({
    name: "Toko Harapan Makmur",
    address: "Jl. Sudirman No 123",
    phone: "08123456789",
  }).returning();

  console.log("Created Customer:", customer.id);

  // 3. Shipment 1: Untuk menu Input Pengiriman & Packing 
  // Status: MENUNGGU_VERIFIKASI
  await db.insert(shipments).values({
    invoiceNumber: "INV-SMP-001",
    customerId: customer.id,
    expeditionId: expedition.id,
    destination: "Jakarta Pusat",
    totalNotes: 2,
    notes: "Barang pecah belah",
    status: "MENUNGGU_VERIFIKASI"
  });

  // 4. Shipment 2: Untuk menu Jadwal Pengiriman (Sudah dipacking)
  // Status: MENUNGGU_VERIFIKASI dengan verificationDate
  await db.insert(shipments).values({
    invoiceNumber: "INV-SMP-002",
    customerId: customer.id,
    expeditionId: expedition.id,
    destination: "Surabaya",
    totalNotes: 1,
    status: "MENUNGGU_VERIFIKASI",
    totalBoxes: 5,
    packerName: "Budi",
    verificationDate: new Date()
  });

  // 5. Shipment 3: Untuk menu Terkirim / Riwayat (Sedang dikirim)
  // Status: DALAM_PENGIRIMAN
  await db.insert(shipments).values({
    invoiceNumber: "INV-SMP-003",
    customerId: customer.id,
    expeditionId: expedition.id,
    destination: "Bandung",
    totalNotes: 3,
    status: "DALAM_PENGIRIMAN",
    totalBoxes: 2,
    packerName: "Budi",
    verificationDate: new Date(),
    senderName: "Andi",
    receiptNumber: "RESI-003",
    shippingDate: new Date()
  });

  // 6. Shipment 4: Untuk menu Pengembalian Faktur (Sudah Terkirim)
  // Status: TERKIRIM
  await db.insert(shipments).values({
    invoiceNumber: "INV-SMP-004",
    customerId: customer.id,
    expeditionId: expedition.id,
    destination: "Semarang",
    totalNotes: 1,
    status: "TERKIRIM",
    totalBoxes: 1,
    packerName: "Budi",
    verificationDate: new Date(),
    senderName: "Andi",
    receiptNumber: "RESI-004",
    shippingDate: new Date()
  });

  console.log("Seeding complete! Sample data is ready.");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Failed to seed:", err);
  process.exit(1);
});
