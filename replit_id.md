# LogiDash - Sistem Manajemen Pengiriman

## Ikhtisar

LogiDash ("Dashboard Pengiriman") adalah sistem manajemen logistik/pengiriman berbasis web yang dibangun untuk bisnis di Indonesia. Sistem ini memungkinkan pengguna untuk melacak pengiriman melalui alur kerja multi-tahap: input → verifikasi gudang → siap kirim → terkirim. Sistem ini mengelola ekspedisi (perusahaan kurir), pelanggan, dan pengguna dengan izin berbasis peran (role-based permissions).

Fitur utama:
- Pelacakan siklus hidup pengiriman dengan 4 status: `MENUNGGU_VERIFIKASI`, `SIAP_KIRIM`, `DALAM_PENGIRIMAN`, `TERKIRIM`
- Manajemen data master untuk ekspedisi dan pelanggan
- Manajemen pengguna dengan izin per-menu (input/edit/hapus)
- Analitik dashboard yang difilter berdasarkan bulan/tahun
- Autentikasi dengan login berbasis sesi (session-based)

## Referensi Pengguna

Gaya komunikasi yang disukai: Bahasa sederhana dan sehari-hari.

## Arsitektur Sistem

### Struktur Full-Stack
Proyek ini menggunakan tata letak monorepo dengan tiga direktori tingkat atas:
- `client/` — Frontend React (Vite)
- `server/` — Backend Express (Node.js)
- `shared/` — Tipe TypeScript bersama, skema, dan definisi rute yang digunakan oleh kedua sisi

Lapisan bersama ini sangat penting: `shared/schema.ts` mendefinisikan tabel database dan validator Zod, sementara `shared/routes.ts` mendefinisikan kontrak API. Baik client maupun server mengimpor dari `@shared/*`, mencegah terjadinya perbedaan tipe (type drift).

### Arsitektur Frontend
- **Framework**: React 18 dengan TypeScript, dibundel melalui Vite
- **Routing**: `wouter` (alternatif ringan untuk React Router)
- **State/Pengambilan data**: TanStack Query (React Query v5) — semua status server dikelola di sini, dengan hook kustom per sumber daya (`use-shipments.ts`, `use-customers.ts`, `use-expeditions.ts`)
- **UI Components**: shadcn/ui (dibangun di atas primitif Radix UI) dengan Tailwind CSS
- **Formulir**: React Hook Form + `@hookform/resolvers` dengan skema Zod
- **Grafik**: Recharts (melalui wrapper chart shadcn)
- **Penanganan Tanggal**: `date-fns` + `react-day-picker`
- **Status Autentikasi**: Dikelola melalui hook `useAuth` yang memanggil `/api/auth/me` dan menyimpan hasilnya di React Query

**Perlindungan Rute**: Semua rute kecuali `/login` dibungkus dalam komponen `ProtectedRoute` yang memeriksa status autentikasi dan mengarahkan pengguna yang tidak terautentikasi.

### Arsitektur Backend
- **Framework**: Express 5 (dengan TypeScript melalui `tsx`)
- **Autentikasi**: Passport.js dengan strategi lokal; sesi disimpan di PostgreSQL melalui `connect-pg-simple`; kata sandi di-hash menggunakan `crypto.scrypt` bawaan Node
- **Akses Database**: Drizzle ORM dengan `node-postgres` (driver `pg`)
- **Abstraksi Penyimpanan**: File `storage.ts` mengekspor objek `storage` yang mengimplementasikan antarmuka `IStorage`, memisahkan penangan rute dari panggilan DB langsung
- **Sesi**: Cookie 7 hari, aman di produksi, trusted proxy diaktifkan

**Build**: Di produksi, server dikompilasi dengan esbuild (bundel tunggal `.cjs`) dan client dibangun dengan Vite. Di pengembangan, Vite berjalan sebagai middleware di dalam Express (via `server/vite.ts`).

### Skema Database
Database PostgreSQL dengan tabel-tabel berikut:
- `users` — id, username (unik), password (hash), display_name
- `user_permissions` — flags per-pengguna, per-kunci-menu: can_input, can_edit, can_delete
- `expeditions` — id, name, flag aktif
- `customers` — id, name, alamat, telepon
- `shipments` — catatan pengiriman lengkap yang menghubungkan pelanggan + ekspedisi, dengan status, tanggal (input, verifikasi, pengiriman), jumlah box, nomor faktur, tujuan, catatan
- `session` — dikelola secara otomatis oleh `connect-pg-simple`

Skema didefinisikan dalam `shared/schema.ts` menggunakan `pgTable` Drizzle. Skema Zod dihasilkan dari definisi tabel melalui `drizzle-zod`.

### Sistem Izin (Permissions)
- Pengguna dengan `id = 1` diperlakukan sebagai super admin dengan akses penuh ke segalanya
- Semua pengguna lain memiliki izin per-menu yang disimpan dalam `user_permissions`
- Hook `usePermissions` di client mengambil dan memeriksa izin ini untuk pembatasan tingkat UI
- Middleware `requireAuth` di server memastikan rute API yang dilindungi memerlukan sesi yang valid

### Desain API
API REST di bawah `/api/`. Kontrak rute didefinisikan dalam `shared/routes.ts` sebagai objek bertipe (`api.expeditions.list`, `api.shipments.create`, dll.) termasuk metode, jalur, skema input, dan skema respons. Hook client menggunakan objek ini secara langsung untuk membangun panggilan fetch dan memvalidasi respons.

## Ketergantungan Eksternal

### Database
- **PostgreSQL** — penyimpanan data utama; string koneksi melalui variabel lingkungan `DATABASE_URL`
- **Drizzle ORM** — definisi skema, pembuatan query, migrasi (`drizzle-kit push`)
- **connect-pg-simple** — menyimpan sesi Express dalam tabel `session`

### Variabel Lingkungan yang Diperlukan
- `DATABASE_URL` — string koneksi PostgreSQL (diperlukan saat mulai)
- `SESSION_SECRET` — rahasia untuk menandatangani cookie sesi (akan kembali ke default yang tidak aman jika tidak disetel)

### Library Frontend
- `@radix-ui/*` — primitif UI yang aksesibel
- `shadcn/ui` — lapisan komponen di atas Radix (gaya new-york, warna dasar netral)
- `@tanstack/react-query` — manajemen status server
- `wouter` — perutean sisi client
- `react-hook-form` + `@hookform/resolvers` — penanganan formulir dengan validasi Zod
- `recharts` — pembuatan grafik untuk analitik dashboard
- `react-day-picker` — UI pemilih tanggal
- `date-fns` — pemformatan/manipulasi tanggal
- `lucide-react` — set ikon
- `tailwind-merge` + `clsx` — utilitas bantuan class
- `embla-carousel-react` — komponen carousel
- `vaul` — komponen drawer
- `cmdk` — komponen command palette
- `input-otp` — komponen input OTP

### Library Backend
- `passport` + `passport-local` — strategi autentikasi
- `express-session` — middleware sesi
- `drizzle-orm` / `drizzle-kit` — ORM dan peralatan migrasi
- `zod` + `zod-validation-error` — validasi input
- `nanoid` — pembuatan ID unik
- `tsx` — eksekusi TypeScript untuk pengembangan

### Alat Build / Pengembangan
- Vite — pembundel frontend
- esbuild — pembundel server untuk produksi
- `@replit/vite-plugin-runtime-error-modal` — overlay kesalahan saat pengembangan
- `@replit/vite-plugin-cartographer` / `@replit/vite-plugin-dev-banner` — plugin pengembangan khusus Replit
- TypeScript, PostCSS, Autoprefixer, Tailwind CSS
