function pushAll(data, uid) {
  if (!data) return { error: 'Data kosong' };
  var results = {};
  var map = {
    produk: 'produk', kategori: 'kategori', transaksi: 'transaksi',
    pembelian: 'pembelian', mutasi: 'mutasi', biaya: 'biaya',
    pelanggan: 'pelanggan', supplier: 'supplier', sales: 'sales',
    kurir: 'kurir', kasir: 'kasir',
    jenisPenjualan: 'jenisPenjualan', metodePembayaran: 'metodePembayaran',
    kategoriBiaya: 'kategoriBiaya'
  };
  Object.keys(map).forEach(function (k) {
    if (data[k] !== undefined) {
      try { results[k] = bulkSyncUser(map[k], data[k], uid); }
      catch (e) { results[k] = { error: e.message }; }
    }
  });
  if (data.transaksi) {
    try {
      var items = [], now = _nowISO();
      data.transaksi.forEach(function (t) {
        var arr = _parseItemsField(t.items);
        arr.forEach(function (item, idx) {
          items.push({
            id: item.id || ('ti_' + t.id + '_' + idx),
            userId: uid,
            transaksiId: t.id,
            produkId: item.id,
            nama: item.nama,
            harga: item.harga,
            hargaBeli: item.hargaBeli || 0,
            qty: item.qty,
            unit: item.unit || 'Pcs',
            subtotal: item.qty * item.harga,
            createdAt: now
          });
        });
      });
      results.transaksiItems = bulkSyncUser('transaksiItems', items, uid);
    } catch (e) { results.transaksiItems = { error: e.message }; }
  }
  if (data.outlet) {
    try {
      var sh = getSheet('outlet');
      delUserRows(sh, uid);
      var oRows = Object.keys(data.outlet).map(function (k) {
        var v = data.outlet[k];
        return ['outlet_' + k, uid, k, typeof v === 'object' ? JSON.stringify(v) : String(v), _nowISO()];
      });
      if (oRows.length) sh.getRange(sh.getLastRow() + 1, 1, oRows.length, 5).setValues(oRows);
      results.outlet = { status: 'ok' };
    } catch (e) { results.outlet = { error: e.message }; }
  }
  try { generateAllLaporan(uid); results.laporan = { status: 'ok' }; }
  catch (e) { results.laporan = { error: e.message }; }
  addLog(uid, 'pushAll', 'ALL', Object.keys(results).length, 'ok', _nowISO());
  return { status: 'ok', results: results, syncTime: _nowISO() };
}

function pullAll(uid) {
  var result = {};
  var map = {
    produk: 'produk', kategori: 'kategori', transaksi: 'transaksi',
    pembelian: 'pembelian', mutasi: 'mutasi', biaya: 'biaya',
    pelanggan: 'pelanggan', supplier: 'supplier', sales: 'sales',
    kurir: 'kurir', kasir: 'kasir',
    jenisPenjualan: 'jenisPenjualan', metodePembayaran: 'metodePembayaran',
    kategoriBiaya: 'kategoriBiaya'
  };
  Object.keys(map).forEach(function (k) {
    try { result[k] = readAllUser(map[k], uid).rows; } catch (e) { result[k] = []; }
  });
  try {
    var oRows = readAllUser('outlet', uid).rows, outlet = {};
    oRows.forEach(function (r) { outlet[r.key] = r.value; });
    result.outlet = outlet;
  } catch (e) { result.outlet = {}; }
  addLog(uid, 'pullAll', 'ALL', 1, 'ok', 'Pull berhasil');
  return { status: 'ok', data: result, syncTime: _nowISO() };
}
