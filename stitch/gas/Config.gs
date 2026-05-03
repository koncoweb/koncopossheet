var CACHE = CacheService.getScriptCache();

/** Ambil ID spreadsheet dari nilai mentah (ID saja atau URL lengkap Google Sheet). */
function parseSpreadsheetId_(raw) {
  if (!raw) return '';
  var s = String(raw).trim();
  var m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return m[1];
  return s;
}

/**
 * Spreadsheet target: dari file yang dibuka (Extensions → Apps Script dari sheet),
 * atau Script property SPREADSHEET_ID jika project Apps Script standalone + Web App.
 */
function getKoncoSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  var raw = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  var id = parseSpreadsheetId_(raw);
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      throw new Error('SPREADSHEET_ID tidak valid atau akun tidak punya akses ke sheet: ' + e.message);
    }
  }
  throw new Error(
    'Spreadsheet tidak terhubung. Wajib salah satu: (1) Buka file Google Sheet Anda → menu Extensions → Apps Script → tempel semua file .gs di sini (script menempel pada sheet itu). ' +
    '(2) Atau jika project dibuat di script.google.com: ikon gerigi Project Settings → Script properties → tambah property nama persis SPREADSHEET_ID, nilai = ID dari URL (hanya teks di antara /d/ dan /edit), atau paste URL sheet lengkap. Simpan → Deploy ulang Web App.'
  );
}

var SHEETS = {
  users:'Users', sessions:'Sessions',
  produk:'Produk', kategori:'Kategori Produk',
  pelanggan:'Pelanggan', supplier:'Supplier', sales:'Sales',
  kurir:'Kurir', kasir:'Kasir',
  jenisPenjualan:'Jenis Penjualan', metodePembayaran:'Metode Pembayaran',
  kategoriBiaya:'Kategori Biaya',
  transaksi:'Transaksi', transaksiItems:'Transaksi Items',
  pembelian:'Pembelian', mutasi:'Mutasi Stok', biaya:'Biaya',
  laporanPenjualan:'Laporan Penjualan', laporanPembelian:'Laporan Pembelian',
  laporanStok:'Laporan Stok', laporanLabaRugi:'Laporan Laba Rugi',
  laporanArusKas:'Laporan Arus Kas', laporanPiutang:'Laporan Piutang',
  laporanHutang:'Laporan Hutang', laporanOmsetSales:'Laporan Omset Sales',
  laporanInvoicePelanggan:'Laporan Invoice Pelanggan', laporanInvoiceSupplier:'Laporan Invoice Supplier',
  laporanJatuhTempo:'Laporan Jatuh Tempo',
  outlet:'Outlet', settings:'Settings', syncLog:'Sync Log'
};

var SCHEMAS = {
  'Users':['id','namaLengkap','email','password','namaUsaha','jenisUsaha','telp','role','status','createdAt','lastLogin'],
  'Sessions':['token','userId','email','namaUsaha','createdAt','expiresAt'],
  'Produk':['id','userId','nama','kategori','varian','hargaBeli','hargaJual','diskonPct','diskonRp','kode','unit','barcode','keterangan','tipeModal','pantauStok','stokMinimal','stokAwal','stok','totalModal','foto','varians','grosirs','createdAt','updatedAt'],
  'Kategori Produk':['id','userId','nama','createdAt'],
  'Pelanggan':['id','userId','nama','telp','email','alamat','ket','createdAt','updatedAt'],
  'Supplier':['id','userId','nama','telp','email','alamat','ket','createdAt','updatedAt'],
  'Sales':['id','userId','nama','telp','email','alamat','ket','createdAt','updatedAt'],
  'Kurir':['id','userId','nama','telp','email','alamat','ket','createdAt','updatedAt'],
  'Kasir':['id','userId','nama','telp','email','username','password','permissions','createdAt','updatedAt'],
  'Jenis Penjualan':['id','userId','nama','createdAt'],
  'Metode Pembayaran':['id','userId','nama','createdAt'],
  'Kategori Biaya':['id','userId','nama','createdAt'],
  'Transaksi':['id','userId','tanggal','tglJthTempo','pelangganId','pelanggan','noMeja','jenisPenjualan','salesId','sales','items','total','metodePembayaran','catatan','bayar','kembalian','lunas','isDraft','createdAt','updatedAt'],
  'Transaksi Items':['id','userId','transaksiId','produkId','nama','harga','hargaBeli','qty','unit','subtotal','createdAt'],
  'Pembelian':['id','userId','tanggal','supplierId','supplierNama','produkId','produkNama','unit','jumlah','harga','total','status','tglJthTempo','keterangan','createdAt'],
  'Mutasi Stok':['id','userId','tanggal','produkId','produkNama','tipe','jumlah','keterangan','createdAt'],
  'Biaya':['id','userId','tanggal','metode','kategori','nominal','tipe','keterangan','masukLabaRugi','createdAt'],
  'Laporan Penjualan':['userId','tanggal','invoiceId','pelanggan','items','total','metode','status','kasir'],
  'Laporan Pembelian':['userId','tanggal','produk','supplier','jumlah','harga','total','status'],
  'Laporan Stok':['userId','produk','kategori','stokAwal','masuk','keluar','stokAkhir','nilaiStok'],
  'Laporan Laba Rugi':['userId','periode','pendapatan','hpp','labaKotor','biaya','pendapatanLain','labaBersih'],
  'Laporan Arus Kas':['userId','tanggal','keterangan','tipe','nominal','saldo'],
  'Laporan Piutang':['userId','tanggal','invoiceId','pelanggan','total','status','tglJthTempo'],
  'Laporan Hutang':['userId','tanggal','produk','supplier','total','status'],
  'Laporan Omset Sales':['userId','salesId','salesNama','totalTransaksi','totalOmset','totalLaba'],
  'Laporan Invoice Pelanggan':['userId','tanggal','invoiceId','pelanggan','items','total','metode','status','tglJthTempo'],
  'Laporan Invoice Supplier':['userId','tanggal','invoiceId','supplier','produk','jumlah','total','status','tglJthTempo'],
  'Laporan Jatuh Tempo':['userId','tanggal','tipe','invoiceId','pihak','total','tglJthTempo','selisihHari','status'],
  'Outlet':['id','userId','key','value','updatedAt'],
  'Settings':['userId','key','value'],
  'Sync Log':['waktu','userId','aksi','sheet','jumlah','status','pesan']
};

var JSON_FIELDS = {
  produk: { varians:true, grosirs:true },
  kasir: { permissions:true },
  transaksi: { items:true }
};

var NAMED_MASTER_CONFIG = {
  kategori: { prefix:'kat' },
  metodePembayaran: { prefix:'mp' },
  jenisPenjualan: { prefix:'jp' },
  kategoriBiaya: { prefix:'kb' }
};

var ALLOWED_ORIGINS = [
  'https://koncopos.vercel.app',
  'https://koncopos.netlify.app',
  'https://localhost',
  'http://localhost'
];

var RATE_CONFIG = {
  LOGIN_PER_EMAIL:     { max: 5,  windowSec: 900 },
  LOGIN_PER_IP:        { max: 15, windowSec: 900 },
  REGISTER_PER_IP:     { max: 3,  windowSec: 3600 },
  API_PER_TOKEN:       { max: 120,windowSec: 60 },
  API_PER_IP:          { max: 200,windowSec: 60 }
};

var CSRF_WINDOW_SEC = 3600;
