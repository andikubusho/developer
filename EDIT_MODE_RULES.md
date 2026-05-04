# Aturan Edit Mode — Semua Form

> **CATATAN DEFAULT**: Saat tombol **Edit** diklik, **SEMUA data inputan harus tetap persis seperti data awal**. Tidak ada satupun field yang boleh tereset atau berubah, kecuali user secara manual mengubahnya.

## Prinsip Utama

1. **Preserve All Values**: Setiap field (text, select, date, currency, radio, checkbox) harus menampilkan nilai asli dari database saat form edit dibuka.
2. **No Side-Effect Overwrite**: Side-effect hooks (useEffect) yang menghitung ulang nilai (harga, diskon, deposit, dll) **WAJIB** di-skip selama fase inisialisasi edit mode.
3. **Async Options Guard**: Untuk field `<Select>` yang options-nya dimuat secara async, nilai field harus di-set ulang **SETELAH** options tersedia, bukan sebelumnya.

## Checklist Field yang Harus Diverifikasi

Setiap kali ada perubahan pada form yang memiliki tombol edit, pastikan field-field berikut **tidak berubah**:

### SaleForm (Penjualan)
- [ ] `sale_date` — Tanggal Transaksi
- [ ] `consultant_id` — Konsultan Property  
- [ ] `customer_id` — Nama Konsumen ⚠️ (async, tergantung consultant_id)
- [ ] `project_id` — Proyek
- [ ] `unit_id` — Unit / Blok ⚠️ (async, tergantung project_id)
- [ ] `payment_method` — Metode Pembayaran (radio)
- [ ] `supervisor` — Supervisor
- [ ] `manager` — Manager
- [ ] `makelar` — Makelar / Agent
- [ ] `freelance` — Freelance
- [ ] `price` — Harga Unit ⚠️ (side-effect dari unit_id)
- [ ] `discount` — Discount
- [ ] `promo_id` — Promo ⚠️ (async options)
- [ ] `booking_fee` — Nilai Booking Fee
- [ ] `booking_fee_date` — Tanggal Booking Fee
- [ ] `dp_amount` — Nilai Down Payment
- [ ] `dp_date` — Tanggal Down Payment
- [ ] `deposit_id` — Deposit ⚠️ (side-effect dari customer_id)
- [ ] `deposit_amount` — Jumlah Deposit ⚠️ (side-effect)
- [ ] `total_price` — Total Harga ⚠️ (calculated)
- [ ] `final_price` — Harga Akhir ⚠️ (calculated)
- [ ] `installments` — Jadwal Cicilan (array)

## Pola Implementasi yang Benar

```typescript
// 1. Gunakan ref untuk melacak status inisialisasi
const isEditInitialized = useRef(false);

// 2. Di setiap side-effect hook, SKIP selama inisialisasi
useEffect(() => {
  if (initialData && !isEditInitialized.current) return; // ← WAJIB
  // ... logic side-effect
}, [dependencies]);

// 3. Set ulang semua select values SETELAH options async dimuat
useEffect(() => {
  if (!hasLoadedMasterData || !initialData) return;
  setValue('field_1', initialData.field_1 || '');
  setValue('field_2', initialData.field_2 || '');
  // ... semua field select
}, [hasLoadedMasterData]);

// 4. Set customer_id SETELAH customers list tersedia, lalu tandai init selesai
useEffect(() => {
  if (!initialData || !customers.length) return;
  if (isEditInitialized.current) return;
  setValue('customer_id', initialData.customer_id || '');
  setTimeout(() => { isEditInitialized.current = true; }, 200);
}, [customers]);
```

## Format Tanggal

> **CATATAN DEFAULT**: Semua tanggal di aplikasi ini **WAJIB** menggunakan format Indonesia (**DD/MM/YYYY**).  
> Gunakan komponen `DateInput` (`src/components/ui/DateInput.tsx`) untuk semua input tanggal.  
> Jangan gunakan `<Input type="date">` secara langsung.

## Kapan Aturan Ini Berlaku

- ✅ `SaleForm` (Penjualan)
- ✅ `PaymentForm` (Pembayaran) 
- ✅ `PurchaseOrderForm` (Purchase Order)
- ✅ `RABForm` (Rencana Anggaran)
- ✅ Semua form lain yang memiliki tombol Edit
