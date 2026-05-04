# Implementation Plan - PPN System for Purchase Orders (PO)

This plan outlines the steps to integrate a PPN (VAT) calculation system into the Purchase Order module. Users will be able to toggle PPN on or off for each PO, with the system automatically calculating the tax amount and grand total.

## Proposed Changes

### 1. Database & Schema
#### [MODIFY] `shared/schema.ts`
- Update `purchaseOrders` table definition to include:
  - `includePpn`: boolean (default: false)
  - `ppnRate`: numeric (default: "11")
  - `ppnAmount`: numeric (default: "0")
  - `grandTotal`: numeric (default: "0")
- Update Zod schemas and TypeScript types for `PurchaseOrder`.

### 2. Purchase Order Form
#### [MODIFY] `src/components/forms/PurchaseOrderForm.tsx`
- **State Management**: Add `includePpn` to the form state.
- **UI Implementation**:
  - Add a styled "PPN (11%)" checkbox toggle near the total calculation area.
  - Display a breakdown in the total summary:
    - Subtotal (Sum of items)
    - PPN Amount (11% of subtotal if enabled)
    - Grand Total (Subtotal + PPN)
- **Logic Updates**:
  - Update `onSubmit` (Single Item) to calculate and save PPN fields.
  - Update `onBatchSubmit` (Multi Item) to calculate and save PPN fields.

### 3. Purchase Order List & Details
#### [MODIFY] `src/pages/PurchaseOrders.tsx`
- **Table View**: Update the "Total" column to show the `grand_total`.
- **Detail Modal**: Add a clear breakdown showing Subtotal, PPN (if any), and Grand Total.

## User Review Required

> [!IMPORTANT]
> **PPN Rate**: Rencana ini menggunakan rate PPN standar **11%**. Apakah perlu dibuat agar rate bisa diubah-ubah (custom), atau cukup 11% saja?

## Verification Plan

### Manual Verification
- [ ] Buat PO tanpa PPN dan pastikan `grand_total` sama dengan subtotal.
- [ ] Buat PO dengan PPN dan pastikan `ppn_amount` terhitung 11% dengan benar.
- [ ] Cek history PO apakah total yang muncul adalah Grand Total.
