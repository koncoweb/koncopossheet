function getSheet(key) {
  var name = SHEETS[key] || key, sh = getKoncoSpreadsheet_().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" tidak ditemukan. Jalankan setupDatabase()');
  return sh;
}

function getHeaders(sh) {
  var c = sh.getLastColumn(); return c === 0 ? [] : sh.getRange(1, 1, 1, c).getValues()[0];
}

function encodeSheetValue_(sheetKey, field, value) {
  if (value === undefined || value === null) return '';
  if (JSON_FIELDS[sheetKey] && JSON_FIELDS[sheetKey][field]) return JSON.stringify(value);
  return value;
}

function decodeSheetValue_(sheetKey, field, value) {
  if (value === '') return null;
  if (JSON_FIELDS[sheetKey] && JSON_FIELDS[sheetKey][field] && typeof value === 'string') {
    try { return JSON.parse(value); } catch (e) {}
  }
  if (sheetKey === 'transaksi' && (field === 'isDraft' || field === 'lunas')) {
    return value === true || value === 'true';
  }
  return value;
}

function deleteTransaksiItemsByTransaksiId_(transaksiId, uid) {
  var sh = getSheet('transaksiItems'), all = sh.getDataRange().getValues(), headers = all[0];
  var trxCol = headers.indexOf('transaksiId'), uidCol = headers.indexOf('userId');
  for (var i = all.length - 1; i >= 1; i--) {
    if (String(all[i][trxCol]) === String(transaksiId) && (uidCol === -1 || String(all[i][uidCol]) === String(uid))) {
      sh.deleteRow(i + 1);
    }
  }
}

function genId() { return 'gs_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6); }

function genToken() { return Utilities.base64Encode(genId() + '_' + Date.now()).replace(/[^a-zA-Z0-9]/g, '').slice(0, 64); }

function trim(s) { return String(s || '').trim(); }

function addLog(uid, aksi, sheet, jml, status, pesan) {
  try {
    var sh = getKoncoSpreadsheet_().getSheetByName(SHEETS.syncLog); if (!sh) return;
    sh.appendRow([_nowISO(), uid || '', aksi, sheet, jml, status, pesan]);
    while (sh.getLastRow() > 1001) sh.deleteRow(2);
  } catch (e) {}
}

function doPing() { return { status: 'ok', time: _nowISO(), sheet: getKoncoSpreadsheet_().getName(), version: '3.0' }; }

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

function normalizeName_(value) {
  return trim(value || '').toLowerCase();
}

function slugifyName_(value) {
  return normalizeName_(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'item';
}

function _nowISO() { return new Date().toISOString(); }

function _rowToObject(headers, rowValues, sheetKey) {
  var o = {};
  headers.forEach(function (h, j) { o[h] = decodeSheetValue_(sheetKey, h, rowValues[j]); });
  return o;
}

function _findRowIndexById(sh, id, uid) {
  var all = sh.getDataRange().getValues(), headers = all[0];
  var idCol = headers.indexOf('id'), uidCol = headers.indexOf('userId');
  for (var i = 1; i < all.length; i++) {
    if (String(all[i][idCol]) === String(id)) {
      if (uidCol !== -1 && uid && String(all[i][uidCol]) !== String(uid)) return { rowIdx: -1, error: 'Akses ditolak', headers: headers };
      return { rowIdx: i, headers: headers, data: all };
    }
  }
  return { rowIdx: -1, headers: headers, data: all };
}

function _parseItemsField(rawItems) {
  if (Array.isArray(rawItems)) return rawItems;
  if (typeof rawItems === 'string') {
    try { return JSON.parse(rawItems || '[]'); } catch (e) {}
  }
  return [];
}

function _writeReportRows(sh, headers, rows) {
  if (rows.length) sh.getRange(sh.getLastRow() + 1, 1, rows.length, headers.length).setValues(rows);
}
