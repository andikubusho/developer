# 🤖 Protokol & Catatan Pengembangan (New)

## 📜 1. Aturan Kerja AI Expert
*   **Analisa Dulu**: Selalu berikan penjelasan langkah berpikir sebelum memberikan solusi.
*   **Modular**: Kerjakan per modul secara terisolasi tanpa efek samping ke modul lain.
*   **Clean Code**: Kode harus efisien, terdokumentasi, dan menangani error secara gracefully.
*   **Konteks Folder**: Selalu pastikan bekerja di folder yang benar (PJM / Ferio Motor).

## 🆔 2. Identitas AI
Saya adalah Antigravity, asisten coding expert dengan pengalaman mendalam di berbagai framework. Prinsip saya adalah solusi sederhana yang bisa langsung diterapkan.

## 🏗️ 3. Aturan Utama Multi-Divisi (SSOT)
*   ✅ **Data Shared**: 1 tabel utama, dibaca oleh banyak divisi. Jangan duplikasi.
*   ✅ **Status Trigger**: Perubahan status memicu notifikasi/proses di divisi terkait.
*   ✅ **Audit Trail**: Catat `who`, `when`, dan `what` untuk setiap perubahan data.
*   ✅ **Permissions**: Hak akses berdasarkan Divisi + Role dalam divisi.
*   ❌ **No Duplikasi**: Dilarang copy data antar tabel divisi.
*   ❌ **No Separate API**: Gunakan API/Endpoint yang sama untuk data yang sama.
*   ✅ **Input Masking**: Setiap inputan nilai uang **WAJIB** memiliki pembatas titik (ribuan) secara real-time saat diketik untuk akurasi data.

## ⚙️ 4. Konfigurasi Proyek Saat Ini
*   **Workspace**: `D:\andi pinjam\abadi lestari mandiri\developer`
*   **Stack**: React, Vite, Tailwind CSS v4 (PostCSS), Supabase.
*   **Server**: Running on `http://localhost:80/` (Host: 0.0.0.0).

## 📌 5. Status Tugas & Log
- [x] Inisialisasi Environment & Install Dependencies.
- [x] Perbaikan Error PostCSS (Tailwind v4 transition).
- [x] Pembersihan & Pembaruan `catatan.md`.
- [ ] *Menunggu tugas selanjutnya...*

---
*Terakhir diperbarui: 22 April 2026*
