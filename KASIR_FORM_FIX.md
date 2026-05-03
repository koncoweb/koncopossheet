# Kasir Form Fix - Modal Lama Dihapus

## Status: ✅ FIXED

## Masalah

User melaporkan bahwa tampilan form kasir masih menampilkan:
1. Modal lama dengan hanya 2 pilihan akses (Kasir dan Admin)
2. Bukan halaman baru dengan 14 permissions yang sudah dibuat

## Root Cause

Ada 2 sistem form kasir yang berjalan bersamaan:
1. **Modal lama** di `kasir.html` - masih aktif dan dipanggil oleh tombol FAB
2. **Halaman baru** di `tambah-kasir.html` - sudah dibuat tapi tidak terpanggil

Tombol FAB di halaman kasir memanggil `openFormKontak('kasir')` yang membuka modal lama, bukan halaman baru.

## Solusi

### 1. Update Tombol FAB di `kasir.html`

**Sebelum:**
```html
<button class="crud-fab" onclick="openFormKontak('kasir')">
  <i class="fa-solid fa-plus"></i>
</button>
```

**Sesudah:**
```html
<button class="crud-fab" onclick="switchScreen('tambah-kasir')">
  <i class="fa-solid fa-plus"></i>
</button>
```

### 2. Hapus Modal Lama dari `kasir.html`

Menghapus seluruh blok modal lama (39 baris):
```html
<div id="modal-kontak-kasir" class="modal-overlay" style="display:none;">
  <!-- ... modal lama dengan 2 pilihan akses ... -->
</div>
```

## Verifikasi

### File yang Sudah Benar

1. ✅ `stitch/pages/tambah-kasir.html` - Halaman baru dengan 14 permissions
2. ✅ `stitch/js/pengaturan.js` - Fungsi `simpanKasirBaru()` sudah update
3. ✅ `stitch/js/core.js` - Screen `tambah-kasir` sudah terdaftar
4. ✅ `stitch/style.css` - CSS untuk kasir form sudah ada

### File yang Diperbaiki

1. ✅ `stitch/pages/kasir.html` - Tombol FAB sekarang memanggil halaman baru

## Hasil

Sekarang ketika user klik tombol + di halaman Kasir:
1. ✅ Akan membuka halaman `tambah-kasir` (bukan modal)
2. ✅ Menampilkan 14 permissions dengan toggle switches
3. ✅ Form lengkap: Nama, Telp, Email, Username, Password, Konfirmasi Password
4. ✅ Fungsi simpan menggunakan `simpanKasirBaru()` yang sudah update

## Testing

Untuk memverifikasi fix:
1. Buka aplikasi dan refresh browser (Ctrl+F5)
2. Masuk ke menu Pengaturan → Kasir
3. Klik tombol + (FAB)
4. Harus muncul halaman baru (bukan modal) dengan 14 permissions
5. Isi form dan simpan
6. Kasir baru harus tersimpan dengan permissions yang dipilih

## Commit

- **Commit:** e9b1516
- **Message:** "Fix kasir form: remove old modal and use new tambah-kasir page with 14 permissions"
- **Files Changed:** `stitch/pages/kasir.html` (1 insertion, 39 deletions)

---

**Date:** 2026-04-14  
**Issue:** Modal lama masih muncul dengan 2 pilihan akses  
**Solution:** Hapus modal lama, redirect ke halaman baru dengan 14 permissions
