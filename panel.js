/* DAALVI /donate — hidden admin panel (v2, authenticated endpoint). Loaded ONLY when Ctrl+Shift+E is pressed; visitors never download it.
   SECURITY MODEL (the shortcut is NOT a lock): every change is a request signed with HMAC-SHA256 using a key derived (PBKDF2) from the admin passphrase. The passphrase never
   leaves this page; the server checks the signature, timestamp, one-time nonce and instruction id on EVERY request. The endpoint is a private (tailnet-only) address, so it only
   answers from the admin's own devices, and it locks after repeated failures. Nothing is stored in the browser (no cookies, localStorage or sessionStorage). This file contains no secrets. */
(function () {
  'use strict';
  if (window.DonatePanel) return;
  var CFG = (window.DONATE_CONTENT && window.DONATE_CONTENT.remote && window.DONATE_CONTENT.remote.url) || 'https://www.daalvi.com/_functions/donateConfig';
  var ADMIN = (window.DONATE_CONTENT && window.DONATE_CONTENT.adminUrl) || 'https://desktop-ov6dps2.taila16d87.ts.net:8443/admin/v1';
  var ADMIN_PAGE = 'admin.html', MAX_ADD = 20000000, MAX_TOTAL = 1000000000, IDLE_MS = 5 * 60000, CONFIRM_POLL_MS = 3000, CONFIRM_WAIT_MS = 60000;
  var hmacKey = null, offset = 0, busy = false, seq = 0, idleT = null, root, $ = function (id) { return document.getElementById('dp-' + id); }, enc = new TextEncoder();

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function num(v) { var d = String(v == null ? '' : v).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); }).replace(/\D/g, ''); return d ? parseInt(d, 10) : 0; }
  function fmt(n) { return String(Math.max(0, Math.round(+n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fa(s) { return String(s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function money(el) {
    el.addEventListener('input', function () {
      var raw = String(el.value), caret = el.selectionStart == null ? raw.length : el.selectionStart, dg = /[0-9۰-۹٠-٩]/;
      var before = raw.slice(0, caret).replace(/[^0-9۰-۹٠-٩]/g, '').length;
      el.value = dg.test(raw) ? fmt(num(raw)) : '';
      var pos = 0, seen = 0; while (pos < el.value.length && seen < before) { if (/\d/.test(el.value.charAt(pos))) seen++; pos++; }
      try { el.setSelectionRange(pos, pos); } catch (e) {}
    });
  }
  function rand(n) { var a = new Uint8Array(n); crypto.getRandomValues(a); return a; }
  function b64url(u8) { var s = ''; u8.forEach(function (b) { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
  function hex(buf) { return Array.prototype.map.call(new Uint8Array(buf), function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function unhex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function opId() { return 'p' + hex(rand(8)); }
  function msg(t, cls) { var m = $('msg'); m.textContent = t || ''; m.className = 'dp-msg' + (cls ? ' ' + cls : ''); }
  function touch() { clearTimeout(idleT); idleT = setTimeout(lock, IDLE_MS); }
  function lock(why) { hmacKey = null; if (root) { $('main').hidden = true; $('unlock').hidden = false; $('pw').value = ''; if (why !== 'quiet') msg('قفل شد.', 'warn'); } }

  /* ---- crypto: key derivation + request signing (must match integrations/donate-admin/server.js) ---- */
  function canonical(ts, nonce, op) { var v = String(op.value); return ['v1', ts, nonce, op.id, op.type, typeof op.value, v.length, v].join('|'); }
  function derive(pass, saltHex, iterations) {
    return crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveBits']).then(function (k) {
      return crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(saltHex), iterations: iterations, hash: 'SHA-256' }, k, 256);
    }).then(function (bits) { return crypto.subtle.importKey('raw', bits, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); });   // non-extractable
  }
  function signedBody(op) {
    var ts = Date.now() + offset, nonce = b64url(rand(18));
    return crypto.subtle.sign('HMAC', hmacKey, enc.encode(canonical(ts, nonce, op))).then(function (sig) { return JSON.stringify({ op: op, ts: ts, nonce: nonce, sig: hex(sig) }); });
  }
  function call(op) {
    return signedBody(op).then(function (body) { return fetch(ADMIN + '/op', { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: body, cache: 'no-store' }); })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); });
  }
  function explain(x) {
    if (x.s === 401) return 'رد شد: عبارت مدیریت اشتباه است (یا ساعت دستگاه درست نیست).';
    if (x.s === 429) return 'به‌خاطر تلاش‌های ناموفق چند دقیقه قفل است. بعداً دوباره امتحان کنید.';
    if (x.s === 503) return 'مدیریت هنوز روی هاب فعال نشده است.';
    if (x.s === 400 || x.s === 409) return 'مقدار پذیرفته نشد: ' + String((x.j && x.j.error) || '').replace(/^invalid: /, '');
    return 'خطا (' + fa(String(x.s)) + '). هیچ تغییری اعمال نشد.';
  }
  var DOWN = 'هاب استریم در دسترس نیست (کامپیوتر خاموش است یا این دستگاه به شبکهٔ خصوصی وصل نیست). هیچ تغییری اعمال نشد.';

  function build() {
    var css = document.createElement('style');
    css.textContent = [
      '#dp{position:absolute;top:0;left:0;z-index:99999;width:min(23rem,100%);box-sizing:border-box;max-height:100vh;overflow:auto;padding:1.1rem 1.1rem 1.4rem;background:var(--paper,#f4ead6);color:var(--ink,#10231a);',
      'font:15px/1.7 var(--f-text,Vazirmatn,Tahoma,sans-serif);border-right:1px solid var(--kraft,#c8a97c);box-shadow:6px 0 24px rgba(16,35,26,.18);transform:translateX(-105%);transition:transform .22s ease;direction:rtl;text-align:right}',
      '#dp.open{transform:none}@media (prefers-reduced-motion:reduce){#dp{transition:none}}#dp [hidden]{display:none!important}',
      '#dp *{box-sizing:border-box}#dp h2{margin:0;font:400 1.5rem var(--f-display,DigiSarve,Vazirmatn,sans-serif)}#dp h3{margin:1.1rem 0 .3rem;font-size:.95rem;font-weight:700;color:var(--ink-soft,#33443a)}',
      '#dp .dp-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem}#dp .dp-x{border:0;background:none;font-size:1.3rem;cursor:pointer;color:var(--ink,#10231a);padding:.2rem .5rem}',
      '#dp label{display:block;font-size:.85rem;color:var(--ink-mute,#5a6657);margin:.5rem 0 .15rem}#dp input[type=text],#dp input[type=password]{width:100%;font:inherit;padding:.45rem .6rem;border:1px solid var(--kraft,#c8a97c);border-radius:.4rem;background:#fffaf0;color:inherit}',
      '#dp input[dir=ltr]{text-align:left}#dp input:focus-visible,#dp button:focus-visible{outline:2px solid var(--edge,#163422);outline-offset:2px}',
      '#dp .dp-row{display:flex;gap:.5rem;align-items:flex-end}#dp .dp-row>div{flex:1}#dp .dp-btn{font:inherit;font-weight:700;padding:.45rem .9rem;border:1px solid var(--edge,#163422);border-radius:.4rem;background:var(--edge,#163422);color:#f4ead6;cursor:pointer;white-space:nowrap}',
      '#dp .dp-btn.alt{background:transparent;color:var(--edge,#163422)}#dp .dp-btn:disabled{opacity:.5;cursor:wait}#dp .dp-now{margin:.6rem 0 0;padding:.5rem .7rem;border:1px dashed var(--kraft,#c8a97c);border-radius:.4rem;font-size:.9rem;color:var(--ink-soft,#33443a)}',
      '#dp .dp-msg{min-height:1.6em;margin-top:.9rem;font-size:.9rem}#dp .dp-msg.ok{color:#1f5a2e}#dp .dp-msg.err{color:#8a2418}#dp .dp-msg.warn{color:#7a5a12}#dp .dp-hint{font-size:.78rem;color:var(--ink-mute,#5a6657);margin:.5rem 0 0}',
      '#dp a{color:var(--edge,#163422)}'
    ].join('');
    document.head.appendChild(css);
    root = document.createElement('aside'); root.id = 'dp'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'پنل مدیریت'); root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="dp-top"><h2>پنل مدیریت</h2><button class="dp-x" id="dp-x" type="button" aria-label="بستن">✕</button></div>' +
      '<div id="dp-unlock"><label for="dp-pw">عبارت مدیریت</label><input id="dp-pw" type="password" dir="ltr" autocomplete="off" spellcheck="false"><div class="dp-row" style="margin-top:.6rem"><button class="dp-btn" id="dp-go" type="button">ورود</button></div></div>' +
      '<div id="dp-main" hidden><div class="dp-now" id="dp-now" aria-live="polite"></div>' +
      '<h3>افزودن حمایت آفلاین</h3><div class="dp-row"><div><label for="dp-add">مبلغ (تومان)</label><input id="dp-add" type="text" inputmode="numeric" dir="ltr" autocomplete="off"></div><button class="dp-btn" id="dp-addgo" type="button">افزودن</button></div>' +
      '<h3>تنظیم مجموع</h3><div class="dp-row"><div><label for="dp-set">مجموع جدید (تومان)</label><input id="dp-set" type="text" inputmode="numeric" dir="ltr" autocomplete="off"></div><button class="dp-btn alt" id="dp-setgo" type="button">تنظیم</button></div>' +
      '<h3>هدف</h3><label for="dp-title">عنوان</label><input id="dp-title" type="text" maxlength="60" autocomplete="off"><label for="dp-target">مبلغ هدف (تومان)</label><input id="dp-target" type="text" inputmode="numeric" dir="ltr" autocomplete="off">' +
      '<div class="dp-row" style="margin-top:.6rem"><button class="dp-btn" id="dp-goalgo" type="button">ذخیره هدف</button></div></div>' +
      '<div class="dp-msg" id="dp-msg" role="status" aria-live="polite"></div>' +
      '<p class="dp-hint">هر درخواست امضا می‌شود و روی هاب استریم بررسی و اعمال می‌شود؛ عبارت شما هرگز ارسال یا ذخیره نمی‌شود. اگر هاب خاموش باشد هیچ تغییری اعمال نمی‌شود. متن‌ها و لینک‌ها: <a href="' + ADMIN_PAGE + '" target="_blank" rel="noopener">صفحهٔ کامل مدیریت</a>. Esc برای بستن.</p>';
    document.body.appendChild(root);
    ['add', 'set', 'target'].forEach(function (k) { money($(k)); });
    $('x').addEventListener('click', close);
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } else if (e.key === 'Enter' && e.target === $('pw')) onUnlock(); touch(); });
    root.addEventListener('input', touch);
    $('go').addEventListener('click', onUnlock); $('addgo').addEventListener('click', onAdd); $('setgo').addEventListener('click', onSet); $('goalgo').addEventListener('click', onGoal);
  }

  function setBtns(b) { ['go', 'addgo', 'setgo', 'goalgo'].forEach(function (k) { $(k).disabled = b; }); }
  function showGoal(g) {
    if (!g || g.raised == null) return; var pct = g.target > 0 ? Math.round(g.raised / g.target * 1000) / 10 : 0;
    $('now').textContent = 'استریم: ' + fa(fmt(g.raised)) + ' از ' + fa(fmt(g.target)) + ' تومان (' + fa(String(pct)) + '٪)';
    if (document.activeElement !== $('title') && g.title != null) $('title').value = g.title; if (document.activeElement !== $('target')) $('target').value = fmt(g.target);
  }
  function refreshPage(g) { try { if (window.DonateProgress && g.target > 0) window.DonateProgress.render(Math.round(g.raised / g.target * 1000) / 10); if (g.title) { var t = document.getElementById('goalTitle'); if (t) t.textContent = g.title; } } catch (e) {} }

  function onUnlock() {
    var pass = $('pw').value; if (busy) return; if (pass.length < 8) { msg('عبارت مدیریت را وارد کنید.', 'err'); $('pw').focus(); return; }
    busy = true; setBtns(true); msg('در حال بررسی…');
    fetch(ADMIN + '/challenge', { cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); }).then(function (x) {
      if (x.s !== 200 || !x.j.salt) throw { status: x.s };
      offset = (x.j.t || Date.now()) - Date.now();
      return derive(pass, x.j.salt, x.j.iterations);
    }).then(function (k) { hmacKey = k; $('pw').value = ''; pass = ''; return call({ id: opId(), type: 'ping', value: 0 }); }).then(function (x) {
      if (x.s !== 200) { hmacKey = null; msg(explain(x), 'err'); return; }
      $('unlock').hidden = true; $('main').hidden = false; showGoal(x.j); msg('✓ وارد شدید.', 'ok'); touch();
    }).catch(function (e) { hmacKey = null; if (e && e.status) msg(explain({ s: e.status, j: {} }), 'err'); else msg(DOWN, 'err'); }).then(function () { busy = false; setBtns(false); });
  }

  /* send one signed instruction; then confirm the public website followed (the hub pushes the new total after a few seconds) */
  function send(op, label, onDone) {
    if (busy || !hmacKey) return Promise.resolve(); busy = true; setBtns(true); msg('در حال ارسال…');
    return call(op).then(function (x) {
      if (x.s !== 200 || !x.j.ok) { msg(explain(x), 'err'); return null; }
      showGoal(x.j); refreshPage(x.j); if (onDone) onDone();
      msg(x.j.result === 'duplicate' ? 'این دستور قبلاً اعمال شده بود (دوباره شمرده نشد).' : '✓ ' + label + ' — روی استریم اعمال شد. در حال هماهنگی سایت…', x.j.result === 'duplicate' ? 'warn' : 'ok');
      var mine = ++seq; busy = false; setBtns(false); touch(); waitSite(x.j, mine);   // the website confirmation runs in the background and never blocks the next action
      return null;
    }).catch(function () { msg(DOWN, 'err'); return null; }).then(function () { busy = false; setBtns(false); touch(); });
  }
  function waitSite(g, mine) {
    var t0 = Date.now();
    return new Promise(function (resolve) {
      (function poll() {
        fetch(CFG + (CFG.indexOf('?') < 0 ? '?' : '&') + 'x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
          var p = j && j.config && j.config.progress;
          if (mine !== seq) return resolve();   // a newer action replaced this one
          if (p && p.raised === g.raised && p.target === g.target) { msg('✓ سایت و استریم هماهنگ شدند.', 'ok'); return resolve(); }
          if (Date.now() - t0 > CONFIRM_WAIT_MS) { msg('روی استریم اعمال شد؛ سایت چند دقیقهٔ دیگر هماهنگ می‌شود.', 'warn'); return resolve(); }
          setTimeout(poll, CONFIRM_POLL_MS);
        }).catch(function () { if (Date.now() - t0 > CONFIRM_WAIT_MS) return resolve(); setTimeout(poll, CONFIRM_POLL_MS); });
      })();
    });
  }

  function onAdd() {
    var v = num($('add').value); if (!v) { msg('مبلغ را وارد کنید.', 'err'); $('add').focus(); return; }
    if (v > MAX_ADD) { msg('حداکثر ' + fa(fmt(MAX_ADD)) + ' تومان در هر بار.', 'err'); return; }
    send({ id: opId(), type: 'add', value: v }, fa(fmt(v)) + ' تومان افزوده شد', function () { $('add').value = ''; });
  }
  var setArmed = 0;
  function onSet() {
    if (!$('set').value) { msg('مجموع جدید را وارد کنید.', 'err'); $('set').focus(); return; } var v = num($('set').value);
    if (v > MAX_TOTAL) { msg('عدد خیلی بزرگ است.', 'err'); return; }
    if (Date.now() - setArmed > 8000) { setArmed = Date.now(); msg('مجموع به ' + fa(fmt(v)) + ' تغییر می‌کند. برای تأیید دوباره «تنظیم» را بزنید.', 'warn'); return; }
    setArmed = 0; send({ id: opId(), type: 'set', value: v }, 'مجموع ' + fa(fmt(v)) + ' ثبت شد', function () { $('set').value = ''; });
  }
  function onGoal() {
    var title = $('title').value.trim(), target = num($('target').value);
    if (!title || title.length > 60 || /[<>]/.test(title)) { msg('عنوان باید ۱ تا ۶۰ نویسه باشد.', 'err'); return; }
    if (!(target > 0)) { msg('مبلغ هدف را وارد کنید.', 'err'); return; }
    send({ id: opId(), type: 'title', value: title }, 'عنوان ذخیره شد').then(function () { return send({ id: opId(), type: 'target', value: target }, 'هدف ذخیره شد'); });
  }

  function open() { if (!root) build(); root.classList.add('open'); root.setAttribute('aria-hidden', 'false'); touch(); setTimeout(function () { try { root.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} (hmacKey ? $('add') : $('pw')).focus(); }, 30); }
  function close() { if (!root) return; root.classList.remove('open'); root.setAttribute('aria-hidden', 'true'); lock('quiet'); clearTimeout(idleT); msg(''); }
  window.DonatePanel = { open: open, close: close, toggle: function () { if (root && root.classList.contains('open')) close(); else open(); } };
  open();
})();
