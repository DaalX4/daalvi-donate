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

  /* ---- site menu + footer (replace the Wix header/footer on this page; same destinations and social links as daalvi.com) ---- */
  var SITE = 'https://www.daalvi.com';
  function siteHref(h) { h = safeHref(h); return h.charAt(0) === '/' ? SITE + h : h; }       // links open from inside the embed, so a relative path must point at the main site
  function linkEl(l, ext) { var a = el('a', null, l.label); a.href = siteHref(l.href); if (ext) { a.target = '_blank'; a.rel = 'noopener noreferrer'; } else a.target = '_top'; return a; }
  var navBox = $('siteNav'), nul = el('ul', 'sitenav__list');
  (C.nav || []).filter(function (l) { return l.label && siteHref(l.href); }).forEach(function (l) { var li = el('li'); li.appendChild(linkEl(l, false)); nul.appendChild(li); });
  navBox.appendChild(nul);

  var foot = $('foot'), f = C.footer;
  var sig = linkEl({ label: f.signature, href: f.home.href || SITE }, false); sig.className = 'foot__sig'; sig.setAttribute('aria-label', f.home.label);
  foot.appendChild(sig);
  var ul = el('ul', 'foot__links');
  (f.links || []).concat(f.socials || []).filter(function (l) { return l.label && siteHref(l.href) && l.enabled !== false; }).forEach(function (l) { var li = el('li'); li.appendChild(linkEl(l, true)); ul.appendChild(li); });
  if (ul.children.length) foot.appendChild(ul);
  var legal = el('p', 'foot__legal'); (f.legal || []).forEach(function (t, i) { if (i) legal.appendChild(document.createElement('br')); legal.appendChild(document.createTextNode(t)); });
  if (legal.firstChild) foot.appendChild(legal);

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
