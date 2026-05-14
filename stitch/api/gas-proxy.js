/**
 * Proxy GAS → browser: Web App Apps Script tidak bisa mengirim CORS ke domain pihak ketiga.
 * Permintaan same-origin ke route ini diteruskan ke script.google.com dari server (tanpa CORS).
 */
var GAS_URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/(?:dev|exec)$/;

var MAX_BODY = 2 * 1024 * 1024;

/** Google sering membalas HTML 403 bila Web App hanya "Anyone with Google account" — server Vercel tidak punya cookie login. */
var BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
};

function looksLikeJsonResponse_(s) {
  if (!s || typeof s !== 'string') return false;
  var t = s.replace(/^\uFEFF/, '').trim();
  return t.charAt(0) === '{' || t.charAt(0) === '[';
}

function looksLikeGoogleAccessDenied_(s) {
  if (!s || typeof s !== 'string') return false;
  return (
    s.indexOf('Access Denied') !== -1 ||
    s.indexOf('You need access') !== -1 ||
    s.indexOf('You need permission') !== -1 ||
    (s.indexOf('<!DOCTYPE') !== -1 && s.indexOf('script.google.com') !== -1)
  );
}

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  var payload;
  try {
    payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  var target = String(payload && payload.target ? payload.target : '').trim();
  if (!GAS_URL_RE.test(target)) {
    return res.status(400).json({ error: 'Invalid target URL' });
  }

  var gasMethod = String(payload.gasMethod || 'GET').toUpperCase();
  if (gasMethod !== 'GET' && gasMethod !== 'POST') {
    return res.status(400).json({ error: 'Invalid gasMethod' });
  }

  try {
    var upstream;
    if (gasMethod === 'POST') {
      var rawBody =
        typeof payload.gasBody === 'string'
          ? payload.gasBody
          : JSON.stringify(payload.gasBody != null ? payload.gasBody : {});
      if (rawBody.length > MAX_BODY) {
        return res.status(413).json({ error: 'Body too large' });
      }
      upstream = await fetch(target, {
        method: 'POST',
        redirect: 'follow',
        headers: Object.assign({ 'Content-Type': 'text/plain;charset=UTF-8' }, BROWSER_HEADERS),
        body: rawBody,
      });
    } else {
      var q = payload.gasQuery && typeof payload.gasQuery === 'object' ? payload.gasQuery : {};
      var usp = new URLSearchParams();
      Object.keys(q).forEach(function (k) {
        var v = q[k];
        if (v === undefined || v === null) return;
        usp.append(k, String(v));
      });
      var qs = usp.toString();
      var url = qs ? target + '?' + qs : target;
      upstream = await fetch(url, { method: 'GET', redirect: 'follow', headers: BROWSER_HEADERS });
    }

    var text = await upstream.text();
    var upStatus = upstream.status;

    if (upStatus === 403 || looksLikeGoogleAccessDenied_(text) || !looksLikeJsonResponse_(text)) {
      var hint =
        'Google menolak akses dari server (bukan dari browser Anda). ' +
        'Di Apps Script: Deploy → ikon gerigi Web App → set "Who has access" ke Anyone / Siapa saja (termasuk anonim), bukan "Anyone with Google account". ' +
        'Simpan lalu Deploy versi baru.';
      if (!looksLikeJsonResponse_(text) && !looksLikeGoogleAccessDenied_(text)) {
        hint =
          'Jawaban dari URL Web App bukan JSON (HTTP ' +
          upStatus +
          '). Periksa URL deployment /dev vs /exec dan pastikan deploy "Execute as: Me" + "Anyone".';
      }
      return res.status(502).json({ error: hint, code: 502 });
    }

    res.status(200);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(text.replace(/^\uFEFF/, '').trim());
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Upstream fetch failed' });
  }
};
