// ===================================================
// PEMBELIAN & MUTASI STOK
// ===================================================

// ===== PEMBELIAN =====
function renderPembelianList() {
  const list = DB.get('pembelian').sort((a, b) => b.createdAt - a.createdAt);
  const area = document.getElementById('pembelian-list-area');
  if (!area) return;
  if (list.length === 0) {
    area.innerHTML = emptyState('fa-cart-arrow-down', 'Belum ada pembelian', 'Satu item: + · Banyak item: ikon daftar');
    return;
  }
  area.innerHTML = list.map(b => `
    <div class="mp-item">
      <div class="mp-item-photo" style="background:#e8f0fe;">
        <i class="fa-solid fa-cart-arrow-down" style="color:#4a90e2;font-size:18px;"></i>
      </div>
      <div class="mp-item-info">
        <div class="mp-item-nama">${b.produkNama || '-'}</div>
        <div class="mp-item-sub">${b.tanggal} · ${b.jumlah} ${b.unit || 'Pcs'} · ${b.status === 'lunas' ? 'Lunas' : 'Hutang'}</div>
        <div class="mp-item-harga">${fmt(b.total)}</div>
      </div>
      <button class="mp-btn-del" onclick="hapusPembelian('${b.id}')">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>`).join('');
}

function hapusPembelian(id) {
  if (!confirm('Hapus data pembelian ini?')) return;
  DB.set('pembelian', DB.get('pembelian').filter(b => b.id !== id));
  autoSync('pembelian', 'delete', null, id);
  renderPembelianList();
  showToast('Data dihapus');
}

function initTambahPembelian() {
  const today = new Date().toISOString().split('T')[0];
  setVal('beli-tanggal', today);
  setVal('beli-jumlah', 1);
  setVal('beli-harga', 0);
  setVal('beli-total', 0);
  setVal('beli-keterangan', '');
  setVal('beli-jth-tempo', '');
  document.getElementById('beli-jth-tempo-group').style.display = 'none';
  // Populate produk select
  const sel = document.getElementById('beli-produk');
  if (sel) {
    const products = getProducts();
    sel.innerHTML = '<option value="">Pilih Produk</option>' +
      products.map(p => `<option value="${p.id}" data-harga="${p.hargaBeli}" data-unit="${p.unit || 'Pcs'}">${p.nama}</option>`).join('');
  }
  // Populate supplier select
  const supSel = document.getElementById('beli-supplier');
  if (supSel) {
    const suppliers = DB.get('supplier');
    supSel.innerHTML = '<option value="">Pilih Supplier</option>' +
      suppliers.map(s => `<option value="${s.id}">${s.nama}</option>`).join('');
  }
}

function toggleJatuhTempoBeli() {
  const status = document.getElementById('beli-status')?.value;
  const group = document.getElementById('beli-jth-tempo-group');
  if (group) group.style.display = status === 'hutang' ? '' : 'none';
}

function toggleJatuhTempoBeliMassal() {
  const status = document.getElementById('beli-m-status')?.value;
  const group = document.getElementById('beli-m-jth-tempo-group');
  if (group) group.style.display = status === 'hutang' ? '' : 'none';
}

function _beliMassalEsc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function beliMassalBuildProdukOptions() {
  const products = getProducts();
  return (
    '<option value="">Pilih Produk</option>' +
    products
      .map(
        p =>
          `<option value="${_beliMassalEsc(p.id)}" data-unit="${_beliMassalEsc(p.unit || 'Pcs')}" data-harga="${Number(p.hargaBeli) || 0}">${_beliMassalEsc(p.nama)}</option>`
      )
      .join('')
  );
}

function beliMassalRowHtml() {
  return `
    <div class="beli-massal-row">
      <button type="button" class="beli-massal-row-del" onclick="beliMassalHapusBaris(this)" aria-label="Hapus baris">
        <i class="fa-solid fa-trash"></i>
      </button>
      <div class="tp-field-group" style="margin-bottom:10px;">
        <label class="tp-label">Produk</label>
        <div class="tp-select-wrap tp-select-full">
          <select class="tp-select beli-m-produk" onchange="beliMassalProdukChange(this)">${beliMassalBuildProdukOptions()}</select>
          <i class="fa-solid fa-chevron-down tp-select-arrow"></i>
        </div>
      </div>
      <div class="tp-two-col">
        <div class="tp-field-group">
          <label class="tp-label">Jumlah</label>
          <input type="number" class="tp-input beli-m-qty" value="1" min="1" step="any" oninput="beliMassalRefreshRangkuman()" />
        </div>
        <div class="tp-field-group">
          <label class="tp-label">Harga / unit</label>
          <input type="number" class="tp-input beli-m-harga" value="0" min="0" step="any" oninput="beliMassalRefreshRangkuman()" />
        </div>
      </div>
    </div>`;
}

function beliMassalTambahBaris() {
  const wrap = document.getElementById('beli-massal-lines');
  if (!wrap) return;
  wrap.insertAdjacentHTML('beforeend', beliMassalRowHtml());
  beliMassalRefreshRangkuman();
}

function beliMassalHapusBaris(btn) {
  const wrap = document.getElementById('beli-massal-lines');
  if (!wrap) return;
  const rows = wrap.querySelectorAll('.beli-massal-row');
  if (rows.length <= 1) {
    showToast('Minimal satu baris.');
    return;
  }
  const row = btn.closest('.beli-massal-row');
  if (row) row.remove();
  beliMassalRefreshRangkuman();
}

function beliMassalProdukChange(sel) {
  const opt = sel.options[sel.selectedIndex];
  const row = sel.closest('.beli-massal-row');
  if (!row) return;
  const hIn = row.querySelector('.beli-m-harga');
  if (hIn && opt) hIn.value = opt.dataset.harga || 0;
  beliMassalRefreshRangkuman();
}

function beliMassalRefreshRangkuman() {
  const el = document.getElementById('beli-massal-grand-val');
  if (!el) return;
  let sum = 0;
  document.querySelectorAll('#beli-massal-lines .beli-massal-row').forEach(row => {
    const sel = row.querySelector('.beli-m-produk');
    const pid = sel && sel.value;
    if (!pid) return;
    const qty = parseFloat(row.querySelector('.beli-m-qty')?.value) || 0;
    const harga = parseFloat(row.querySelector('.beli-m-harga')?.value) || 0;
    sum += qty * harga;
  });
  el.textContent = typeof fmt === 'function' ? fmt(sum) : String(sum);
}

function collectBeliMassalLinesParsed() {
  const lines = [];
  const rows = document.querySelectorAll('#beli-massal-lines .beli-massal-row');
  for (let idx = 0; idx < rows.length; idx++) {
    const row = rows[idx];
    const sel = row.querySelector('.beli-m-produk');
    const produkId = sel && sel.value;
    const qty = parseFloat(row.querySelector('.beli-m-qty')?.value) || 0;
    const harga = parseFloat(row.querySelector('.beli-m-harga')?.value) || 0;
    if (!produkId && qty <= 0 && harga <= 0) continue;
    if (!produkId) return { error: 'Baris ' + (idx + 1) + ': pilih produk.', lines: null };
    if (qty <= 0) return { error: 'Baris ' + (idx + 1) + ': jumlah harus lebih dari 0.', lines: null };
    if (harga < 0) return { error: 'Baris ' + (idx + 1) + ': harga tidak valid.', lines: null };
    const opt = sel.options[sel.selectedIndex];
    lines.push({
      produkId,
      produkNama: (opt && opt.text) ? opt.text.trim() : '',
      unit: (opt && opt.dataset && opt.dataset.unit) || 'Pcs',
      jumlah: qty,
      harga,
    });
  }
  return { error: null, lines };
}

function applyPembelianBulkLines(lines, header) {
  const products = getProducts();
  const pembelianList = DB.get('pembelian');
  const base = Date.now();
  const stokDelta = {};
  const newBeli = [];

  lines.forEach((line, i) => {
    const id = 'beli_' + base + '_' + i;
    const beli = {
      id,
      tanggal: header.tanggal,
      supplierId: header.supplierId,
      supplierNama: header.supplierNama,
      produkId: line.produkId,
      produkNama: line.produkNama,
      unit: line.unit || 'Pcs',
      jumlah: line.jumlah,
      harga: line.harga,
      total: line.jumlah * line.harga,
      status: header.status,
      tglJthTempo: header.tglJthTempo,
      keterangan: header.keterangan,
      createdAt: base + i,
    };
    newBeli.push(beli);
    pembelianList.push(beli);
    stokDelta[line.produkId] = (stokDelta[line.produkId] || 0) + line.jumlah;
  });

  Object.keys(stokDelta).forEach(function (pid) {
    const p = products.find(x => x.id === pid);
    if (p) p.stok = (p.stok ?? p.stokAwal ?? 0) + stokDelta[pid];
  });

  DB.set('pembelian', pembelianList);
  saveProducts(products);

  newBeli.forEach(function (b) {
    autoSync('pembelian', 'create', b);
  });
  Object.keys(stokDelta).forEach(function (pid) {
    const p = products.find(x => x.id === pid);
    if (p) autoSync('produk', 'update', p, pid);
  });
}

function initTambahPembelianMassal() {
  const today = new Date().toISOString().split('T')[0];
  setVal('beli-m-tanggal', today);
  setVal('beli-m-keterangan', '');
  setVal('beli-m-jth-tempo', '');
  const st = document.getElementById('beli-m-status');
  if (st) st.value = 'lunas';
  toggleJatuhTempoBeliMassal();
  const supSel = document.getElementById('beli-m-supplier');
  if (supSel) {
    supSel.innerHTML =
      '<option value="">Pilih Supplier</option>' +
      DB.get('supplier')
        .map(s => `<option value="${_beliMassalEsc(s.id)}">${_beliMassalEsc(s.nama)}</option>`)
        .join('');
  }
  const wrap = document.getElementById('beli-massal-lines');
  if (wrap) {
    wrap.innerHTML = '';
    beliMassalTambahBaris();
    beliMassalTambahBaris();
  }
  beliMassalRefreshRangkuman();
}

function simpanPembelianMassal() {
  const { error, lines } = collectBeliMassalLinesParsed();
  if (error) {
    showToast(error);
    return;
  }
  if (!lines || lines.length === 0) {
    showToast('Tambah minimal satu baris dengan produk dan jumlah.');
    return;
  }
  if (lines.length > 200) {
    showToast('Maksimal 200 baris per penyimpanan. Bagi menjadi beberapa simpanan.');
    return;
  }

  const tanggal = document.getElementById('beli-m-tanggal')?.value || new Date().toISOString().split('T')[0];
  const supplierSel = document.getElementById('beli-m-supplier');
  const supplierId = supplierSel?.value || '';
  const supplierNama = supplierId ? supplierSel.options[supplierSel.selectedIndex]?.text?.trim() || '' : '';
  const status = document.getElementById('beli-m-status')?.value || 'lunas';
  const tglJthTempo = document.getElementById('beli-m-jth-tempo')?.value || '';
  let keterangan = document.getElementById('beli-m-keterangan')?.value.trim() || '';
  if (lines.length > 1 && keterangan && !keterangan.includes('massal')) {
    keterangan += ' (massal ' + lines.length + ' item)';
  } else if (lines.length > 1 && !keterangan) {
    keterangan = 'Pembelian massal ' + lines.length + ' item';
  }

  const header = {
    tanggal,
    supplierId,
    supplierNama,
    status,
    tglJthTempo,
    keterangan,
  };

  try {
    applyPembelianBulkLines(lines, header);
  } catch (e) {
    console.error(e);
    showToast('Gagal menyimpan: ' + (e.message || 'error'));
    return;
  }

  showToast(lines.length + ' pembelian disimpan.');
  switchScreen('pembelian');
}

function updateHargaBeli() {
  const sel = document.getElementById('beli-produk');
  const opt = sel?.options[sel.selectedIndex];
  if (opt) {
    setVal('beli-harga', opt.dataset.harga || 0);
    hitungTotalBeli();
  }
}

function hitungTotalBeli() {
  const jumlah = parseFloat(document.getElementById('beli-jumlah')?.value) || 0;
  const harga = parseFloat(document.getElementById('beli-harga')?.value) || 0;
  setVal('beli-total', jumlah * harga);
}

function simpanPembelian() {
  const produkSel = document.getElementById('beli-produk');
  const produkId = produkSel?.value;
  if (!produkId) { showToast('Pilih produk terlebih dahulu'); return; }
  const jumlah = parseFloat(document.getElementById('beli-jumlah')?.value) || 0;
  if (jumlah <= 0) { showToast('Jumlah harus lebih dari 0'); return; }
  const harga = parseFloat(document.getElementById('beli-harga')?.value) || 0;
  const opt = produkSel.options[produkSel.selectedIndex];
  
  // Ambil supplier nama
  const supplierSel = document.getElementById('beli-supplier');
  const supplierId = supplierSel?.value || '';
  const supplierNama = supplierId ? (supplierSel.options[supplierSel.selectedIndex]?.text || '') : '';
  
  const beli = {
    id: 'beli_' + Date.now(),
    tanggal: document.getElementById('beli-tanggal')?.value || new Date().toISOString().split('T')[0],
    supplierId,
    supplierNama,
    produkId,
    produkNama: opt?.text || '',
    unit: opt?.dataset.unit || 'Pcs',
    jumlah,
    harga,
    total: jumlah * harga,
    status: document.getElementById('beli-status')?.value || 'lunas',
    tglJthTempo: document.getElementById('beli-jth-tempo')?.value || '',
    keterangan: document.getElementById('beli-keterangan')?.value.trim() || '',
    createdAt: Date.now(),
  };
  // Update stok produk
  const products = getProducts();
  const p = products.find(x => x.id === produkId);
  if (p) {
    p.stok = (p.stok ?? p.stokAwal ?? 0) + jumlah;
    saveProducts(products);
  }
  const list = DB.get('pembelian');
  list.push(beli);
  DB.set('pembelian', list);
  autoSync('pembelian', 'create', beli);
  // Sync stok produk yang berubah
  if (p) autoSync('produk', 'update', p, p.id);
  showToast('Pembelian disimpan!');
  switchScreen('pembelian');
}

// ===== MUTASI STOK =====
function renderMutasiList() {
  const list = DB.get('mutasi').sort((a, b) => b.createdAt - a.createdAt);
  const area = document.getElementById('mutasi-list-area');
  if (!area) return;
  if (list.length === 0) {
    area.innerHTML = emptyState('fa-boxes-stacked', 'Belum ada mutasi stok', 'Tap + untuk tambah mutasi');
    return;
  }
  const tipeColor = { masuk: '#2ecc71', keluar: 'var(--danger)', koreksi: '#f39c12' };
  const tipeIcon = { masuk: 'fa-arrow-trend-up', keluar: 'fa-arrow-trend-down', koreksi: 'fa-rotate' };
  const tipeLabel = { masuk: 'Masuk', keluar: 'Keluar', koreksi: 'Koreksi' };
  area.innerHTML = list.map(m => `
    <div class="mp-item">
      <div class="mp-item-photo" style="background:#f5f5f5;">
        <i class="fa-solid ${tipeIcon[m.tipe] || 'fa-boxes-stacked'}"
           style="color:${tipeColor[m.tipe] || '#999'};font-size:18px;"></i>
      </div>
      <div class="mp-item-info">
        <div class="mp-item-nama">${m.produkNama || '-'}</div>
        <div class="mp-item-sub">${m.tanggal} · ${tipeLabel[m.tipe] || m.tipe}</div>
        <div class="mp-item-harga" style="color:${tipeColor[m.tipe] || '#999'};">
          ${m.tipe === 'masuk' ? '+' : m.tipe === 'keluar' ? '-' : ''}${m.jumlah}
        </div>
      </div>
      <button class="mp-btn-del" onclick="hapusMutasi('${m.id}')">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>`).join('');
}

function hapusMutasi(id) {
  if (!confirm('Hapus data mutasi ini?')) return;
  DB.set('mutasi', DB.get('mutasi').filter(m => m.id !== id));
  autoSync('mutasi', 'delete', null, id);
  renderMutasiList();
  showToast('Data dihapus');
}

function initTambahMutasi() {
  const today = new Date().toISOString().split('T')[0];
  setVal('mutasi-tanggal', today);
  setVal('mutasi-jumlah', 0);
  setVal('mutasi-keterangan', '');
  const sel = document.getElementById('mutasi-produk');
  if (sel) {
    const products = getProducts();
    sel.innerHTML = '<option value="">Pilih Produk</option>' +
      products.map(p => `<option value="${p.id}">${p.nama} (Stok: ${p.stok ?? p.stokAwal ?? 0})</option>`).join('');
  }
}

function simpanMutasi() {
  const produkSel = document.getElementById('mutasi-produk');
  const produkId = produkSel?.value;
  if (!produkId) { showToast('Pilih produk terlebih dahulu'); return; }
  const jumlah = parseFloat(document.getElementById('mutasi-jumlah')?.value) || 0;
  if (jumlah <= 0) { showToast('Jumlah harus lebih dari 0'); return; }
  const tipe = document.getElementById('mutasi-tipe')?.value || 'masuk';
  const opt = produkSel.options[produkSel.selectedIndex];
  const mutasi = {
    id: 'mut_' + Date.now(),
    tanggal: document.getElementById('mutasi-tanggal')?.value || new Date().toISOString().split('T')[0],
    produkId,
    produkNama: opt?.text?.split(' (')[0] || '',
    tipe,
    jumlah,
    keterangan: document.getElementById('mutasi-keterangan')?.value.trim() || '',
    createdAt: Date.now(),
  };
  // Update stok
  const products = getProducts();
  const p = products.find(x => x.id === produkId);
  if (p) {
    const stokSaat = p.stok ?? p.stokAwal ?? 0;
    if (tipe === 'masuk') p.stok = stokSaat + jumlah;
    else if (tipe === 'keluar') p.stok = Math.max(0, stokSaat - jumlah);
    else p.stok = jumlah; // koreksi
    saveProducts(products);
  }
  const list = DB.get('mutasi');
  list.push(mutasi);
  DB.set('mutasi', list);
  autoSync('mutasi', 'create', mutasi);
  if (p) autoSync('produk', 'update', p, p.id);
  showToast('Mutasi stok disimpan!');
  switchScreen('mutasi-stok');
}

// ===== BAYAR SUPPLIER =====
function renderBayarSupplier() {
  const pembelian = DB.get('pembelian').filter(b => b.status === 'hutang');
  const area = document.getElementById('bayar-supplier-area');
  if (!area) return;
  if (pembelian.length === 0) {
    area.innerHTML = emptyState('fa-money-check-dollar', 'Tidak ada hutang supplier', 'Semua tagihan sudah lunas');
    return;
  }
  area.innerHTML = pembelian.map(b => `
    <div class="crud-item">
      <div class="crud-item-avatar" style="background:#fde8e8;">
        <i class="fa-solid fa-money-check-dollar" style="color:var(--danger);font-size:18px;"></i>
      </div>
      <div class="crud-item-info">
        <div class="crud-item-nama">${b.produkNama || '-'}</div>
        <div class="crud-item-sub">
          <span>${b.tanggal}</span>
          <span>${b.jumlah} ${b.unit || 'Pcs'}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:var(--danger);margin-top:2px;">${fmt(b.total)}</div>
      </div>
      <div class="crud-item-actions">
        <button class="crud-btn-edit" style="background:#e8f8f0;color:#2ecc71;" onclick="bayarHutangSupplier('${b.id}')">
          <i class="fa-solid fa-check"></i>
        </button>
        <button class="crud-btn-del" onclick="hapusPembelianItem('${b.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`).join('');
}

function bayarHutangSupplier(id) {
  const list = DB.get('pembelian');
  const idx = list.findIndex(b => b.id === id);
  if (idx !== -1) { list[idx].status = 'lunas'; DB.set('pembelian', list); autoSync('pembelian', 'update', list[idx], id); }
  renderBayarSupplier();
  showToast('Hutang supplier dilunasi!');
}

function hapusPembelianItem(id) {
  if (!confirm('Hapus data hutang ini?')) return;
  DB.set('pembelian', DB.get('pembelian').filter(b => b.id !== id));
  autoSync('pembelian', 'delete', null, id);
  renderBayarSupplier();
  showToast('Data dihapus');
}

// ===== PELANGGAN BAYAR =====
function renderPelangganBayar() {
  const trx = DB.get('transaksi').filter(t => t.metodePembayaran === 'Piutang' && !t.lunas);
  const area = document.getElementById('pelanggan-bayar-area');
  if (!area) return;
  if (trx.length === 0) {
    area.innerHTML = emptyState('fa-hand-holding-dollar', 'Tidak ada piutang pelanggan', 'Semua tagihan sudah lunas');
    return;
  }
  area.innerHTML = trx.map(t => {
    const tgl = new Date(t.tanggal).toLocaleDateString('id-ID', {day:'2-digit',month:'2-digit',year:'numeric'});
    const invNum = t.id.replace('trx_','').slice(-8);
    return `
    <div class="crud-item">
      <div class="crud-item-avatar" style="background:#fff8e1;">
        <i class="fa-solid fa-hand-holding-dollar" style="color:#f39c12;font-size:18px;"></i>
      </div>
      <div class="crud-item-info">
        <div class="crud-item-nama">${t.pelanggan || 'Umum'}</div>
        <div class="crud-item-sub">
          <span>${tgl}</span>
          <span>INV-${invNum}</span>
        </div>
        <div style="font-size:13px;font-weight:700;color:#f39c12;margin-top:2px;">${fmt(t.total)}</div>
      </div>
      <div class="crud-item-actions">
        <button class="crud-btn-edit" style="background:#e8f8f0;color:#2ecc71;" onclick="lunaskanPiutang('${t.id}')">
          <i class="fa-solid fa-check"></i>
        </button>
        <button class="crud-btn-del" onclick="hapusPiutang('${t.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>`}).join('');
}

function lunaskanPiutang(id) {
  const list = DB.get('transaksi');
  const idx = list.findIndex(t => t.id === id);
  if (idx !== -1) { list[idx].lunas = true; DB.set('transaksi', list); autoSync('transaksi', 'update', list[idx], id); }
  renderPelangganBayar();
  showToast('Piutang dilunasi!');
}

function hapusPiutang(id) {
  if (!confirm('Hapus data piutang ini?')) return;
  DB.set('transaksi', DB.get('transaksi').filter(t => t.id !== id));
  autoSync('transaksi', 'delete', null, id);
  renderPelangganBayar();
  showToast('Data dihapus');
}

// ===== REKAPAN =====
function renderRekapan() {
  const area = document.getElementById('rekapan-area');
  if (!area) return;
  const trxList = DB.get('transaksi');
  const pembelianList = DB.get('pembelian');
  const biayaList = DB.get('biaya');
  const totalPenjualan = trxList.reduce((s, t) => s + t.total, 0);
  const totalPembelian = pembelianList.reduce((s, b) => s + b.total, 0);
  const totalBiaya = biayaList.filter(b => b.tipe === 'biaya').reduce((s, b) => s + b.nominal, 0);
  const totalPendapatan = biayaList.filter(b => b.tipe === 'pendapatan').reduce((s, b) => s + b.nominal, 0);
  const labaKotor = totalPenjualan - totalPembelian;
  const labaBersih = labaKotor - totalBiaya + totalPendapatan;
  area.innerHTML = `
    <div class="card" style="margin-bottom:12px;">
      <div class="card-title">Ringkasan Semua Waktu</div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-top:8px;">
        <div style="display:flex;justify-content:space-between;font-size:14px;">
          <span style="color:var(--text-mid);">Total Penjualan</span>
          <span style="font-weight:600;color:var(--primary);">${fmt(totalPenjualan)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;">
          <span style="color:var(--text-mid);">Total Pembelian</span>
          <span style="font-weight:600;color:var(--danger);">${fmt(totalPembelian)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;">
          <span style="color:var(--text-mid);">Total Biaya</span>
          <span style="font-weight:600;color:var(--danger);">${fmt(totalBiaya)}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:14px;">
          <span style="color:var(--text-mid);">Pendapatan Lain</span>
          <span style="font-weight:600;color:#2ecc71;">${fmt(totalPendapatan)}</span>
        </div>
        <div style="border-top:1px solid var(--border);padding-top:10px;display:flex;justify-content:space-between;font-size:15px;">
          <span style="font-weight:700;">Laba Bersih</span>
          <span style="font-weight:800;color:${labaBersih >= 0 ? '#2ecc71' : 'var(--danger)'};">${fmt(labaBersih)}</span>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Jumlah Transaksi</div>
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:8px;">
        <span style="color:var(--text-mid);">Total Invoice</span>
        <span style="font-weight:600;">${trxList.length}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:6px;">
        <span style="color:var(--text-mid);">Lunas</span>
        <span style="font-weight:600;color:#2ecc71;">${trxList.filter(t => t.metodePembayaran !== 'Piutang').length}</span>
      </div>
      <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:6px;">
        <span style="color:var(--text-mid);">Piutang</span>
        <span style="font-weight:600;color:var(--danger);">${trxList.filter(t => t.metodePembayaran === 'Piutang').length}</span>
      </div>
    </div>`;
}

// ===== SCREEN INIT LISTENER =====
document.addEventListener('screenInit', (e) => {
  const { name, params } = e.detail;
  if (name === 'pembelian') renderPembelianList();
  if (name === 'tambah-pembelian') initTambahPembelian();
  if (name === 'tambah-pembelian-massal') initTambahPembelianMassal();
  if (name === 'mutasi-stok') renderMutasiList();
  if (name === 'tambah-mutasi') initTambahMutasi();
  if (name === 'bayar-supplier') renderBayarSupplier();
  if (name === 'pelanggan-bayar') renderPelangganBayar();
  if (name === 'rekapan') renderRekapan();
});
