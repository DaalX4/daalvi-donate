/* DAALVI /donate — hidden admin panel. Loaded ONLY when the admin presses Ctrl+Shift+E (regular visitors never download this file).
   Slides in from the left. Security = the Wix admin password (checked by the website's own server function); hiding the shortcut is not a lock.
   Amounts are never written to the website directly: the panel queues a small instruction (config.adminOps); the stream hub applies it to the ledger
   (single source of truth, idempotent by instruction id) and pushes the new total back, so website and stream always show the same numbers. */
(function () {
  'use strict';
  if (window.DonatePanel) return;
  var CFG = (window.DONATE_CONTENT && window.DONATE_CONTENT.remote && window.DONATE_CONTENT.remote.url) || 'https://www.daalvi.com/_functions/donateConfig';
  var ADMIN_PAGE = 'admin.html', MAX_ADD = 20000000, MAX_TOTAL = 1000000000, POLL_MS = 3000, WAIT_MS = 90000, IDLE_MS = 5 * 60000;
  var pw = '', cfg = null, busy = false, idleT = null, root, $ = function (id) { return document.getElementById('dp-' + id); };

  var FA = '۰۱۲۳۴۵۶۷۸۹';
  function num(v) { var d = String(v == null ? '' : v).replace(/[۰-۹]/g, function (c) { return String(c.charCodeAt(0) - 0x06F0); }).replace(/[٠-٩]/g, function (c) { return String(c.charCodeAt(0) - 0x0660); }).replace(/\D/g, ''); return d ? parseInt(d, 10) : 0; }
  function fmt(n) { return String(Math.max(0, Math.round(+n || 0))).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function fa(s) { return String(s).replace(/[0-9]/g, function (d) { return FA[+d]; }); }
  function money(el) {
    el.addEventListener('input', function () {
      var raw = String(el.value), caret = el.selectionStart == null ? raw.length : el.selectionStart, digits = /[0-9۰-۹٠-٩]/;
      var before = raw.slice(0, caret).replace(/[^0-9۰-۹٠-٩]/g, '').length;
      el.value = digits.test(raw) ? fmt(num(raw)) : '';
      var pos = 0, seen = 0; while (pos < el.value.length && seen < before) { if (/\d/.test(el.value.charAt(pos))) seen++; pos++; }
      try { el.setSelectionRange(pos, pos); } catch (e) {}
    });
  }
  function rid() { var a = new Uint8Array(8); (window.crypto || window.msCrypto).getRandomValues(a); return 'p' + Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); }
  function msg(t, cls) { var m = $('msg'); m.textContent = t || ''; m.className = 'dp-msg' + (cls ? ' ' + cls : ''); }
  function touch() { clearTimeout(idleT); idleT = setTimeout(function () { pw = ''; $('pw').value = ''; msg('به‌خاطر بی‌فعالیتی رمز پاک شد.', 'warn'); }, IDLE_MS); }

  function build() {
    var css = document.createElement('style');
    css.textContent = [
      '#dp{position:absolute;top:0;left:0;z-index:99999;width:min(23rem,100%);box-sizing:border-box;max-height:100vh;overflow:auto;padding:1.1rem 1.1rem 1.4rem;background:var(--paper,#f4ead6);color:var(--ink,#10231a);',
      'font:15px/1.7 var(--f-text,Vazirmatn,Tahoma,sans-serif);border-right:1px solid var(--kraft,#c8a97c);box-shadow:6px 0 24px rgba(16,35,26,.18);transform:translateX(-105%);transition:transform .22s ease;direction:rtl;text-align:right}',
      '#dp.open{transform:none}@media (prefers-reduced-motion:reduce){#dp{transition:none}}',
      '#dp *{box-sizing:border-box}#dp h2{margin:0;font:400 1.5rem var(--f-display,DigiSarve,Vazirmatn,sans-serif)}#dp h3{margin:1.1rem 0 .3rem;font-size:.95rem;font-weight:700;color:var(--ink-soft,#33443a)}',
      '#dp .dp-top{display:flex;align-items:center;justify-content:space-between;gap:.5rem}#dp .dp-x{border:0;background:none;font-size:1.3rem;cursor:pointer;color:var(--ink,#10231a);padding:.2rem .5rem}',
      '#dp label{display:block;font-size:.85rem;color:var(--ink-mute,#5a6657);margin:.5rem 0 .15rem}#dp input[type=text],#dp input[type=password]{width:100%;font:inherit;padding:.45rem .6rem;border:1px solid var(--kraft,#c8a97c);border-radius:.4rem;background:#fffaf0;color:inherit}',
      '#dp input[dir=ltr]{text-align:left}#dp input:focus-visible,#dp button:focus-visible{outline:2px solid var(--edge,#163422);outline-offset:2px}',
      '#dp .dp-row{display:flex;gap:.5rem;align-items:flex-end}#dp .dp-row>div{flex:1}#dp .dp-btn{font:inherit;font-weight:700;padding:.45rem .9rem;border:1px solid var(--edge,#163422);border-radius:.4rem;background:var(--edge,#163422);color:#f4ead6;cursor:pointer;white-space:nowrap}',
      '#dp .dp-btn.alt{background:transparent;color:var(--edge,#163422)}#dp .dp-btn:disabled{opacity:.5;cursor:wait}#dp .dp-now{margin:.6rem 0 0;padding:.5rem .7rem;border:1px dashed var(--kraft,#c8a97c);border-radius:.4rem;font-size:.9rem;color:var(--ink-soft,#33443a)}',
      '#dp .dp-msg{min-height:1.6em;margin-top:.9rem;font-size:.9rem}#dp .dp-msg.ok{color:#1f5a2e}#dp .dp-msg.err{color:#8a2418}#dp .dp-msg.warn{color:#7a5a12}#dp .dp-hint{font-size:.78rem;color:var(--ink-mute,#5a6657);margin:.5rem 0 0}',
      '#dp a{color:var(--edge,#163422)}#dp .dp-chk{display:flex;gap:.5rem;align-items:center;margin:.6rem 0 0;font-size:.9rem;color:var(--ink-soft,#33443a)}'
    ].join('');
    document.head.appendChild(css);
    root = document.createElement('aside'); root.id = 'dp'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'پنل مدیریت'); root.setAttribute('aria-hidden', 'true');
    root.innerHTML =
      '<div class="dp-top"><h2>پنل مدیریت</h2><button class="dp-x" id="dp-x" type="button" aria-label="بستن">✕</button></div>' +
      '<label for="dp-pw">رمز مدیریت</label><input id="dp-pw" type="password" dir="ltr" autocomplete="off">' +
      '<div class="dp-now" id="dp-now" aria-live="polite">در حال خواندن…</div>' +
      '<h3>افزودن حمایت آفلاین</h3><div class="dp-row"><div><label for="dp-add">مبلغ (تومان)</label><input id="dp-add" type="text" inputmode="numeric" dir="ltr" autocomplete="off"></div><button class="dp-btn" id="dp-addgo" type="button">افزودن</button></div>' +
      '<h3>تنظیم مجموع</h3><div class="dp-row"><div><label for="dp-set">مجموع جدید (تومان)</label><input id="dp-set" type="text" inputmode="numeric" dir="ltr" autocomplete="off"></div><button class="dp-btn alt" id="dp-setgo" type="button">تنظیم</button></div>' +
      '<h3>هدف</h3><label for="dp-title">عنوان</label><input id="dp-title" type="text" maxlength="60" autocomplete="off"><label for="dp-target">مبلغ هدف (تومان)</label><input id="dp-target" type="text" inputmode="numeric" dir="ltr" autocomplete="off">' +
      '<label class="dp-chk"><input id="dp-show" type="checkbox"> نمایش درصد در صفحه</label><div class="dp-row" style="margin-top:.6rem"><button class="dp-btn" id="dp-goalgo" type="button">ذخیره هدف</button></div>' +
      '<div class="dp-msg" id="dp-msg" role="status" aria-live="polite"></div>' +
      '<p class="dp-hint">مبلغ‌ها از طریق هاب استریم اعمال می‌شوند تا سایت و استریم همیشه یکی بمانند (تا ۳۰ ثانیه؛ هاب باید روشن باشد). برای متن‌ها و لینک‌ها: <a href="' + ADMIN_PAGE + '" target="_blank" rel="noopener">صفحهٔ کامل مدیریت</a>. Esc برای بستن.</p>';
    document.body.appendChild(root);
    ['add', 'set', 'target'].forEach(function (k) { money($(k)); });
    $('x').addEventListener('click', close);
    root.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } touch(); });
    root.addEventListener('input', touch);
    $('pw').addEventListener('input', function () { pw = $('pw').value; });
    $('addgo').addEventListener('click', onAdd); $('setgo').addEventListener('click', onSet); $('goalgo').addEventListener('click', onGoal);
  }

  /* ---- website config (public GET, password-protected POST: the same Wix function the admin page uses) ---- */
  function readCfg() { return fetch(CFG + (CFG.indexOf('?') < 0 ? '?' : '&') + 'x=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) { if (!j || !j.config || !j.config.progress) throw new Error('config'); return j.config; }); }
  function writeCfg(next) {
    return fetch(CFG, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=UTF-8' }, body: JSON.stringify({ password: pw, config: next }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); });
  }
  function showNow(c) {
    var p = c.progress || {}, raised = +p.raised || 0, target = +p.target || 0, pct = target > 0 ? Math.round(raised / target * 1000) / 10 : 0;
    $('now').textContent = 'همین حالا: ' + fa(fmt(raised)) + ' از ' + fa(fmt(target)) + ' تومان (' + fa(String(pct)) + '٪)' + ((c.adminOps && c.adminOps.length) ? ' — ' + fa(String(c.adminOps.length)) + ' دستور در صف' : '');
    if (document.activeElement !== $('title')) $('title').value = (c.goal && c.goal.title) || '';
    if (document.activeElement !== $('target')) $('target').value = fmt(target);
    $('show').checked = !!p.enabled;
  }
  function refreshPage(c) {   // redraw the oval without a reload
    try { var p = c.progress || {}; if (window.DonateProgress && p.enabled && p.target > 0) window.DonateProgress.render(Math.round(p.raised / p.target * 1000) / 10); var t = document.getElementById('goalTitle'); if (t && c.goal && c.goal.title) t.textContent = c.goal.title; } catch (e) {}
  }
  function load() { return readCfg().then(function (c) { cfg = c; showNow(c); return c; }).catch(function () { $('now').textContent = 'خواندن تنظیمات ممکن نشد.'; throw 0; }); }

  /* send: read -> add instructions / website-only fields -> write -> wait until the hub has applied them */
  function send(ops, site, label, onSent) {
    if (busy) return; if (!pw) { msg('رمز را وارد کنید.', 'err'); $('pw').focus(); return; }
    busy = true; setBtns(true); msg('در حال ارسال…');
    readCfg().then(function (c) {
      var next = JSON.parse(JSON.stringify(c)); if (site) site(next);
      if (ops.length) next.adminOps = (Array.isArray(c.adminOps) ? c.adminOps : []).concat(ops).slice(-20);
      return writeCfg(next);
    }).then(function (x) {
      if (x.s === 401) { msg('رمز اشتباه است.', 'err'); return; }
      if (x.s !== 200 || !x.j.ok) { msg('ذخیره نشد (' + fa(String(x.s)) + '). دوباره تلاش کنید.', 'err'); return; }
      if (onSent) onSent();   // clear the input only once the website accepted it
      if (!ops.length) { msg('✓ ذخیره شد.', 'ok'); return load().then(refreshPage); }
      msg('ارسال شد؛ منتظر اعمال روی استریم…'); return waitApplied(ops.map(function (o) { return o.id; }), label);
    }).catch(function () { msg('اتصال برقرار نشد.', 'err'); }).then(function () { busy = false; setBtns(false); });
  }
  function waitApplied(ids, label) {
    var t0 = Date.now();
    return new Promise(function (resolve) {
      (function poll() {
        readCfg().then(function (c) {
          showNow(c); var left = (c.adminOps || []).filter(function (o) { return ids.indexOf(o.id) >= 0; }).length;
          if (!left) { cfg = c; refreshPage(c); msg('✓ ' + label + ' — سایت و استریم هماهنگ شدند.', 'ok'); return resolve(); }
          if (Date.now() - t0 > WAIT_MS) { msg('هنوز اعمال نشده: هاب خاموش است یا قطع شده. دستور در صف می‌ماند و بعداً فقط یک‌بار اعمال می‌شود.', 'warn'); return resolve(); }
          setTimeout(poll, POLL_MS);
        }).catch(function () { setTimeout(poll, POLL_MS); });
      })();
    });
  }
  function setBtns(b) { ['addgo', 'setgo', 'goalgo'].forEach(function (k) { $(k).disabled = b; }); }

  function onAdd() {
    var v = num($('add').value); if (!v) { msg('مبلغ را وارد کنید.', 'err'); $('add').focus(); return; }
    if (v > MAX_ADD) { msg('حداکثر ' + fa(fmt(MAX_ADD)) + ' تومان در هر بار.', 'err'); return; }
    send([{ id: rid(), type: 'add', value: v, ts: Date.now() }], null, fa(fmt(v)) + ' تومان افزوده شد', function () { $('add').value = ''; });
  }
  var setArmed = 0;
  function onSet() {
    var v = num($('set').value); if (!$('set').value) { msg('مجموع جدید را وارد کنید.', 'err'); $('set').focus(); return; }
    if (v > MAX_TOTAL) { msg('عدد خیلی بزرگ است.', 'err'); return; }
    var cur = cfg && cfg.progress ? +cfg.progress.raised || 0 : 0;
    if (Date.now() - setArmed > 8000) { setArmed = Date.now(); msg('مجموع از ' + fa(fmt(cur)) + ' به ' + fa(fmt(v)) + ' تغییر می‌کند. برای تأیید دوباره «تنظیم» را بزنید.', 'warn'); return; }
    setArmed = 0; send([{ id: rid(), type: 'set', value: v, ts: Date.now() }], null, 'مجموع ' + fa(fmt(v)) + ' ثبت شد', function () { $('set').value = ''; });
  }
  function onGoal() {
    var title = $('title').value.trim(), target = num($('target').value), show = $('show').checked;
    if (!title || title.length > 60 || /[<>]/.test(title)) { msg('عنوان باید ۱ تا ۶۰ نویسه باشد.', 'err'); return; }
    if (!(target > 0)) { msg('مبلغ هدف را وارد کنید.', 'err'); return; }
    var ops = [], p = cfg && cfg.progress ? cfg.progress : {};
    if (title !== ((cfg && cfg.goal && cfg.goal.title) || '')) ops.push({ id: rid(), type: 'title', value: title, ts: Date.now() });
    if (target !== (+p.target || 0)) ops.push({ id: rid(), type: 'target', value: target, ts: Date.now() });
    send(ops, function (n) { n.goal = n.goal || {}; n.goal.title = title; n.progress.target = target; n.progress.enabled = show; }, 'هدف ذخیره شد');
  }

  function open() { if (!root) build(); root.classList.add('open'); root.setAttribute('aria-hidden', 'false'); touch(); load().then(refreshPage).catch(function () {}); setTimeout(function () { try { root.scrollIntoView({ block: 'nearest', inline: 'nearest' }); } catch (e) {} $('pw').focus(); }, 30); }
  function close() { if (!root) return; root.classList.remove('open'); root.setAttribute('aria-hidden', 'true'); pw = ''; $('pw').value = ''; clearTimeout(idleT); msg(''); }
  window.DonatePanel = { open: open, close: close, toggle: function () { if (root && root.classList.contains('open')) close(); else open(); } };
  open();
})();
