/* GML.captions — burned-in, narration-synced captions in the safe band.
 *
 * const C = GML.captions.create(parent, { narration: N, lines, style: "phrase" | "word" });
 *   lines: [ { from: "This repo", to: "six days", accent: ["40,000", "stars"] }, … ]   // phrase mode: one line per entry, shown from first word to last word
 *          (from/to are phrases found via narration.at / narration.end)
 *   C.render(t)  → shows the active line, colours the word being spoken with var(--accent) (and keeps `accent` words accented once spoken)
 *   C.el         → the layer; hidden when the page is opened with ?textless=1
 *
 * Reads tokens: --caption, --ts-caption-size, --ts-caption-weight, --ts-caption-y, --text, --accent, --muted.
 * Style "word": shows 1–3 words at a time (current word large), for punchier hooks. Style "phrase" (default): 3–8 word lines, upcoming words at --muted.
 */
(function () {
  const { injectCSS } = GML.core;
  injectCSS("ts-captions", `
    .tsc{position:absolute;left:90px;right:90px;top:var(--ts-caption-y,1300px);text-align:center;font-family:var(--caption);
         font-size:var(--ts-caption-size,60px);font-weight:var(--ts-caption-weight,700);line-height:1.18;color:var(--text);
         text-wrap:balance}
    .tsc .w{display:inline-block;margin:0 .14em;transition:none}
    .tsc .w.past{color:var(--text)} .tsc .w.now{color:var(--accent)} .tsc .w.next{color:var(--muted)}
    .tsc .w.acc.past{color:var(--accent)}
    .tsc.word .w{font-size:1.25em}
    .tsc .pill{display:inline-block;padding:.1em .4em;border-radius:.2em;background:color-mix(in srgb,var(--bg) 82%,transparent)}
  `);
  function create(parent, { narration: N, lines, style = "phrase", pill = false }) {
    const el = document.createElement("div");
    el.className = "tsc " + style;
    parent.appendChild(el);
    if (new URLSearchParams(location.search).get("textless")) el.style.display = "none";
    // resolve each line to word indices, in order: each line starts after the previous one ended
    let cursor = -1;
    const L = lines.map((ln) => {
      const a = N.after(ln.from, cursor);
      const b = N.after(ln.to, a.i - 1);
      const toLen = GML.narration.norm(ln.to).split(" ").length;
      cursor = b.i + toLen - 1;
      const acc = new Set((ln.accent || []).map(GML.narration.norm));
      return { from: a.i, to: cursor, s: a.s, e: b.e, acc };
    });
    let built = -1;
    function render(t) {
      const li = L.findIndex((l) => t >= l.s - 0.05 && t < l.e + 0.35);
      if (li < 0) { el.innerHTML = ""; built = -1; return; }
      const l = L[li];
      if (built !== li) {
        built = li;
        const wrap = pill ? '<span class="pill">' : "";
        el.innerHTML = wrap + N.words.slice(l.from, l.to + 1).map((w) => `<span class="w ${l.acc.has(w.n) ? "acc" : ""}" data-i="${w.i}">${w.w}</span>`).join(" ") + (pill ? "</span>" : "");
      }
      const cur = N.index(t);
      for (const span of el.querySelectorAll(".w")) {
        const i = +span.dataset.i;
        span.classList.remove("past", "now", "next");
        span.classList.add(i < cur ? "past" : i === cur ? "now" : "next");
        if (style === "word") span.style.display = Math.abs(i - cur) <= 1 ? "" : "none";
      }
    }
    return { el, render, lines: L };
  }
  GML.captions = { create };
})();
