function doGet(e) {
  try {
    var p = e.parameter, action = p.action || '', token = p.token || '';

    if (action === 'ping') return respond(doPing());
    if (action === 'setup') return respond(setupDatabase());

    if (action === 'getCsrfToken') {
      var ipKey = 'ip_' + String((p.r || '')).slice(0, 20);
      var rl = _checkRateLimit('csrf_ip', ipKey, { max: 10, windowSec: 300 });
      if (rl) return respond({ error: 'Terlalu sering. Coba lagi nanti.', code: 429 });
      var csrf = _generateCsrfToken();
      CACHE.put('csrf_' + csrf, '1', CSRF_WINDOW_SEC);
      return respond({ csrf_token: csrf });
    }

    var user = validateToken(token);
    if (!user) return respond({ error: 'Unauthorized', code: 401 });

    var secErr = _securityCheckGet(e, token, user.id);
    if (secErr) return respond(secErr);

    if (action === 'read') return respond(readAllUser(p.sheet, user.id));
    if (action === 'readOne') return respond(readOne(p.sheet, p.id, user.id));
    if (action === 'pullAll') return respond(pullAll(user.id));
    if (action === 'readLaporan') return respond(readAllUser(p.sheet, user.id));
    if (action === 'profile') return respond({ user: safeUser(user) });
    return respond({ error: 'Unknown action: ' + action });
  } catch (err) { return respond({ error: err.message }); }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action || '', token = body.token || '';

    var secErr = _securityCheckPost(e, body);
    if (secErr) return respond(secErr);

    if (action === 'login' && body.email) {
      var loginRL = _checkRateLimit('login_email', String(body.email || '').toLowerCase().trim(), RATE_CONFIG.LOGIN_PER_EMAIL);
      if (loginRL) return respond({ error: 'Terlalu banyak percobaan login. Coba lagi ' + loginRL.retryAfter + ' detik.', code: 429, retryAfter: loginRL.retryAfter });
    }

    if (action === 'register') return respond(doRegister(body));
    if (action === 'login') {
      var loginEmail = String(body.email || '').toLowerCase().trim();
      if (loginEmail) _recordAttempt('login_email', loginEmail, RATE_CONFIG.LOGIN_PER_EMAIL.windowSec);
      return respond(doLogin(body));
    }
    if (action === 'setup') return respond(setupDatabase());

    var user = validateToken(token);
    if (!user) return respond({ error: 'Unauthorized', code: 401 });

    var apiRL = _checkRateLimit('api_token', user.id, RATE_CONFIG.API_PER_TOKEN);
    if (apiRL) return respond({ error: 'Terlalu banyak. Coba lagi ' + apiRL.retryAfter + ' detik.', code: 429, retryAfter: apiRL.retryAfter });

    if (action === 'logout') return respond(doLogout(token));
    if (action === 'create') return respond(createRow(body.sheet, body.data, user.id));
    if (action === 'update') return respond(updateRow(body.sheet, body.id, body.data, user.id));
    if (action === 'delete') return respond(deleteRow(body.sheet, body.id, user.id));
    if (action === 'upsert') return respond(upsertRow(body.sheet, body.data, user.id));
    if (action === 'bulkSync') return respond(bulkSyncUser(body.sheet, body.rows, user.id));
    if (action === 'pushAll') return respond(pushAll(body.data, user.id));
    if (action === 'generateLaporan') return respond(generateAllLaporan(user.id));
    if (action === 'updateProfile') return respond(updateProfile(user.id, body.data));
    return respond({ error: 'Unknown action: ' + action });
  } catch (err) { return respond({ error: err.message }); }
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('Koncowrb')
    .addItem('Setup Database (Jalankan Pertama Kali)', 'setupDatabase')
    .addItem('Generate Semua Laporan', 'generateAllLaporanUI')
    .addItem('Info Deploy', 'showDeployInfo')
    .addToUi();
}

function generateAllLaporanUI() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Generate Laporan', 'Masukkan userId:', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() === ui.Button.OK) { generateAllLaporan(r.getResponseText().trim()); ui.alert('Selesai!'); }
}

function showDeployInfo() {
  SpreadsheetApp.getUi().alert('Deploy:\n1. Deploy > New deployment\n2. Web App\n3. Execute as: Me\n4. Access: Anyone\n5. Copy URL');
}
