function generateAllLaporan(uid) {
  var trx = readAllUser('transaksi', uid).rows;
  var beli = readAllUser('pembelian', uid).rows;
  var biaya = readAllUser('biaya', uid).rows;
  var mutasi = readAllUser('mutasi', uid).rows;
  var produk = readAllUser('produk', uid).rows;

  genLapPenjualan(uid, trx);
  genLapPembelian(uid, beli);
  genLapStok(uid, produk, mutasi);
  genLapLabaRugi(uid, trx, biaya);
  genLapArusKas(uid, trx, beli, biaya);
  genLapPiutang(uid, trx);
  genLapHutang(uid, beli);
  genLapOmsetSales(uid, trx);
  genLapInvoicePelanggan(uid, trx);
  genLapInvoiceSupplier(uid, beli);
  genLapJatuhTempo(uid, trx, beli);
  return { status: 'ok' };
}

function delUserRows(sh, uid) {
  var all = sh.getDataRange().getValues(), uc = all[0].indexOf('userId');
  if (uc === -1) return;
  for (var i = all.length - 1; i >= 1; i--) if (String(all[i][uc]) === String(uid)) sh.deleteRow(i + 1);
}

function genLapPenjualan(uid, trx) {
  var sh = getSheet('laporanPenjualan'); delUserRows(sh, uid);
  var list = trx.filter(function (t) { return !t.isDraft; }); if (!list.length) return;
  var h = getHeaders(sh);
  var rows = list.map(function (t) {
    return h.map(function (k) {
      var m = {
        userId: uid, tanggal: t.tanggal, invoiceId: t.id, pelanggan: t.pelanggan || 'Umum',
        items: t.items ? JSON.stringify(t.items) : '', total: t.total, metode: t.metodePembayaran,
        status: t.lunas ? 'Lunas' : (t.metodePembayaran === 'Piutang' ? 'Piutang' : 'Lunas'), kasir: t.sales || ''
      };
      return m[k] !== undefined ? m[k] : '';
    });
  });
  _writeReportRows(sh, h, rows);
}

function genLapPembelian(uid, beli) {
  var sh = getSheet('laporanPembelian'); delUserRows(sh, uid);
  if (!beli.length) return;
  var h = getHeaders(sh);
  var rows = beli.map(function (b) {
    return h.map(function (k) {
      var m = {
        userId: uid, tanggal: b.tanggal, produk: b.produkNama, supplier: b.supplierNama || '-',
        jumlah: b.jumlah, harga: b.harga, total: b.total, status: b.status
      };
      return m[k] !== undefined ? m[k] : '';
    });
  });
  _writeReportRows(sh, h, rows);
}

function genLapStok(uid, produk, mutasi) {
  var sh = getSheet('laporanStok'); delUserRows(sh, uid);
  if (!produk.length) return;
  var h = getHeaders(sh);
  var rows = produk.map(function (p) {
    var masuk = mutasi.filter(function (m) { return m.produkId === p.id && m.tipe === 'masuk'; }).reduce(function (s, m) { return s + Number(m.jumlah || 0); }, 0);
    var keluar = mutasi.filter(function (m) { return m.produkId === p.id && m.tipe === 'keluar'; }).reduce(function (s, m) { return s + Number(m.jumlah || 0); }, 0);
    var stokAkhir = Number(p.stok || p.stokAwal || 0);
    return h.map(function (k) {
      var m = {
        userId: uid, produk: p.nama, kategori: p.kategori, stokAwal: Number(p.stokAwal || 0),
        masuk: masuk, keluar: keluar, stokAkhir: stokAkhir, nilaiStok: stokAkhir * Number(p.hargaBeli || 0)
      };
      return m[k] !== undefined ? m[k] : '';
    });
  });
  _writeReportRows(sh, h, rows);
}

function genLapLabaRugi(uid, trx, biaya) {
  var sh = getSheet('laporanLabaRugi'); delUserRows(sh, uid);
  var bm = {};
  trx.forEach(function (t) {
    if (t.isDraft) return;
    var k = new Date(t.tanggal).toISOString().slice(0, 7);
    if (!bm[k]) bm[k] = { p: 0, hpp: 0, b: 0, pl: 0 };
    bm[k].p += Number(t.total || 0);
    var items = _parseItemsField(t.items);
    items.forEach(function (i) { bm[k].hpp += Number(i.hargaBeli || 0) * Number(i.qty || 0); });
  });
  biaya.forEach(function (b) {
    var k = new Date(b.tanggal).toISOString().slice(0, 7);
    if (!bm[k]) bm[k] = { p: 0, hpp: 0, b: 0, pl: 0 };
    if (b.tipe === 'biaya') bm[k].b += Number(b.nominal || 0); else bm[k].pl += Number(b.nominal || 0);
  });
  var h = getHeaders(sh);
  var rows = Object.keys(bm).sort().map(function (k) {
    var d = bm[k], lk = d.p - d.hpp, lb = lk - d.b + d.pl;
    return h.map(function (hk) {
      var m = { userId: uid, periode: k, pendapatan: d.p, hpp: d.hpp, labaKotor: lk, biaya: d.b, pendapatanLain: d.pl, labaBersih: lb };
      return m[hk] !== undefined ? m[hk] : '';
    });
  });
  _writeReportRows(sh, h, rows);
}

function genLapArusKas(uid, trx, beli, biaya) {
  var sh = getSheet('laporanArusKas'); delUserRows(sh, uid);
  var ev = [];
  trx.forEach(function (t) { if (!t.isDraft && t.metodePembayaran !== 'Piutang') ev.push({ tgl: t.tanggal, ket: 'Penjualan ' + (t.pelanggan || ''), tipe: 'masuk', n: Number(t.total || 0) }); });
  beli.forEach(function (b) { if (b.status === 'lunas') ev.push({ tgl: b.tanggal, ket: 'Pembelian ' + (b.produkNama || ''), tipe: 'keluar', n: Number(b.total || 0) }); });
  biaya.forEach(function (b) { ev.push({ tgl: b.tanggal, ket: b.kategori || 'Biaya', tipe: b.tipe === 'pendapatan' ? 'masuk' : 'keluar', n: Number(b.nominal || 0) }); });
  ev.sort(function (a, b) { return new Date(a.tgl) - new Date(b.tgl); });
  var saldo = 0, h = getHeaders(sh);
  var rows = ev.map(function (e) {
    saldo += e.tipe === 'masuk' ? e.n : -e.n;
    return h.map(function (k) { var m = { userId: uid, tanggal: e.tgl, keterangan: e.ket, tipe: e.tipe, nominal: e.n, saldo: saldo }; return m[k] !== undefined ? m[k] : ''; });
  });
  _writeReportRows(sh, h, rows);
}

function genLapPiutang(uid, trx) {
  var sh = getSheet('laporanPiutang'); delUserRows(sh, uid);
  var list = trx.filter(function (t) { return !t.isDraft && t.metodePembayaran === 'Piutang'; });
  if (!list.length) return;
  var h = getHeaders(sh);
  var rows = list.map(function (t) {
    return h.map(function (k) {
      var m = { userId: uid, tanggal: t.tanggal, invoiceId: t.id, pelanggan: t.pelanggan || 'Umum', total: t.total, status: t.lunas ? 'Lunas' : 'Belum Lunas', tglJthTempo: t.tglJthTempo || '' };
      return m[k] !== undefined ? m[k] : '';
    });
  });
  _writeReportRows(sh, h, rows);
}

function genLapHutang(uid, beli) {
  var sh = getSheet('laporanHutang'); delUserRows(sh, uid);
  var list = beli.filter(function (b) { return b.status === 'hutang'; });
  if (!list.length) return;
  var h = getHeaders(sh);
  var rows = list.map(function (b) {
    return h.map(function (k) {
      var m = { userId: uid, tanggal: b.tanggal, produk: b.produkNama, supplier: b.supplierNama || '-', total: b.total, status: 'Belum Lunas' };
      return m[k] !== undefined ? m[k] : '';
    });
  });
  _writeReportRows(sh, h, rows);
}

function genLapOmsetSales(uid, trx) {
  var sh = getSheet('laporanOmsetSales'); delUserRows(sh, uid);
  var filtered = trx.filter(function (t) { return !t.isDraft; });
  if (!filtered.length) return;
  var salesMap = {};
  filtered.forEach(function (t) {
    var sid = t.salesId || 'no-sales', sname = t.sales || 'Tanpa Sales';
    if (!salesMap[sid]) salesMap[sid] = { salesId: sid, salesNama: sname, totalTransaksi: 0, totalOmset: 0, totalLaba: 0 };
    salesMap[sid].totalTransaksi++;
    salesMap[sid].totalOmset += Number(t.total || 0);
    var items = _parseItemsField(t.items);
    items.forEach(function (i) {
      salesMap[sid].totalLaba += (Number(i.harga || 0) - Number(i.hargaBeli || 0)) * Number(i.qty || 0);
    });
  });
  var h = getHeaders(sh);
  var rows = Object.keys(salesMap).map(function (k) {
    var s = salesMap[k];
    return h.map(function (hk) {
      var m = { userId: uid, salesId: s.salesId, salesNama: s.salesNama, totalTransaksi: s.totalTransaksi, totalOmset: s.totalOmset, totalLaba: s.totalLaba };
      return m[hk] !== undefined ? m[hk] : '';
    });
  });
  _writeReportRows(sh, h, rows);
}

function genLapInvoicePelanggan(uid, trx) {
  var sh = getSheet('laporanInvoicePelanggan'); delUserRows(sh, uid);
  var list = trx.filter(function (t) { return !t.isDraft; });
  if (!list.length) return;
  var h = getHeaders(sh);
  var rows = list.map(function (t) {
    return h.map(function (k) {
      var m = {
        userId: uid, tanggal: t.tanggal, invoiceId: t.id, pelanggan: t.pelanggan || 'Umum',
        items: t.items ? JSON.stringify(t.items) : '', total: t.total, metode: t.metodePembayaran,
        status: t.lunas ? 'Lunas' : (t.metodePembayaran === 'Piutang' ? 'Piutang' : 'Lunas'), tglJthTempo: t.tglJthTempo || ''
      };
      return m[k] !== undefined ? m[k] : '';
    });
  });
  _writeReportRows(sh, h, rows);
}

function genLapInvoiceSupplier(uid, beli) {
  var sh = getSheet('laporanInvoiceSupplier'); delUserRows(sh, uid);
  if (!beli.length) return;
  var h = getHeaders(sh);
  var rows = beli.map(function (b) {
    return h.map(function (k) {
      var m = {
        userId: uid, tanggal: b.tanggal, invoiceId: b.id, supplier: b.supplierNama || '-',
        produk: b.produkNama, jumlah: b.jumlah, total: b.total, status: b.status, tglJthTempo: b.tglJthTempo || ''
      };
      return m[k] !== undefined ? m[k] : '';
    });
  });
  _writeReportRows(sh, h, rows);
}

function genLapJatuhTempo(uid, trx, beli) {
  var sh = getSheet('laporanJatuhTempo'); delUserRows(sh, uid);
  var trxDue = trx.filter(function (t) { return !t.isDraft && t.metodePembayaran === 'Piutang' && !t.lunas && t.tglJthTempo; });
  var beliDue = beli.filter(function (b) { return b.status === 'hutang' && b.tglJthTempo; });
  var h = getHeaders(sh), now = new Date(), rows = [];
  trxDue.forEach(function (t) {
    var jt = new Date(t.tglJthTempo), diff = Math.floor((jt - now) / (1000 * 60 * 60 * 24));
    rows.push(h.map(function (k) {
      var m = {
        userId: uid, tanggal: t.tanggal, tipe: 'Piutang', invoiceId: t.id, pihak: t.pelanggan || 'Umum',
        total: t.total, tglJthTempo: t.tglJthTempo, selisihHari: diff, status: diff < 0 ? 'Terlambat' : (diff <= 7 ? 'Segera' : 'Normal')
      };
      return m[k] !== undefined ? m[k] : '';
    }));
  });
  beliDue.forEach(function (b) {
    var jt = new Date(b.tglJthTempo), diff = Math.floor((jt - now) / (1000 * 60 * 60 * 24));
    rows.push(h.map(function (k) {
      var m = {
        userId: uid, tanggal: b.tanggal, tipe: 'Hutang', invoiceId: b.id, pihak: b.supplierNama || '-',
        total: b.total, tglJthTempo: b.tglJthTempo, selisihHari: diff, status: diff < 0 ? 'Terlambat' : (diff <= 7 ? 'Segera' : 'Normal')
      };
      return m[k] !== undefined ? m[k] : '';
    }));
  });
  _writeReportRows(sh, h, rows);
}
