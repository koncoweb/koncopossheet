/**
 * Proxy GAS → browser: Web App Apps Script tidak bisa mengirim CORS ke domain pihak ketiga.
 * Permintaan same-origin ke route ini diteruskan ke script.google.com dari server (tanpa CORS).
 */
var GAS_URL_RE = /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/(?:dev|exec)$/;

var MAX_BODY = 2 * 1024 * 1024;

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
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
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
      upstream = await fetch(url, { method: 'GET', redirect: 'follow' });
    }

    var text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Upstream fetch failed' });
  }
};
