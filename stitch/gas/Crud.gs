function readAllUser(sheetKey, uid) {
  var sh = getSheet(sheetKey), last = sh.getLastRow();
  if (last <= 1) return { rows: [], count: 0 };
  var data = sh.getRange(1, 1, last, sh.getLastColumn()).getValues();
  var headers = data[0], uidCol = headers.indexOf('userId');
  var rows = data.slice(1).filter(function (r) {
    return uidCol === -1 || String(r[uidCol]) === String(uid);
  }).map(function (r) {
    return _rowToObject(headers, r, sheetKey);
  });
  return { rows: rows, count: rows.length };
}

function readOne(sheetKey, id, uid) {
  var sh = getSheet(sheetKey);
  var result = _findRowIndexById(sh, id, uid);
  if (result.rowIdx === -1) return result.error ? { error: result.error } : { row: null };
  return { row: _rowToObject(result.headers, result.data[result.rowIdx], sheetKey) };
}

function createRow(sheetKey, data, uid) {
  var sh = getSheet(sheetKey), headers = getHeaders(sh), now = _nowISO();
  data = prepareNamedMasterData_(sheetKey, data || {});
  var existingByName = findExistingNamedMasterRow_(sheetKey, data.nama, uid);
  if (existingByName) {
    data.id = existingByName.id;
    return updateRow(sheetKey, existingByName.id, data, uid);
  }
  if (!data.id) data.id = genId();
  if (!data.createdAt) data.createdAt = now;
  if (headers.indexOf('updatedAt') !== -1) data.updatedAt = now;
  if (headers.indexOf('userId') !== -1 && uid) data.userId = uid;
  if (sheetKey === 'outlet' && !data.id) data.id = 'outlet_' + String(data.key || genId());
  sh.appendRow(headers.map(function (h) { return encodeSheetValue_(sheetKey, h, data[h]); }));
  addLog(uid, 'create', sheetKey, 1, 'ok', data.id);
  return { status: 'ok', id: data.id };
}

function updateRow(sheetKey, id, data, uid) {
  var sh = getSheet(sheetKey);
  var result = _findRowIndexById(sh, id, uid);
  if (result.rowIdx === -1) return result.error ? { error: result.error } : { error: 'Data tidak ditemukan' };
  if (!result.data) return { error: 'Data tidak ditemukan' };

  data.updatedAt = _nowISO();
  var all = result.data, headers = result.headers, rowIdx = result.rowIdx;
  var rowValues = [];
  for (var c = 0; c < headers.length; c++) {
    rowValues[c] = data[headers[c]] !== undefined
      ? encodeSheetValue_(sheetKey, headers[c], data[headers[c]])
      : all[rowIdx][c];
  }
  sh.getRange(rowIdx + 1, 1, 1, rowValues.length).setValues([rowValues]);
  addLog(uid, 'update', sheetKey, 1, 'ok', id);
  return { status: 'ok', id: id };
}

function deleteRow(sheetKey, id, uid) {
  var sh = getSheet(sheetKey);
  var result = _findRowIndexById(sh, id, uid);
  if (result.rowIdx === -1) return result.error ? { error: result.error } : { error: 'Data tidak ditemukan' };
  if (sheetKey === 'transaksi') deleteTransaksiItemsByTransaksiId_(id, uid);
  sh.deleteRow(result.rowIdx + 1);
  addLog(uid, 'delete', sheetKey, 1, 'ok', id);
  return { status: 'ok', id: id };
}

function upsertRow(sheetKey, data, uid) {
  data = prepareNamedMasterData_(sheetKey, data || {});
  if (sheetKey === 'outlet') {
    data.id = data.id || ('outlet_' + String(data.key || 'unknown'));
  }
  if (!data.id) {
    var existingNamed = findExistingNamedMasterRow_(sheetKey, data.nama, uid);
    if (existingNamed) {
      data.id = existingNamed.id;
      return updateRow(sheetKey, existingNamed.id, data, uid);
    }
    return createRow(sheetKey, data, uid);
  }
  var ex = readOne(sheetKey, data.id, uid);
  if (!ex.row) {
    var existingByName = findExistingNamedMasterRow_(sheetKey, data.nama, uid);
    if (existingByName) {
      data.id = existingByName.id;
      return updateRow(sheetKey, existingByName.id, data, uid);
    }
  }
  return ex.row ? updateRow(sheetKey, data.id, data, uid) : createRow(sheetKey, data, uid);
}

function bulkSyncUser(sheetKey, rows, uid) {
  var sh = getSheet(sheetKey), headers = getHeaders(sh), uidCol = headers.indexOf('userId');
  rows = dedupeNamedMasterRows_(sheetKey, rows || []);
  var all = sh.getDataRange().getValues();
  for (var i = all.length - 1; i >= 1; i--) {
    if (uidCol !== -1 && String(all[i][uidCol]) === String(uid)) sh.deleteRow(i + 1);
  }
  if (!rows || !rows.length) return { status: 'ok', count: 0 };
  var now = _nowISO();
  var newRows = rows.map(function (d) {
    d = prepareNamedMasterData_(sheetKey, d || {});
    if (!d.id) d.id = genId();
    if (!d.createdAt) d.createdAt = now;
    if (uidCol !== -1) d.userId = uid;
    return headers.map(function (h) { return encodeSheetValue_(sheetKey, h, d[h]); });
  });
  sh.getRange(sh.getLastRow() + 1, 1, newRows.length, headers.length).setValues(newRows);
  return { status: 'ok', count: newRows.length };
}
