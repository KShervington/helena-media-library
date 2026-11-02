/* GML core — shared runtime for library components and compositions.
   Classic script (works from file:// without a server). Load it first.
   Everything here is a pure helper: a composition's frame is render(t). */
(function () {
  const GML = (window.GML = window.GML || {});

  // ---------- math + easing ----------
  const cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const seg = (t, a, b) => cl((t - a) / (b - a));          // 0→1 progress of t across [a, b]
  const lerp = (a, b, x) => a + (b - a) * x;
  const ease = {
    o3: (x) => 1 - Math.pow(1 - x, 3),
    o5: (x) => 1 - Math.pow(1 - x, 5),
    i3: (x) => x * x * x,
    io: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
    back: (x) => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); },
  };
  const hash = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

  /** Keyframes: kf(t, [[t0, v0], [t1, v1], ...], easeFn) → interpolated value. */
  function kf(t, keys, e = ease.io) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      if (t <= keys[i][0]) return lerp(keys[i - 1][1], keys[i][1], e(seg(t, keys[i - 1][0], keys[i][0])));
    }
    return keys[keys.length - 1][1];
  }

  /**
   * Beat grid in VIDEO time. Two forms:
   *   grid({ beat: 0.5171, anchorSong: 33.52, songStart: 29.36 })            constant tempo
   *   grid({ beats: map.beats, anchorIndex: map.anchor_index, songStart })    beat list from beat-map.py (follows tempo drift)
   *   g.at(k)      → video time of beat k (k = 0 at the anchor downbeat, negative before it; fractional k = in-between, e.g. 8.5)
   *   g.k(t)       → index of the most recent beat at video time t
   *   g.pulse(t, kFrom, kTo, decay) → 1 on each beat in [kFrom, kTo], decaying; downbeats ×1.4
   */
  function grid({ beat, anchorSong, beats, anchorIndex, songStart = 0, beatsPerBar = 4 }) {
    let at, k;
    if (beats) {
      const n = beats.length, p0 = beats[1] - beats[0], p1 = beats[n - 1] - beats[n - 2];
      const atInt = (kk) => {
        const i = anchorIndex + kk;
        if (i < 0) return beats[0] + i * p0 - songStart;
        if (i >= n) return beats[n - 1] + (i - n + 1) * p1 - songStart;
        return beats[i] - songStart;
      };
      // fractional beats (k = 8.5, 10.25 …) interpolate between the two surrounding beats
      at = (kk) => { const lo = Math.floor(kk), f = kk - lo; return f ? atInt(lo) + f * (atInt(lo + 1) - atInt(lo)) : atInt(lo); };
      k = (t) => {
        const s = t + songStart;
        if (s < beats[0]) return Math.floor((s - beats[0]) / p0) - anchorIndex;
        let lo = 0, hi = n - 1;
        while (lo < hi) { const m = (lo + hi + 1) >> 1; if (beats[m] <= s) lo = m; else hi = m - 1; }
        if (s >= beats[n - 1]) return n - 1 + Math.floor((s - beats[n - 1]) / p1) - anchorIndex;
        return lo - anchorIndex;
      };
      beat = (at(4) - at(0)) / 4;  // local beat length at the anchor
    } else {
      const D = anchorSong - songStart;
      at = (kk) => D + beat * kk;
      k = (t) => Math.floor((t - D) / beat);
    }
    const pulse = (t, kFrom = -Infinity, kTo = Infinity, decay = 9) => {
      const kk = k(t);
      if (kk < kFrom || kk > kTo) return 0;
      return Math.exp(-(t - at(kk)) * decay) * (((kk % beatsPerBar) + beatsPerBar) % beatsPerBar === 0 ? 1.4 : 1);
    };
    return { beat, at, k, pulse, bar: beat * beatsPerBar };
  }

  // ---------- DOM helpers ----------
  const injected = new Set();
  function injectCSS(id, css) {
    if (injected.has(id)) return;
    injected.add(id);
    const s = document.createElement("style");
    s.dataset.gml = id;
    s.textContent = css;
    document.head.appendChild(s);
  }
  function el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }

  /** Library root URL (set GML.root before loading components if compositions live elsewhere). */
  const root = () => (GML.root || "").replace(/\/$/, "");
  const brandURL = (file) => `${root()}/assets/brand/drivermod/${file}`;

  /** App line icon from the brand kit (GML.icons, loaded by assets/brand/drivermod/icons.js). */
  function icon(name, size, color, sw = 1.6, extraStyle = "") {
    const I = GML.icons && GML.icons[name];
    if (!I) throw new Error(`GML icon "${name}" not loaded — include assets/brand/drivermod/icons.js`);
    const asp = name === "car-side" ? 1.5 : 1;
    return `<svg width="${size * asp}" height="${size}" viewBox="${I.viewBox}" style="color:${color};display:block;${extraStyle}">${I.body.replace(/SW/g, sw)}</svg>`;
  }

  /** iOS status bar (9:41, full signal/wifi/battery) in 440-pt layout space. */
  function statusBar(color = "#fff") {
    return `<div class="gml-sb" style="color:${color}"><div class="gml-sb-time">9:41</div>
      <svg style="position:absolute;left:311px;top:23px" width="19" height="12"><g fill="${color}">
        <rect x="0" y="8" width="3.4" height="4" rx="1"/><rect x="5" y="5.5" width="3.4" height="6.5" rx="1"/>
        <rect x="10" y="3" width="3.4" height="9" rx="1"/><rect x="15" y="0" width="3.4" height="12" rx="1"/></g></svg>
      <svg style="position:absolute;left:337px;top:22.5px" width="17" height="13" viewBox="0 0 17 13"><g fill="${color}">
        <path d="M8.5 2.6c2.4 0 4.6.9 6.3 2.5l1.3-1.3A10.6 10.6 0 0 0 8.5.8 10.6 10.6 0 0 0 .9 3.8l1.3 1.3A8.9 8.9 0 0 1 8.5 2.6Z"/>
        <path d="M8.5 6.1c1.4 0 2.7.5 3.8 1.5l1.3-1.3a7.2 7.2 0 0 0-10.2 0l1.3 1.3c1.1-1 2.4-1.5 3.8-1.5Z"/>
        <path d="M8.5 9.5c.5 0 1 .2 1.3.5L8.5 11.4 7.2 10c.3-.3.8-.5 1.3-.5Z"/></g></svg>
      <svg style="position:absolute;left:362px;top:22px" width="29" height="14" viewBox="0 0 29 14">
        <rect x="0.5" y="0.5" width="24.5" height="13" rx="4.2" fill="none" stroke="${color}" stroke-opacity="0.4"/>
        <rect x="2.5" y="2.5" width="20.5" height="9" rx="2.5" fill="${color}"/>
        <path d="M26.5 4.8v4.4c.9-.3 1.5-1.2 1.5-2.2s-.6-1.9-1.5-2.2Z" fill="${color}" fill-opacity="0.4"/></svg></div>`;
  }

  /**
   * A phone screen in 440-pt layout space, scaled to `width` stage px.
   * screen(parent, { width: 1080, height: 782 }) — 782 pt fills a 9:16 frame edge to edge;
   * 956 pt is a real iPhone Pro Max screen (use inside a device frame).
   */
  function screen(parent, { width = 1080, height = 782, background = "var(--dm-bg)" } = {}) {
    const s = el("div", "gml-screen");
    s.style.height = height + "px";
    s.style.transform = `scale(${width / 440})`;
    s.style.background = background;
    parent.appendChild(s);
    return s;
  }

  injectCSS("core", `
    .gml-screen { position: absolute; left: 0; top: 0; width: 440px; transform-origin: 0 0; overflow: hidden; color: var(--dm-text); font-family: Inter; -webkit-font-smoothing: antialiased; }
    .gml-screen * { box-sizing: border-box; }
    .gml-sb { position: absolute; left: 0; top: 0; width: 440px; height: 54px; z-index: 5; }
    .gml-sb-time { position: absolute; left: 46px; width: 62px; top: 19px; text-align: center; font: 600 17px/22px Inter; letter-spacing: -0.3px; }
    .gml-fill { position: absolute; inset: 0; }
  `);

  /** Wait for fonts + every <img> + listed image URLs before the first capture. */
  async function ready(extraImages = []) {
    await document.fonts.ready;
    await Promise.all([...document.images].map((im) => (im.complete ? 0 : new Promise((r) => (im.onload = im.onerror = r)))));
    for (const u of extraImages) await new Promise((r) => { const im = new Image(); im.onload = im.onerror = r; im.src = u; });
    for (const f of ["800 italic 40px InterX", "500 20px Orbitron", "700 20px Orbitron", "600 20px Inter"]) await document.fonts.load(f);
  }

  GML.core = { cl, seg, lerp, ease, hash, kf, grid, injectCSS, el, icon, statusBar, screen, ready, brandURL, root };
})();
