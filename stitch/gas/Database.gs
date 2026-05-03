function setupDatabase() {
  var created = [], existing = [];
  var ss = getKoncoSpreadsheet_();
  var sheetNames = Object.keys(SCHEMAS);
  for (var i = 0; i < sheetNames.length; i++) {
    var name = sheetNames[i];
    var sh = ss.getSheetByName(name);
    if (!sh) {
      sh = ss.insertSheet(name);
      var headers = SCHEMAS[name];
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      var isAuth = (name === 'Users' || name === 'Sessions');
      var isLaporan = (name.indexOf('Laporan') === 0);
      var bg = isAuth ? '#1a1a2e' : isLaporan ? '#2c3e50' : '#e8637a';
      sh.getRange(1, 1, 1, headers.length).setBackground(bg).setFontColor('#fff').setFontWeight('bold');
      sh.setFrozenRows(1);
      created.push(name);
    } else {
      existing.push(name);
      ensureSheetSchema_(sh, SCHEMAS[name]);
    }
  }
  try {
    SpreadsheetApp.getUi().alert(
      'Setup selesai!\nDibuat: ' + created.length + '\nSudah ada: ' + existing.length +
      '\n\nLangkah deploy:\n1. Deploy > New deployment\n2. Web App\n3. Execute as: Me\n4. Access: Anyone\n5. Copy URL'
    );
  } catch (e) {}
  return { status: 'ok', created: created, existing: existing };
}

function ensureSheetSchema_(sh, expectedHeaders) {
  var existingHeaders = getHeaders(sh);
  if (!existingHeaders.length) {
    sh.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    sh.setFrozenRows(1);
    return;
  }
  for (var i = 0; i < expectedHeaders.length; i++) {
    if (existingHeaders[i] === expectedHeaders[i]) continue;
    if (existingHeaders.indexOf(expectedHeaders[i]) === -1) {
      if (i === 0) {
        sh.insertColumnBefore(1);
      } else if (i <= sh.getLastColumn()) {
        sh.insertColumnAfter(i);
      } else {
        sh.insertColumnAfter(sh.getLastColumn());
      }
      sh.getRange(1, i + 1).setValue(expectedHeaders[i]);
      existingHeaders.splice(i, 0, expectedHeaders[i]);
    }
  }
}

function getNamedMasterConfig_(sheetKey) {
  return NAMED_MASTER_CONFIG[sheetKey] || null;
}

function prepareNamedMasterData_(sheetKey, data) {
  var cfg = getNamedMasterConfig_(sheetKey);
  if (!cfg || !data) return data;
  data.nama = trim(data.nama || '');
  if (!data.id && data.nama) data.id = cfg.prefix + '_' + slugifyName_(data.nama);
  return data;
}

function findExistingNamedMasterRow_(sheetKey, nama, uid) {
  var cfg = getNamedMasterConfig_(sheetKey);
  if (!cfg || !nama) return null;
  var sh = getSheet(sheetKey), all = sh.getDataRange().getValues(), headers = all[0];
  var uidCol = headers.indexOf('userId'), namaCol = headers.indexOf('nama');
  var targetName = normalizeName_(nama);
  if (namaCol === -1) return null;
  for (var i = 1; i < all.length; i++) {
    if (uidCol !== -1 && uid && String(all[i][uidCol]) !== String(uid)) continue;
    if (normalizeName_(all[i][namaCol]) === targetName) {
      return { rowIdx: i, id: all[i][headers.indexOf('id')] };
    }
  }
  return null;
}

function dedupeNamedMasterRows_(sheetKey, rows) {
  var cfg = getNamedMasterConfig_(sheetKey);
  if (!cfg || !rows || !rows.length) return rows || [];
  var seen = {}, result = [];
  rows.forEach(function (row) {
    row = prepareNamedMasterData_(sheetKey, row || {});
    var namaKey = normalizeName_(row.nama);
    if (!namaKey) return;
    if (seen[namaKey]) return;
    seen[namaKey] = true;
    result.push(row);
  });
  return result;
}
