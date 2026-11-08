'use strict';
// Donation Goal (paper): pure logic, no DOM. Works in the browser (window.GoalModel) and in Node (tests).
(function (root, factory) { if (typeof module === 'object' && module.exports) module.exports = factory(); else root.GoalModel = factory(); })(typeof self !== 'undefined' ? self : this, function () {
  const FA = '۰۱۲۳۴۵۶۷۸۹';
  const toFaDigits = s => String(s).replace(/[0-9]/g, d => FA[+d]);
  const fromFaDigits = s => String(s).replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x06F0)).replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x0660));

  // 7800000 -> "۷,۸۰۰,۰۰۰" (Persian digits, comma grouping like the approved reference). Negative, NaN and infinity become 0.
  function formatAmount(n, { digits = 'fa', sep = ',' } = {}) {
    n = Math.round(Number(n)); if (!Number.isFinite(n) || n < 0) n = 0;
    const s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return digits === 'fa' ? toFaDigits(s) : s;
  }

  // Goal numbers -> what the card shows. `exact` is the fractional percent (drives the bar), `shown` the whole number in the oval:
  // it never shows 100 until the goal is really reached, and never shows more than 100.
  function progress(raised, target) {
    raised = Number(raised); target = Number(target);
    if (!Number.isFinite(raised) || raised < 0) raised = 0;
    if (!Number.isFinite(target) || target <= 0) return { raised, target: 0, exact: 0, shown: 0, done: false };
    const exact = Math.min(100, (raised / target) * 100), done = raised >= target;
    return { raised, target, exact, shown: done ? 100 : Math.min(99, Math.floor(exact)), done };
  }

  const easeOutCubic = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  const easeInOutSine = t => -(Math.cos(Math.PI * Math.min(1, Math.max(0, t))) - 1) / 2;
  const lerp = (a, b, t) => a + (b - a) * t;

  // small deterministic generator (same family as the paper chat) so the hand-drawn shapes are the same on every load
  function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---- the hand-drawn oval as BOILING LINES (frame-by-frame animation) ----
  // A set of different pencil ovals, each drawn separately: the pen starts and ends at different places, the curve wanders differently, the ends cross at different
  // radii, the line is a little thicker or thinner. Playing them one after another (8-12 per second) makes the ink look as if it is redrawn all the time.
  // Nothing is rotated, moved or scaled as a whole: the SHAPE of the line is different in every frame. Deterministic (seeded) and cheap: 10 arrays of numbers.
  function boilFrames({ count = 10, seed = 7, intensity = 1 } = {}) {
    count = Math.max(2, Math.min(24, Math.round(+count) || 10)); intensity = Math.max(0, Math.min(3, +intensity || 0));
    const frames = [], limit = boilBound(intensity);
    for (let i = 0; i < count; i++) {
      const r = rng((seed * 7919 + i * 104729 + 17) >>> 0);
      const A = [(0.020 + r() * 0.008) * intensity, (0.012 + r() * 0.006) * intensity, (0.006 + r() * 0.004) * intensity];          // slow bend, medium wobble, small unevenness (relative to the radius)
      const k = [1 + Math.floor(r() * 2), 2 + Math.floor(r() * 2), 4 + Math.floor(r() * 3)], ph = [r() * 6.283, r() * 6.283, r() * 6.283];
      const n = 88, tremor = []; let t = 0; for (let j = 0; j <= n; j++) { t = t * 0.55 + (r() - 0.5) * 0.011 * intensity; tremor.push(t); }   // the shake of a hand, smoothed
      const f = { i, n, start: -2.55 + r() * 1.15, overlap: 0.3 + r() * 0.38, A, k, ph, tremor, sx: 1 + (r() - 0.5) * 0.024 * intensity, sy: 1 + (r() - 0.5) * 0.042 * intensity, endGap: (r() - 0.5) * 0.06 * intensity, startGap: (r() - 0.5) * 0.05 * intensity, width: 2.0 + r() * 0.9 };
      for (let pass = 0; pass < 8 && boilInward(f) > limit; pass++) {                                   // a frame that would pull the line too far toward the digits is calmed down until it fits the limit
        for (let m = 0; m < 3; m++) f.A[m] *= 0.85; for (let j = 0; j <= n; j++) f.tremor[j] *= 0.85; f.endGap *= 0.85; f.startGap *= 0.85; f.sx = 1 + (f.sx - 1) * 0.85; f.sy = 1 + (f.sy - 1) * 0.85;
      }
      frames.push(f);
    }
    return frames;
  }
  // Radial factor of a frame at point j (1 = exactly on the ellipse), shared by the drawing and by the safety check.
  function boilFactor(f, j) {
    const u = j / f.n, th = f.start + u * (Math.PI * 2 + f.overlap);
    let rel = f.tremor[j]; for (let m = 0; m < 3; m++) rel += f.A[m] * Math.sin(th * f.k[m] + f.ph[m]);
    rel += f.endGap * u * u * u + f.startGap * (1 - u) * (1 - u) * (1 - u);                              // the pen drifts as it comes round, so the two ends cross at different radii
    return { th, k: 1 + rel };
  }
  // how far (fraction of the radius) a frame pulls the line inward at its worst point
  function boilInward(f) { let m = 1; for (let j = 0; j <= f.n; j++) { const { th, k } = boilFactor(f, j); m = Math.min(m, k * Math.hypot(f.sx * Math.cos(th), f.sy * Math.sin(th))); } return 1 - m; }
  // The most (as a fraction of the radius) any boil frame can pull the line inward (enforced in boilFrames): used to size the oval so the line stays clear of the digits in every frame.
  const boilBound = intensity => 0.085 * Math.max(0, +intensity || 0);

  // Catmull-Rom through the points -> cubic Bezier path string
  function smoothPath(pts) {
    let d = 'M' + pts[0][0].toFixed(2) + ' ' + pts[0][1].toFixed(2);
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      d += ' C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + ' ' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + ' ' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) + ' ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2);
    }
    return d;
  }
  // One frame -> SVG path for an oval of radii rx, ry around (cx, cy). tilt is a fixed slight lean of the whole drawing (the same in every frame).
  function boilPath(f, { cx, cy, rx, ry, tilt = -1.2 }) {
    const rad = tilt * Math.PI / 180, pts = [];
    for (let j = 0; j <= f.n; j++) {
      const { th, k } = boilFactor(f, j), x0 = rx * f.sx * k * Math.cos(th), y0 = ry * f.sy * k * Math.sin(th);
      pts.push([cx + x0 * Math.cos(rad) - y0 * Math.sin(rad), cy + x0 * Math.sin(rad) + y0 * Math.cos(rad)]);
    }
    return smoothPath(pts);
  }

  // Masking tape with small torn teeth on both short ends. Coordinates in px of the tape box (w x h). Deterministic.
  function tapePolygon(w, h, seed = 11, { tooth = 5, depth = 3.2 } = {}) {
    const r = rng(seed), pts = [], steps = Math.max(6, Math.round(h / tooth));
    for (let i = 0; i <= steps; i++) pts.push([r() * depth * (i % 2 ? 1 : 0.35), (h * i) / steps]);                                  // left end, top -> bottom
    for (let i = steps; i >= 0; i--) pts.push([w - r() * depth * (i % 2 ? 1 : 0.35), (h * i) / steps]);                              // right end, bottom -> top
    return 'polygon(' + pts.map(p => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(', ') + ')';
  }

  // Torn paper outline as a CSS polygon (px). Walks the perimeter and pushes each point inward by: fine fibre jitter + a slow undulation + a few small "bites" where a
  // piece tore away + a gentle random drift, all seeded, so the same card is cut the same way every time. Never goes outside the box.
  function organicPolygon(w, h, seed = 41, { amp = 3.6, step = 6.5, wave = 3.2, bites = 4, inset = 0 } = {}) {
    const r = rng(seed), P = 2 * (w + h), biteList = [];
    for (let i = 0; i < bites; i++) biteList.push({ at: r() * P, wid: 22 + r() * 34, depth: 4 + r() * 6 });
    const p1 = r() * 6.28, p2 = r() * 6.28, f1 = 5 + r() * 3, f2 = 11 + r() * 5, pts = [];
    let drift = 0, s = 0;
    while (s < P) {
      drift = Math.max(-amp, Math.min(amp, drift + (r() - 0.5) * amp * 0.55));
      let d = inset + Math.abs(r() - 0.5) * amp * 1.3 + (drift + amp) * 0.35 + wave * (0.5 + 0.5 * Math.sin(s / P * 6.283 * f1 + p1)) * 0.6 + wave * 0.4 * (0.5 + 0.5 * Math.sin(s / P * 6.283 * f2 + p2));
      for (const b of biteList) { const dist = Math.min(Math.abs(s - b.at), P - Math.abs(s - b.at)); if (dist < b.wid) d += b.depth * Math.exp(-(dist * dist) / (2 * (b.wid / 2.6) ** 2)); }
      const cs = [0, w, w + h, 2 * w + h], cd = Math.min(...cs.map(c => Math.min(Math.abs(s - c), P - Math.abs(s - c))));   // near a corner both sides must agree, or a thin spike appears
      if (cd < 16) { const k = cd / 16; d = d * k + (inset + amp * 0.9 + wave * 0.5) * (1 - k); }
      d = Math.max(0, Math.min(d, 18));
      let x, y;
      const cl = (v, lo, hi) => Math.min(Math.max(v, lo), hi);                                  // each side stops where the next one begins, so corners join cleanly (no spikes)
      if (s < w) { x = cl(s, d, w - d); y = d; } else if (s < w + h) { x = w - d; y = cl(s - w, d, h - d); } else if (s < 2 * w + h) { x = cl(w - (s - w - h), d, w - d); y = h - d; } else { x = d; y = cl(h - (s - 2 * w - h), d, h - d); }
      pts.push([Math.max(0, Math.min(w, x)), Math.max(0, Math.min(h, y))]);
      s += step * (0.7 + r() * 0.6);
    }
    return 'polygon(' + pts.map(p => p[0].toFixed(1) + 'px ' + p[1].toFixed(1) + 'px').join(', ') + ')';
  }

  return { toFaDigits, fromFaDigits, formatAmount, progress, easeOutCubic, easeInOutSine, lerp, rng, boilFrames, boilBound, boilPath, tapePolygon, organicPolygon };
});
