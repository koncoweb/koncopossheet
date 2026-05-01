# KoncoPOS - Dokumentasi Fitur Lengkap

## 📱 Tentang Aplikasi

**KoncoPOS** adalah aplikasi Point of Sale (POS) berbasis web yang dirancang untuk membantu usaha kecil dan menengah dalam mengelola penjualan, inventori, pembelian, biaya, dan laporan keuangan. Aplikasi ini menggunakan teknologi Progressive Web App (PWA) yang dapat diakses secara offline dan tersinkronisasi dengan Google Sheets sebagai database.

### Teknologi
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **Storage:** LocalStorage (offline-first)
- **Backend:** Google Apps Script
- **Database:** Google Sheets
- **Sync:** Auto-sync dengan debouncing
- **PWA:** Service Worker untuk offline support

---

## 🎯 Fitur Utama

### 1. 🛒 POS (Point of Sale)

**Halaman Utama POS**
- ✅ Kategori produk dengan scroll horizontal
- ✅ Toggle view: List / Grid (2-4 kolom responsif)
- ✅ Search produk by nama/kode/barcode
- ✅ Keranjang belanja dengan badge counter
- ✅ Quick add produk ke keranjang
- ✅ Hamburger menu untuk Log Transaksi

**Fitur Produk:**
- Tampilan foto produk
- Nama, harga jual, stok tersedia
- Varian produk (jika ada)
- Filter by kategori
- Grid view: 2 kolom (mobile), 3 kolom (tablet), 4 kolom (desktop)
- List view: horizontal layout dengan foto kiri

**Keranjang Belanja:**
- Daftar item dengan qty, harga, subtotal
- Edit qty per item (+ / -)
- Hapus item dari keranjang
- Total keseluruhan
- Tombol: Simpan Draft, Belum Bayar, Bayar

**Halaman Checkout:**
- Pilih pelanggan (dropdown + tambah baru)
- Input no meja (opsional)
- Pilih jenis penjualan (Reguler, Grosir, Online)
- Pilih sales (opsional)
- Pilih metode pembayaran (Tunai, Transfer, QRIS, Piutang)
- Input tanggal jatuh tempo (untuk Piutang)
- Catatan transaksi
- Diskon per item atau total
- Kalkulasi otomatis: subtotal, diskon, total
- Input bayar dan hitung kembalian
- Tombol: Simpan Draft, Proses Pembayaran

**Struk Digital:**
- Header: Logo, nama outlet, alamat, telp
- Detail transaksi: invoice, tanggal, kasir
- Daftar item: nama, qty, harga, subtotal
- Total, bayar, kembalian
- Footer: terima kasih, catatan
- Tombol: Print, Bagikan, Selesai

**Log Transaksi:**
- Filter tab: Semua, Piutang, Draft
- Search: pelanggan, invoice, catatan
- Date range filter (default: bulan ini)
- Toggle view: List / Grid
- List view: vertical dengan avatar pelanggan
- Grid view: 2 kolom card layout
- Detail per transaksi: invoice, pelanggan, total, status, tanggal
- Aksi: Lihat Detail, Hapus (dengan konfirmasi)
- Info: Stok tidak akan dikembalikan saat hapus

---

### 2. 📦 Produk

**Master Produk:**
- ✅ Daftar semua produk dengan foto
- ✅ Search by nama/kode/barcode
- ✅ Filter by kategori
- ✅ Info: nama, kategori, varian, harga beli, harga jual, stok
- ✅ Aksi: Edit, Hapus

**Tambah/Edit Produk:**
- Upload foto produk
- Nama produk (wajib)
- Kategori (dropdown + tambah baru)
- Varian (opsional)
- Harga beli
- Harga jual (wajib)
- Diskon (% atau Rp)
- Kode produk
- Unit (Pcs, Box, Kg, dll)
- Barcode
- Keterangan
- Tipe modal: FIFO / Average
- Pantau stok: Ya/Tidak
- Stok minimal (alert)
- Stok awal
- Auto-calculate: total modal, stok tersedia

**Kategori Produk:**
- Daftar kategori dengan icon
- Tambah kategori baru
- Edit kategori
- Hapus kategori
- Sync dengan Google Sheets

---

### 3. 🛍️ Pembelian

**Daftar Pembelian:**
- List semua pembelian dengan supplier
- Info: tanggal, supplier, produk, jumlah, harga, total, status
- Status: Lunas / Hutang
- Filter by tanggal
- Search by supplier/produk
- Aksi: Bayar Hutang, Hapus

**Tambah Pembelian:**
- Pilih supplier (dropdown + tambah baru)
- Pilih produk (dropdown)
- Input jumlah dan harga beli
- Total otomatis
- Status: Lunas / Hutang
- Tanggal jatuh tempo (untuk Hutang)
- Keterangan
- Auto-update stok produk saat simpan

**Bayar Hutang Supplier:**
- Pilih pembelian yang masih hutang
- Input jumlah bayar
- Update status jadi Lunas
- Catat di laporan arus kas

---

### 4. 💰 Biaya / Pendapatan Lain-lain

**Halaman Biaya:**
- ✅ Date range filter (default: 30 hari terakhir)
- ✅ Search bar (toggle) untuk cari kategori/keterangan
- ✅ Summary cards: TOTAL BIAYA (merah) dan TOTAL PENDAPATAN (hijau)
- ✅ List biaya dengan icon, kategori, tanggal, keterangan, nominal
- ✅ Warna berbeda untuk Biaya (merah) dan Pendapatan (hijau)
- ✅ Aksi: Hapus per item
- ✅ FAB button untuk tambah

**Tambah Biaya:**
- ✅ Radio button: Biaya / Pendapatan Lain-lain
- ✅ Metode Pembayaran (dropdown + tambah baru)
- ✅ Kategori (dropdown + tambah baru)
- ✅ Tanggal
- ✅ Nominal (wajib)
- ✅ Keterangan
- ✅ Toggle "Masuk Laba Rugi"
- ✅ Validasi: metode, kategori, nominal wajib

**Kategori Biaya:**
- Default: Operasional, Gaji, Listrik/Air, Sewa, Lainnya
- Tambah kategori custom
- Edit kategori
- Hapus kategori

---

### 5. 📊 Laporan

**Laporan Penjualan:**
- Date range filter
- Daftar transaksi: invoice, pelanggan, items, total, metode, status
- Total penjualan periode
- Export PDF & Excel
- Filter by status: Lunas / Piutang

**Laporan Produk Terjual:**
- Date range filter
- Produk terlaris: nama, qty terjual, total omset, profit
- Ranking produk
- Export PDF & Excel

**Laporan Pembelian:**
- Date range filter
- Daftar pembelian: tanggal, supplier, produk, jumlah, total, status
- Total pembelian periode
- Export PDF & Excel

**Laporan Mutasi Stok:**
- Date range filter
- Riwayat perubahan stok: produk, tipe (masuk/keluar), jumlah, keterangan
- Tracking stok real-time
- Export PDF & Excel

**Laporan Laba Rugi:**
- Date range filter
- Pendapatan penjualan
- HPP (Harga Pokok Penjualan)
- Laba Kotor
- Biaya operasional
- Pendapatan lain
- Laba Bersih
- Export PDF & Excel

**Laporan Arus Kas:**
- Date range filter
- Transaksi masuk (penjualan, pendapatan lain)
- Transaksi keluar (pembelian, biaya)
- Saldo running
- Net cash flow
- Export PDF & Excel

**Laporan Biaya:**
- Date range filter
- Biaya by kategori
- Total biaya periode
- Export PDF & Excel

**Laporan Piutang:**
- Daftar piutang pelanggan
- Invoice, pelanggan, total, status, jatuh tempo
- Total piutang outstanding
- Export PDF & Excel

**Laporan Hutang Supplier:**
- Daftar hutang ke supplier
- Supplier, produk, total, status
- Total hutang outstanding
- Export PDF & Excel

**Laporan Persediaan:**
- Stok semua produk
- Produk, kategori, stok awal, masuk, keluar, stok akhir
- Nilai stok (qty × harga beli)
- Export PDF & Excel

**Laporan Omset Sales:**
- Performa sales team
- Sales, total transaksi, total omset, total laba
- Ranking sales
- Export PDF & Excel

**Laporan Invoice Pelanggan:**
- Semua invoice pelanggan
- Invoice, pelanggan, items, total, metode, status, jatuh tempo
- Export PDF & Excel

**Laporan Invoice Supplier:**
- Semua invoice supplier
- Invoice, supplier, produk, jumlah, total, status, jatuh tempo
- Export PDF & Excel

**Laporan Jatuh Tempo:**
- Piutang & Hutang yang akan/sudah jatuh tempo
- Status: Normal (>7 hari), Segera (≤7 hari), Terlambat (<0 hari)
- Alert untuk jatuh tempo
- Export PDF & Excel

---

### 6. ⚙️ Pengaturan

**Outlet:**
- Nama outlet
- Alamat
- Telepon
- Email
- Catatan (footer struk)
- Sync dengan Google Sheets

**Akun:**
- Nama lengkap
- Username
- Email
- Telepon
- Ganti password

**Master Data:**

**Pelanggan:**
- Daftar pelanggan dengan avatar
- Info: nama, telp, email, alamat, keterangan
- Search pelanggan
- Tambah, Edit, Hapus
- Sync dengan Google Sheets

**Supplier:**
- Daftar supplier dengan icon
- Info: nama, telp, email, alamat, keterangan
- Search supplier
- Tambah, Edit, Hapus
- Sync dengan Google Sheets

**Sales:**
- Daftar sales team dengan avatar
- Info: nama, telp, email, alamat, keterangan
- Search sales
- Tambah, Edit, Hapus
- Sync dengan Google Sheets

**Kurir:**
- Daftar kurir dengan icon
- Info: nama, telp, email, alamat, keterangan
- Search kurir
- Tambah, Edit, Hapus
- Sync dengan Google Sheets

**Kasir:**
- ✅ Daftar kasir dengan permissions
- ✅ Info: nama, telp, email, username
- ✅ 14 Permissions:
  1. Boleh ubah POS
  2. Boleh mengubah harga jual
  3. Boleh mengubah diskon
  4. Print Draft
  5. Mengelola Master
  6. Boleh Ubah Tanggal
  7. Tampil Biaya & Pendapatan
  8. Boleh Ubah Biaya & Pendapatan
  9. Tampil Pembelian
  10. Tampil Print Pembelian
  11. Tampil Laporan
  12. Tampil Riwayat POS
  13. Tampil Rekapan
  14. Tambah Produk Manual
- ✅ Tambah kasir dengan form lengkap
- ✅ Edit, Hapus kasir
- ✅ Sync dengan Google Sheets

**Jenis Penjualan:**
- Default: Reguler, Grosir, Online
- Tambah jenis custom
- Edit, Hapus
- Sync dengan Google Sheets

**Metode Pembayaran:**
- Default: Tunai, Transfer, QRIS, Piutang
- Tambah metode custom
- Edit, Hapus
- Sync dengan Google Sheets

**Kategori Biaya:**
- Default: Operasional, Gaji, Listrik/Air, Sewa, Lainnya
- Tambah kategori custom
- Edit, Hapus
- Sync dengan Google Sheets

**Printer:**
- Konfigurasi printer thermal
- Ukuran kertas: 58mm, 80mm
- Test print
- Auto-print setelah checkout

**Sync Data:**
- Manual sync: Push All / Pull All
- Auto-sync status indicator
- Last sync time
- Sync log

**Hapus Data:**
- Hapus semua data lokal
- Konfirmasi ganda
- Reset aplikasi

---

### 7. 🔐 Autentikasi

**Register:**
- Nama lengkap
- Email (unique)
- Password (min 6 karakter)
- Nama usaha
- Jenis usaha
- Telepon
- Auto-create default data (kategori, metode, outlet)
- Auto-login setelah register

**Login:**
- Email
- Password
- Remember me
- Session token (30 hari)
- Redirect ke Beranda

**Logout:**
- Clear session
- Redirect ke Login

---

### 8. 🏠 Beranda

**Dashboard:**
- Ringkasan hari ini:
  - Total penjualan
  - Total transaksi
  - Total laba
  - Produk terjual
- Chart penjualan 7 hari terakhir
- Produk stok menipis (alert)
- Transaksi terbaru
- Quick actions: Tambah Transaksi, Tambah Produk, Lihat Laporan

---

## 🔄 Sinkronisasi Data

### Auto-Sync
- Debounced sync (1.5 detik setelah perubahan)
- Background sync tanpa blocking UI
- Retry otomatis jika gagal
- Sync indicator di UI

### Manual Sync
- **Push All:** Upload semua data lokal ke Google Sheets
- **Pull All:** Download semua data dari Google Sheets
- Konfirmasi sebelum overwrite

### Sync Entities (31 Total)
1. Users
2. Sessions
3. Produk
4. Kategori Produk
5. Pelanggan
6. Supplier
7. Sales
8. Kurir
9. Kasir
10. Jenis Penjualan
11. Metode Pembayaran
12. Kategori Biaya
13. Transaksi
14. Transaksi Items
15. Pembelian
16. Mutasi Stok
17. Biaya
18. Laporan Penjualan
19. Laporan Pembelian
20. Laporan Stok
21. Laporan Laba Rugi
22. Laporan Arus Kas
23. Laporan Piutang
24. Laporan Hutang
25. Laporan Omset Sales
26. Laporan Invoice Pelanggan
27. Laporan Invoice Supplier
28. Laporan Jatuh Tempo
29. Outlet
30. Settings
31. Sync Log

### Laporan Auto-Generate
Laporan otomatis di-generate di Google Sheets setelah:
- Transaksi baru
- Pembelian baru
- Mutasi stok
- Biaya/Pendapatan baru
- Perubahan produk

---

## 📱 Progressive Web App (PWA)

### Offline Support
- Service Worker untuk caching
- Bekerja tanpa internet
- Data tersimpan di LocalStorage
- Auto-sync saat online kembali

### Install ke Home Screen
- Android: "Add to Home Screen"
- iOS: "Add to Home Screen"
- Desktop: Install via browser

### Manifest
- App name: KoncoPOS
- Icons: 192x192, 512x512
- Theme color: Primary color
- Display: standalone
- Orientation: portrait

---

## 🎨 User Interface

### Design System
- **Colors:**
  - Primary: #e8637a (pink/red)
  - Success: #16a34a (green)
  - Danger: #dc2626 (red)
  - Warning: #f59e0b (orange)
  - Text Dark: #1f2937
  - Text Light: #6b7280
  - Background: #f9fafb

- **Typography:**
  - Font: System fonts (San Francisco, Segoe UI, Roboto)
  - Sizes: 12px - 24px
  - Weights: 400, 500, 600, 700

- **Components:**
  - Buttons: Rounded, shadow, hover effects
  - Cards: White background, border-radius 8-12px
  - Inputs: Border, focus state, validation
  - Modals: Overlay, slide-up animation
  - Toast: Bottom notification, auto-hide

### Responsive Design
- Mobile-first approach
- Breakpoints:
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px
- Grid system: Flexbox & CSS Grid
- Touch-friendly: 44px minimum tap target

### Navigation
- Bottom navigation (5 tabs):
  1. POS
  2. Biaya
  3. Beranda
  4. Laporan
  5. Pengaturan
- Top bar: Title, back button, actions
- FAB button: Primary action per screen
- Hamburger menu: Additional options

---

## 🔧 Fitur Teknis

### LocalStorage Structure
```javascript
{
  // Auth
  auth: { token, user },
  
  // Master Data
  produk: [...],
  kategori: [...],
  pelanggan: [...],
  supplier: [...],
  sales: [...],
  kurir: [...],
  kasir: [...],
  jenisPenjualan: [...],
  metodePembayaran: [...],
  kategoriBiaya: [...],
  
  // Transactions
  transaksi: [...],
  pembelian: [...],
  mutasi: [...],
  biaya: [...],
  
  // Settings
  outlet: {...},
  printer: {...},
  lastSync: {...}
}
```

### Google Sheets Structure
- 28 sheets total
- Header row dengan field names
- Color-coded:
  - Auth sheets: Dark blue (#1a1a2e)
  - Laporan sheets: Dark gray (#2c3e50)
  - Data sheets: Pink (#e8637a)

### API Endpoints (Google Apps Script)
```javascript
// GET
?action=ping
?action=setup
?action=read&sheet=produk
?action=readOne&sheet=produk&id=xxx
?action=pullAll
?action=readLaporan&sheet=laporanPenjualan
?action=profile

// POST
{action: 'register', ...}
{action: 'login', ...}
{action: 'logout'}
{action: 'create', sheet, data}
{action: 'update', sheet, id, data}
{action: 'delete', sheet, id}
{action: 'upsert', sheet, data}
{action: 'bulkSync', sheet, rows}
{action: 'pushAll', data}
{action: 'generateLaporan'}
{action: 'updateProfile', data}
```

### Security
- Token-based authentication
- Session expiry (30 hari)
- Password hashing (XOR + Base64)
- User isolation (userId filter)
- Input validation
- SQL injection prevention (N/A - no SQL)

### Performance
- Lazy loading screens
- Debounced search
- Pagination (future)
- Image optimization
- Minified assets (future)
- Service Worker caching

---

## 📊 Laporan & Export

### Export Format

**PDF:**
- Header: Logo, judul laporan, periode
- Table: Data dengan styling
- Summary: Total, subtotal, grand total
- Footer: Tanggal export, branding
- Library: jsPDF + autoTable

**Excel:**
- Header row dengan bold
- Data rows
- Auto-width columns
- Summary row dengan formula
- Library: SheetJS (xlsx)

### Laporan yang Bisa di-Export
1. ✅ Laporan Penjualan
2. ✅ Laporan Produk Terjual
3. ✅ Laporan Pembelian
4. ✅ Laporan Laba Rugi
5. ✅ Laporan Arus Kas
6. ✅ Laporan Biaya
7. ✅ Laporan Piutang
8. ✅ Laporan Hutang Supplier
9. ✅ Laporan Persediaan

---

## 🚀 Deployment

### Frontend
- **Platform:** Vercel / Netlify / GitHub Pages
- **URL:** Custom domain atau subdomain
- **SSL:** Auto HTTPS
- **CDN:** Global edge network

### Backend (Google Apps Script)
- **Deploy:** Web App
- **Execute as:** Me (owner)
- **Access:** Anyone
- **URL:** https://script.google.com/macros/s/.../exec

### Database (Google Sheets)
- **Spreadsheet:** KoncoPOS Database
- **Sheets:** 28 sheets
- **Permissions:** Owner only
- **Backup:** Auto-save, version history

---

## 📝 Changelog

### Version 3.0 (2026-04-14)
- ✅ Redesign halaman Biaya dengan date filter & summary cards
- ✅ Simplifikasi Kasir permissions dari 26 ke 14
- ✅ Fix kasir form: hapus modal lama, gunakan halaman baru
- ✅ Implementasi 9 PDF export functions
- ✅ Fix laporan date range default (30 hari)
- ✅ Implementasi Draft Transaction feature
- ✅ Fix kategori produk bug ([object Object])
- ✅ Complete system audit (666 lines Code.gs)
- ✅ Implementasi Log Transaksi dengan filter & toggle view
- ✅ POS product grid view toggle (2-4 kolom)
- ✅ Update semua laporan dengan date filter & export

### Version 2.0 (Previous)
- Multi-user support
- Google Sheets integration
- Auto-sync functionality
- PWA support
- Responsive design

### Version 1.0 (Initial)
- Basic POS functionality
- Product management
- Transaction recording
- Simple reports

---

## 🎯 Roadmap (Future Features)

### Short Term
- [ ] Edit transaksi
- [ ] Edit biaya
- [ ] Batch delete
- [ ] Advanced search & filter
- [ ] Notification system

### Medium Term
- [ ] Multi-outlet support
- [ ] Inventory forecasting
- [ ] Customer loyalty program
- [ ] Promo & discount engine
- [ ] WhatsApp integration

### Long Term
- [ ] Mobile app (React Native)
- [ ] Payment gateway integration
- [ ] Accounting integration
- [ ] AI-powered insights
- [ ] Multi-language support

---

## 📞 Support

### Documentation
- README.md - Getting started
- FITUR_LENGKAP.md - Complete features (this file)
- AUDIT_REPORT.md - System audit
- BIAYA_REDESIGN.md - Biaya feature docs
- KASIR_PERMISSIONS_UPDATE.md - Kasir feature docs

### Repository
- **GitHub:** https://github.com/morgandigital36/koncopos.git
- **Branch:** main
- **License:** MIT (or your license)

### Contact
- **Developer:** [Your Name]
- **Email:** [Your Email]
- **Website:** [Your Website]

---

## 🏆 Credits

**Built with:**
- Vanilla JavaScript
- Google Apps Script
- Google Sheets
- Font Awesome Icons
- jsPDF & autoTable
- SheetJS (xlsx)

**Inspired by:**
- Modern POS systems
- Small business needs
- Indonesian market requirements

---

**Last Updated:** 2026-04-14  
**Version:** 3.0  
**Status:** Production Ready ✅
