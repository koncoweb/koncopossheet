function doRegister(body) {
  var email = trim(body.email || '').toLowerCase(), pw = trim(body.password || '');
  var nama = trim(body.namaLengkap || ''), usaha = trim(body.namaUsaha || '');
  var jenis = trim(body.jenisUsaha || ''), telp = trim(body.telp || '');
  if (!email) return { error: 'Email wajib' };
  if (!pw || pw.length < 6) return { error: 'Password min 6 karakter' };
  if (!nama) return { error: 'Nama lengkap wajib' };
  if (!usaha) return { error: 'Nama usaha wajib' };
  if (!jenis) return { error: 'Jenis usaha wajib' };
  var sh = getSheet('users'), data = sh.getDataRange().getValues(), headers = data[0];
  var emailCol = headers.indexOf('email');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][emailCol]).toLowerCase() === email) return { error: 'Email sudah terdaftar' };
  }
  var now = _nowISO(), uid = genId();
  var user = {
    id: uid, namaLengkap: nama, email: email, password: hashPw(pw),
    namaUsaha: usaha, jenisUsaha: jenis, telp: telp, role: 'owner', status: 'active',
    createdAt: now, lastLogin: now
  };
  sh.appendRow(headers.map(function (h) { return user[h] !== undefined ? user[h] : ''; }));
  var token = createSession(uid, email, usaha);
  setupDefaultData(uid, usaha, jenis);
  addLog(uid, 'register', 'Users', 1, 'ok', email);
  return { status: 'ok', token: token, user: safeUser(user), message: 'Registrasi berhasil! Selamat datang, ' + nama };
}

function doLogin(body) {
  var email = trim(body.email || '').toLowerCase(), pw = trim(body.password || '');
  if (!email || !pw) return { error: 'Email dan password wajib' };
  var sh = getSheet('users'), data = sh.getDataRange().getValues(), headers = data[0];
  var user = null;
  for (var i = 1; i < data.length; i++) {
    var obj = _rowToObject(headers, data[i]);
    if (String(obj.email).toLowerCase() === email) { user = obj; break; }
  }
  if (!user) return { error: 'Email tidak ditemukan' };
  if (user.status === 'inactive') return { error: 'Akun dinonaktifkan' };
  if (!checkPw(pw, user.password)) return { error: 'Password salah' };
  updateRow('users', user.id, { lastLogin: _nowISO() }, user.id);
  var token = createSession(user.id, user.email, user.namaUsaha);
  addLog(user.id, 'login', 'Users', 1, 'ok', email);
  return { status: 'ok', token: token, user: safeUser(user), message: 'Login berhasil! Selamat datang, ' + user.namaLengkap };
}

function doLogout(token) {
  var sh = getSheet('sessions'), data = sh.getDataRange().getValues(), headers = data[0];
  var col = headers.indexOf('token');
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][col]) === token) { sh.deleteRow(i + 1); break; }
  }
  return { status: 'ok', message: 'Logout berhasil' };
}

function updateProfile(userId, data) {
  var allowed = ['namaLengkap', 'namaUsaha', 'jenisUsaha', 'telp'];
  var upd = {};
  allowed.forEach(function (k) { if (data[k] !== undefined) upd[k] = data[k]; });
  if (data.nama !== undefined) upd.namaLengkap = data.nama;
  if (data.email !== undefined) upd.email = data.email;
  if (data.password && data.password.length >= 6) upd.password = hashPw(data.password);
  return updateRow('users', userId, upd, userId);
}

function validateToken(token) {
  if (!token) return null;
  var sh = getSheet('sessions'), data = sh.getDataRange().getValues(), headers = data[0];
  var now = new Date();
  for (var i = 1; i < data.length; i++) {
    var obj = _rowToObject(headers, data[i]);
    if (obj.token === token) {
      if (new Date(obj.expiresAt) < now) { sh.deleteRow(i + 1); return null; }
      return getUserById(obj.userId);
    }
  }
  return null;
}

function getUserById(uid) {
  var sh = getSheet('users'), data = sh.getDataRange().getValues(), headers = data[0];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][headers.indexOf('id')]) === String(uid)) {
      return _rowToObject(headers, data[i]);
    }
  }
  return null;
}

function createSession(uid, email, namaUsaha) {
  var token = genToken(), now = new Date();
  var exp = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  getSheet('sessions').appendRow([token, uid, email, namaUsaha, now.toISOString(), exp.toISOString()]);
  return token;
}

function safeUser(u) {
  return {
    id: u.id, namaLengkap: u.namaLengkap, email: u.email, namaUsaha: u.namaUsaha,
    jenisUsaha: u.jenisUsaha, telp: u.telp, role: u.role, createdAt: u.createdAt
  };
}

function hashPw(pw) {
  var salt = 'KONCOWRB2026', h = '';
  for (var i = 0; i < pw.length; i++) h += String.fromCharCode(pw.charCodeAt(i) ^ salt.charCodeAt(i % salt.length));
  return Utilities.base64Encode(h + ':' + pw.length);
}

function checkPw(pw, hashed) { return hashPw(pw) === hashed; }

function setupDefaultData(uid, usaha, jenis) {
  var now = _nowISO();
  var shKat = getSheet('kategori'), hKat = getHeaders(shKat);
  ['Makanan', 'Minuman', 'Snack', 'Lainnya'].forEach(function (n) {
    shKat.appendRow(hKat.map(function (h) { return { id: genId(), userId: uid, nama: n, createdAt: now }[h] || ''; }));
  });
  var shMet = getSheet('metodePembayaran'), hMet = getHeaders(shMet);
  ['Tunai', 'Transfer', 'QRIS', 'Piutang'].forEach(function (n) {
    shMet.appendRow(hMet.map(function (h) { return { id: genId(), userId: uid, nama: n, createdAt: now }[h] || ''; }));
  });
  var shOut = getSheet('outlet');
  [
    ['outlet_nama', uid, 'nama', usaha, now],
    ['outlet_jenisUsaha', uid, 'jenisUsaha', jenis, now],
    ['outlet_catatan', uid, 'catatan', 'Terima kasih!', now]
  ].forEach(function (r) { shOut.appendRow(r); });
}
