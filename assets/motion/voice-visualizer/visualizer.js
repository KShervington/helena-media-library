/* GML.visualizer — Helena's carrier in every video: a mark that moves while she speaks. Pure function of t.
 *
 * const V = GML.visualizer.create(parent, { style: "grid" | "trace" | "disc", levels: window.LEVELS, narration: N, x: 540, y: 300, scale: 1 });
 *   V.render(t)   → animates from levels (per-frame bands from levels.py); if no levels, falls back to a deterministic
 *                   "speaking" pattern while a narration word is being spoken (for storyboarding with stub timings)
 *   V.el
 * Styles:
 *   grid  — the 3×3 dot mark from the uniform; dots scale with the low/mid/high bands (ring = low, corners = high, centre = mid, red)
 *   trace — one red line across 760 px; flat in silence, deforms with the bands
 *   disc  — a red disc whose radius follows loudness, inside two hairline rings
 * Reads tokens: --text, --accent, --line.
 */
(function () {
  const { injectCSS, lerp, hash } = GML.core;
  injectCSS("hl-visualizer", `
    .hlv{position:absolute;transform-origin:0 0}
    .hlv .g{position:absolute;display:grid;grid-template-columns:repeat(3,22px);gap:22px;left:-55px;top:-55px}
    .hlv .g i{display:block;width:22px;height:22px;border-radius:50%;background:var(--text);transform-origin:50% 50%}
    .hlv .g i.r{background:var(--accent)}
    .hlv svg{position:absolute;overflow:visible}
  `);
  function create(parent, { style = "grid", levels = null, narration = null, x = 540, y = 300, scale = 1 } = {}) {
    const el = document.createElement("div");
    el.className = "hlv"; el.style.left = x + "px"; el.style.top = y + "px"; el.style.transform = `scale(${scale})`;
    parent.appendChild(el);
    let parts = {};
    if (style === "grid") {
      el.innerHTML = `<div class="g">${Array.from({ length: 9 }, (_, i) => `<i class="${i === 4 ? "r" : ""}"></i>`).join("")}</div>`;
      parts.dots = [...el.querySelectorAll("i")];
    } else if (style === "trace") {
      el.innerHTML = `<svg width="760" height="160" viewBox="0 0 760 160" style="left:-380px;top:-80px"><line x1="0" y1="80" x2="760" y2="80" stroke="var(--line)" stroke-width="1"/><polyline fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/></svg>`;
      parts.line = el.querySelector("polyline");
    } else {
      el.innerHTML = `<svg width="340" height="340" viewBox="0 0 340 340" style="left:-170px;top:-170px"><circle cx="170" cy="170" r="150" fill="none" stroke="var(--line)" stroke-width="1"/><circle cx="170" cy="170" r="110" fill="none" stroke="var(--line)" stroke-width="1"/><circle class="d" cx="170" cy="170" r="40" fill="var(--accent)"/></svg>`;
      parts.disc = el.querySelector(".d");
    }
    // bands at time t → [low, mid, high] in 0..1
    function bands(t) {
      if (levels && levels.data.length) {
        const i = Math.min(levels.data.length - 1, Math.max(0, Math.floor(t * levels.rate)));
        const row = levels.data[i]; return [row[0] ?? 0, row[1] ?? row[0] ?? 0, row[2] ?? row[0] ?? 0];
      }
      if (narration) {                              // stub: speaking while inside a word, with a deterministic wobble
        const k = narration.index(t), w = narration.words[k];
        if (!w || t > w.e) return [0.05, 0.03, 0.02];
        const f = Math.floor(t * 25);
        return [0.45 + 0.45 * hash(f), 0.35 + 0.5 * hash(f + 7), 0.25 + 0.5 * hash(f + 13)];
      }
      return [0, 0, 0];
    }
    function render(t) {
      const [lo, mid, hi] = bands(t);
      if (parts.dots) {
        const s = [hi, lo, hi, lo, mid, lo, hi, lo, hi];
        parts.dots.forEach((d, i) => { d.style.transform = `scale(${lerp(0.5, 1.15, s[i])})`; });
      } else if (parts.line) {
        const pts = []; const a = 6 + 60 * (0.5 * lo + 0.35 * mid + 0.15 * hi);
        for (let x = 0; x <= 760; x += 8) { const ph = t * 9 + x / 23; const v = Math.sin(ph) * Math.sin(x / 61 + t) * Math.sin(x / 7.3 - t * 3); pts.push(`${x},${80 + v * a}`); }
        parts.line.setAttribute("points", pts.join(" "));
      } else if (parts.disc) {
        parts.disc.setAttribute("r", lerp(34, 96, 0.6 * lo + 0.4 * mid));
      }
    }
    return { el, render, bands };
  }
  GML.visualizer = { create };
})();
