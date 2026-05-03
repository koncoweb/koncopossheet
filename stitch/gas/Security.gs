function _getClientIp(e) {
  try {
    var h = e && e.queryString ? e.queryString : '';
    return 'ip_' + (String((e && e.parameter && e.parameter.r) ? e.parameter.r : '')).slice(0, 20) || 'anon';
  } catch (ex) { return 'anon'; }
}

function _rateKey(prefix, identifier) {
  return 'ratelimit_' + prefix + '_' + String(identifier || 'anon');
}

function _checkRateLimit(prefix, identifier, cfg) {
  if (!identifier) return null;
  var key = _rateKey(prefix, identifier);
  var data = CACHE.get(key);
  var now = Date.now();
  var windowMs = cfg.windowSec * 1000;

  if (!data) {
    CACHE.put(key, JSON.stringify([now]), cfg.windowSec);
    return null;
  }

  var timestamps = JSON.parse(data);
  timestamps = timestamps.filter(function (t) { return t > now - windowMs; });

  if (timestamps.length >= cfg.max) {
    var retrySec = Math.ceil((timestamps[0] + windowMs - now) / 1000);
    return { blocked: true, retryAfter: Math.max(1, retrySec) };
  }

  timestamps.push(now);
  CACHE.put(key, JSON.stringify(timestamps), cfg.windowSec);
  return null;
}

function _recordAttempt(prefix, identifier, windowSec) {
  if (!identifier) return;
  var key = _rateKey(prefix, identifier);
  var data = CACHE.get(key);
  var timestamps = data ? JSON.parse(data) : [];
  timestamps.push(Date.now());
  CACHE.put(key, JSON.stringify(timestamps), windowSec);
}

function _generateCsrfToken() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  var token = '';
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(Date.now()) + String(Math.random()));
  for (var i = 0; i < 32; i++) {
    token += chars.charAt(bytes[i] % chars.length);
  }
  return 'csrf_' + token;
}

function _validateCsrfToken(token) {
  if (!token || typeof token !== 'string') return false;
  var stored = CACHE.get('csrf_' + token);
  if (!stored) return false;
  CACHE.remove('csrf_' + token);
  return true;
}

function _validateOrigin(e) {
  return true;
}

function _securityCheckPost(e, body) {
  var action = (body && body.action) || '';
  var ipKey = 'ip_' + String((e && e.parameter && e.parameter.r ? e.parameter.r : '')).slice(0, 20);
  if (ipKey !== 'ip_anon') {
    var rl = _checkRateLimit('post_ip', ipKey, RATE_CONFIG.API_PER_IP);
    if (rl) return { error: 'Terlalu banyak permintaan. Coba lagi ' + rl.retryAfter + ' detik.', code: 429, retryAfter: rl.retryAfter };
  }
  if (action === 'login' || action === 'register') {
    if (!body.csrf_token || !_validateCsrfToken(body.csrf_token)) {
      return { error: 'Token CSRF tidak valid atau kadaluarsa. Refresh halaman.', code: 403 };
    }
  }
  return null;
}

function _securityCheckGet(e, token, uid) {
  if (token && uid) {
    var rl = _checkRateLimit('api_token', uid, RATE_CONFIG.API_PER_TOKEN);
    if (rl) return { error: 'Terlalu banyak permintaan. Coba lagi ' + rl.retryAfter + ' detik.', code: 429, retryAfter: rl.retryAfter };
  }
  return null;
}
