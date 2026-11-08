/* DAALVI /donate — renders content.js into the page, draws the pencil oval, optional live progress. No dependencies. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var DEFAULTS = window.DONATE_CONTENT;
  var REMOTE = DEFAULTS.remote && DEFAULTS.remote.enabled ? DEFAULTS.remote.url : '';

  /* merge saved edits over the defaults: same shape, arrays replaced as a whole, unknown keys ignored */
  function merge(base, over) {
    if (over == null) return base;
    if (Array.isArray(base)) return Array.isArray(over) ? over : base;
    if (base && typeof base === 'object') { var o = {}; Object.keys(base).forEach(function (k) { o[k] = merge(base[k], over[k]); }); return o; }
    return typeof over === typeof base ? over : base;
  }
  function safeHref(h) { h = String(h || '').trim(); return /^(https?:\/\/|\/(?!\/))/i.test(h) ? h : ''; }
  function loadRemote() {
    if (!REMOTE) return Promise.resolve(DEFAULTS);
    var t = new Promise(function (r) { setTimeout(function () { r(null); }, 2500); });
    var f = fetch(REMOTE, { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) { return j && j.config ? j.config : null; }).catch(function () { return null; });
    return Promise.race([f, t]).then(function (cfg) { return cfg ? merge(DEFAULTS, cfg) : DEFAULTS; });
  }
  loadRemote().then(start);

  function start(C) {
  var faNum = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  /* ---- text ---- */
  $('goalTitle').textContent = C.goal.title;

  var story = $('story');
  C.sections.forEach(function (s, i) {
    var sec = el('section', 'sec'); sec.setAttribute('aria-labelledby', 'h' + i);
    var h = el('h2', 'sec__h', s.heading); h.id = 'h' + i;
    var body = el('div', 'sec__body');
    s.paragraphs.forEach(function (p) { body.appendChild(el('p', null, p)); });
    sec.appendChild(h); sec.appendChild(body); story.appendChild(sec);
  });

  /* ---- donation options (data-driven). Minimal hand-drawn line icons, chosen by item.icon (or item.id): usd = coin, toman = banknote, crypto = gem. A new option only needs a new entry in content.js. ---- */
  var ICONS = {
    usd: '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3.3c4.8 0 8.6 3.9 8.5 8.6-.1 4.8-3.9 8.7-8.6 8.6-4.8-.1-8.7-3.8-8.6-8.6.1-4.7 3.9-8.6 8.7-8.6z"/><path d="M14.5 9.2c-.4-.9-1.3-1.5-2.5-1.5-1.4 0-2.3.8-2.3 1.8 0 2.4 4.7 1.3 4.7 3.7 0 1-.9 1.9-2.4 1.9-1.2 0-2.2-.6-2.6-1.6M12 6.2v1.5M12 16.2v1.6"/></svg>',
    toman: '<svg viewBox="0 0 24 24" focusable="false"><path d="M3.4 7.3c5-.6 12.2-.6 17.2-.1.3 3.2.3 6.4 0 9.6-5 .6-12.2.6-17.2.1-.3-3.2-.3-6.4 0-9.6z"/><path d="M12 9.3c1.5 0 2.5 1 2.5 2.7s-1 2.7-2.5 2.7-2.5-1-2.5-2.7 1-2.7 2.5-2.7z"/><path d="M6.2 10.2v.1M17.8 13.8v.1"/></svg>',
    crypto: '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3.4l7.4 4.3v8.6L12 20.6l-7.4-4.3V7.7z"/><path d="M12 8.2l3.4 1.9v3.8L12 15.8l-3.4-1.9v-3.8z"/></svg>',
    link: '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 3.4c4.8 0 8.6 3.9 8.5 8.6-.1 4.8-3.9 8.6-8.6 8.6S3.3 16.8 3.4 12c.1-4.7 3.9-8.6 8.6-8.6z"/><path d="M8.5 12h7M12.5 9l3 3-3 3"/></svg>'
  };

  var nav = $('support'), list = el('ul', 'support__list');
  C.donate.filter(function (d) { return d.enabled && safeHref(d.href) && d.label; }).forEach(function (d) {
    var li = el('li'), a = el('a', 'support__link tone-' + (d.tone || 'ink'));
    a.href = safeHref(d.href);
    var ic = el('span', 'support__icon'); ic.setAttribute('aria-hidden', 'true'); ic.innerHTML = ICONS[d.icon || d.id] || ICONS.link; a.appendChild(ic);
    a.appendChild(el('span', 'support__label', d.label));
    if (d.newTab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    li.appendChild(a); list.appendChild(li);
  });
  nav.appendChild(list);

  /* ---- site menu + footer (replace the Wix header/footer on this page; same destinations and social links as daalvi.com) ---- */
  var SITE = 'https://www.daalvi.com';
  function siteHref(h) { h = safeHref(h); return h.charAt(0) === '/' ? SITE + h : h; }       // links open from inside the embed, so a relative path must point at the main site
  function linkEl(l, ext) { var a = el('a', null, l.label); a.href = siteHref(l.href); if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } else a.target = '_top'; return a; }
  var navBox = $('siteNav'), nul = el('ul', 'sitenav__list');
  (C.nav || []).filter(function (l) { return l.label && siteHref(l.href); }).forEach(function (l) { var li = el('li'); li.appendChild(linkEl(l, false)); nul.appendChild(li); });
  navBox.appendChild(nul);

  /* ---- one compact footer: reach-out on one side, socials + signature on the other. ?footer=bar turns it into a slim fixed bar (preview only). ---- */
  var foot = $('foot'), f = C.footer, R = C.reach || {};
  if (/[?&]footer=bar\b/.test(location.search)) document.documentElement.classList.add('foot-bar');
  var reach = el('div', 'foot__col foot__reach');
  if (R.email) {
    var hl = el('a', 'foot__h', R.heading || ''); hl.href = 'mailto:' + R.email; reach.appendChild(hl);
    var ml = el('a', 'foot__mail', R.email); ml.href = 'mailto:' + R.email; reach.appendChild(ml);
  }
  var meta = el('div', 'foot__col foot__meta');
  var ul = el('ul', 'foot__links');
  (f.links || []).concat(f.socials || []).filter(function (l) { return l.label && siteHref(l.href) && l.enabled !== false; }).forEach(function (l) { var li = el('li'); li.appendChild(linkEl(l, true)); ul.appendChild(li); });
  if (ul.children.length) meta.appendChild(ul);
  var legal = el('p', 'foot__legal'); legal.appendChild(el('span', 'foot__sig', f.signature || 'DAALVI'));
  (f.legal || []).forEach(function (t) { legal.appendChild(el('span', 'foot__dot', '·')); legal.appendChild(el('span', null, t)); });
  meta.appendChild(legal);
  foot.appendChild(reach); foot.appendChild(meta);


  /* ---- top supporters: empty state, three small outlined slots (no names, no amounts) ---- */
  (function () {
    var S = C.supporters || {}, box = $('supporters'); if (!box) return;
    var FA = ['۱', '۲', '۳', '۴', '۵'], n = Math.max(1, Math.min(5, S.slots || 3));
    box.appendChild(el('h2', 'sup__h', S.heading || '')).id = 'supH';
    var ol = el('ol', 'slots');
    for (var i = 0; i < n; i++) { var li = el('li', 'slot'); li.innerHTML = ('<span class="slot__n">' + FA[i] + '</span><span class="slot__line" aria-hidden="true"></span>' + (i === 0 ? '<svg class="slot__crown" viewBox="0 0 40 22" aria-hidden="true" focusable="false"><path d="M4 19c8 1.2 24 1.2 32 0M5 18.5L3.6 6.5l8.8 6.6L20 3l7.6 10.1 8.8-6.6L35 18.5"/></svg>' : '')); ol.appendChild(li); }
    box.appendChild(ol);
    if (S.note) box.appendChild(el('p', 'sup__note', S.note));
  })();

  /* ---- hand-drawn outlines for the donation links (drawn in real pixels, so the pen line never stretches) ---- */
  function rng2(seed) { var a = seed >>> 0; return function () { a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
  function handBox(w, h, r, seed, jit) {
    var R = rng2(seed), pts = [], n = 6;
    function side(x0, y0, x1, y1) { for (var i = 0; i < n; i++) { var u = i / n; pts.push([x0 + (x1 - x0) * u + (R() - .5) * jit, y0 + (y1 - y0) * u + (R() - .5) * jit]); } }
    side(r, 0, w - r, 0); pts.push([w - r * .3, r * .08], [w, r * .5]);
    side(w, r, w, h - r); pts.push([w - r * .08, h - r * .3], [w - r * .5, h]);
    side(w - r, h, r, h); pts.push([r * .3, h - r * .08], [0, h - r * .5]);
    side(0, h - r, 0, r); pts.push([r * .08, r * .3], [r * .5, 0], [r + (R() - .5) * 3, (R() - .5) * 2]);
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var i = 0; i < pts.length - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  function drawOutlines() {
    document.querySelectorAll('.support__link, .slot').forEach(function (a, i) {
      var b = a.getBoundingClientRect(), w = Math.round(b.width), h = Math.round(b.height); if (!w) return;
      var s = a.querySelector('svg.hd');
      if (!s) { a.insertAdjacentHTML('afterbegin', '<svg class="hd" aria-hidden="true" focusable="false"><path class="b"/><path class="a"/></svg>'); s = a.querySelector('svg.hd'); }
      s.setAttribute('viewBox', '0 0 ' + w + ' ' + h); s.setAttribute('width', w); s.setAttribute('height', h);
      s.querySelector('.a').setAttribute('d', handBox(w, h, 6, 31 + i * 7, 1.8));
      s.querySelector('.b').setAttribute('d', handBox(w - 3, h - 3, 6, 77 + i * 5, 2.4));
    });
  }
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(function () { drawOutlines(); setTimeout(drawOutlines, 350); });
  window.addEventListener('resize', drawOutlines);

  /* ---- hand-drawn oval: the SAME boiling-lines logic as the streaming Donation Goal widget (goal-model.js is an unmodified copy):
     a set of separately drawn pencil ovals played frame by frame (the line's shape differs in every frame; nothing is rotated or scaled), plus a faint second pass.
     The percentage stays still; only the lines are redrawn. Settings = widget defaults (goal.config.json "boil"). ---- */
  var M = window.GoalModel, BOIL = { frames: 10, fps: 10, intensity: 1.25, secondPass: true, seed: 7 };
  var OV = { cx: 210, cy: 105, rx: 188, ry: 84 };                    // same oval as before (viewBox 420 x 210)
  var frames = M.boilFrames({ count: BOIL.frames, seed: BOIL.seed, intensity: BOIL.intensity }), boilIdx = 0, lastBoil = -1e9;
  var elA = $('ovalPencilA'), elB = $('ovalPencilB'), elP = $('ovalProgress');
  var still = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function drawOval() {
    var f = frames[boilIdx], g = frames[(boilIdx + Math.ceil(frames.length / 2)) % frames.length];
    elA.setAttribute('d', M.boilPath(f, OV)); elA.style.strokeWidth = (1.7 * f.width / 2.45).toFixed(2);   // the pen line is a little thicker or thinner in every drawing, as in the widget
    if (BOIL.secondPass) elB.setAttribute('d', M.boilPath(g, { cx: OV.cx, cy: OV.cy, rx: OV.rx * 0.985, ry: OV.ry * 0.985 }));
  }
  var dBase = M.boilPath(frames[0], OV); elP.setAttribute('d', dBase);   // the sage progress stroke rides on a fixed base drawing
  drawOval();
  function boilLoop(now) {
    if (now - lastBoil >= 1000 / BOIL.fps) { lastBoil = now; boilIdx = (boilIdx + 1) % frames.length; drawOval(); }
    requestAnimationFrame(boilLoop);
  }
  if (!still) requestAnimationFrame(boilLoop);

  /* ---- progress ---- */
  var oval = $('goalOval'), pctEl = $('goalPct'), prog = $('ovalProgress');
  function renderProgress(percent) {
    if (typeof percent !== 'number' || !isFinite(percent)) return renderEmpty();
    var p = Math.max(0, Math.min(100, percent));
    prog.style.strokeDasharray = p + ' 100';
    prog.style.opacity = p > 0 ? '1' : '0';
    var shown = faNum.format(Math.round(p * 10) / 10);
    pctEl.innerHTML = '';
    pctEl.appendChild(document.createTextNode(shown));
    pctEl.appendChild(el('span', 'goal__sign', '٪'));
    oval.setAttribute('aria-label', shown + ' درصد');
    oval.classList.remove('is-empty'); oval.classList.add('is-live');
  }
  function renderEmpty() {
    pctEl.textContent = ''; prog.style.opacity = '0'; oval.removeAttribute('aria-label');
    oval.setAttribute('role', 'presentation');
    oval.classList.add('is-empty'); oval.classList.remove('is-live');
  }
  function pull() {
    var P = C.progress;
    fetch(P.endpoint, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (j) { var g = j && j.goal; renderProgress(g && typeof g.percent === 'number' ? g.percent : NaN); })
      .catch(renderEmpty);
  }
  renderEmpty();
  if (C.progress && C.progress.enabled) {
    if (C.progress.mode === 'hub') { pull(); setInterval(pull, Math.max(30, C.progress.refreshSeconds || 120) * 1000); }
    else if (C.progress.target > 0) renderProgress(Math.round(C.progress.raised / C.progress.target * 1000) / 10);   // manual: edited in the admin panel
  }
  window.DonateProgress = { render: renderProgress, empty: renderEmpty };   // handy for layout tests

  requestAnimationFrame(function () { document.documentElement.classList.add('ready'); });
  }
})();
