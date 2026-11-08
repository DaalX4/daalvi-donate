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

  /* ---- donation options (data-driven) ---- */
  var nav = $('support'), list = el('ul', 'support__list');
  C.donate.filter(function (d) { return d.enabled && safeHref(d.href) && d.label; }).forEach(function (d) {
    var li = el('li'), a = el('a', 'support__link tone-' + (d.tone || 'ink'));
    a.href = safeHref(d.href); a.appendChild(el('span', 'support__label', d.label));
    a.insertAdjacentHTML('beforeend', '<svg class="support__arrow" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8.5 7H17v8.5"/></svg>');
    if (d.newTab) { a.target = '_blank'; a.rel = 'noopener noreferrer'; }
    li.appendChild(a); list.appendChild(li);
  });
  nav.appendChild(list);

  /* ---- footer ---- */
  var foot = $('foot'), f = C.footer;
  var sig = el('a', 'foot__sig', f.signature); sig.href = safeHref(f.home.href) || '/'; sig.setAttribute('aria-label', f.home.label); sig.target = '_top'; sig.target = '_top';
  foot.appendChild(sig);
  var ul = el('ul', 'foot__links');
  f.links.filter(function (l) { return l.enabled && safeHref(l.href); }).forEach(function (l) {
    var li = el('li'), a = el('a', null, l.label); a.href = safeHref(l.href); a.target = '_blank'; a.rel = 'noopener noreferrer'; li.appendChild(a); ul.appendChild(li);
  });
  if (ul.children.length) foot.appendChild(ul);

  /* ---- hand-drawn oval: seeded wobble, two pencil passes + sage progress stroke on the same path ---- */
  function rng(seed) { return function () { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }; }
  function ovalPath(seed, wob, rot) {
    var r = rng(seed), n = 14, pts = [], cx = 210, cy = 105, rx = 188, ry = 84;
    var start = -Math.PI / 2 + rot;                 // starts at the top; the sage stroke grows from there
    for (var i = 0; i < n; i++) {
      var a = start + (i / n) * Math.PI * 2 * 1.0;
      var k = 1 + (r() - .5) * wob;
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k * 1.02]);
    }
    // close with a small overshoot so it reads as a pencil loop
    var a2 = start + Math.PI * 2 + .12, k2 = 1 + (r() - .5) * wob;
    pts.push([cx + Math.cos(a2) * rx * k2 * 1.01, cy + Math.sin(a2) * ry * k2]);
    // Catmull-Rom -> cubic bezier
    var d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
    for (var j = 0; j < pts.length - 1; j++) {
      var p0 = pts[Math.max(j - 1, 0)], p1 = pts[j], p2 = pts[j + 1], p3 = pts[Math.min(j + 2, pts.length - 1)];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + ' ' +
        (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + ' ' + p2[0].toFixed(1) + ' ' + p2[1].toFixed(1);
    }
    return d;
  }
  var dA = ovalPath(11, .07, 0), dB = ovalPath(29, .09, .05);
  $('ovalPencilA').setAttribute('d', dA); $('ovalPencilB').setAttribute('d', dB); $('ovalProgress').setAttribute('d', dA);

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
