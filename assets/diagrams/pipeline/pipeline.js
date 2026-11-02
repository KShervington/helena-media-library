/* GML.pipeline — the vertical pipeline primitive (stages drawn on in order, a packet travelling the edges, one highlighted stage).
 *
 * const P = GML.pipeline.create(parent, { steps: [{ label: "Image" }, { label: "256 tiles", index: "02" }, …], x: 150, y: 0, width: 636, gap: 48, height: 104 });
 *   P.render(t, { reveal: [t0, t1, t2, …],  // video time each stage draws on (from narration.at)
 *                 highlight: 1,             // index of the accented stage, or -1
 *                 highlightAt: t,           // when the accent lands
 *                 packet: 0..1 })           // optional: position of a travelling dot along the whole pipeline (0 = top, 1 = bottom)
 *   P.el, P.nodes[]  (for zoom-ins / isolate)
 * Reads tokens: --line, --text, --accent, --muted, --surface, --stroke, --radius, --display, --mono.
 */
(function () {
  const { injectCSS, seg, ease, lerp } = GML.core;
  injectCSS("ts-pipeline", `
    .tsp{position:absolute}
    .tsp .node{position:absolute;border:var(--stroke) solid var(--line);border-radius:var(--radius);background:var(--surface);
      display:flex;align-items:center;gap:24px;padding:0 40px;box-sizing:border-box;font-family:var(--display);font-size:40px;font-weight:600;color:var(--text);
      transform-origin:50% 50%;overflow:hidden}
    .tsp .node .k{font-family:var(--mono);font-size:24px;letter-spacing:.1em;color:var(--muted);font-weight:500}
    .tsp .node.on{border-color:var(--accent);color:var(--accent)} .tsp .node.on .k{color:var(--accent)}
    .tsp .node.dim{color:var(--muted);border-color:var(--line)}
    .tsp .edge{position:absolute;width:var(--stroke);background:var(--line);transform-origin:50% 0}
    .tsp .edge:after{content:"";position:absolute;left:50%;bottom:-2px;width:14px;height:14px;border-right:var(--stroke) solid var(--line);border-bottom:var(--stroke) solid var(--line);transform:translateX(-50%) rotate(45deg)}
    .tsp .packet{position:absolute;width:18px;height:18px;border-radius:50%;background:var(--accent);box-shadow:0 0 18px var(--accent);transform:translate(-50%,-50%)}
  `);
  function create(parent, { steps, x = 150, y = 0, width = 636, gap = 48, height = 104 }) {
    const el = document.createElement("div");
    el.className = "tsp"; el.style.left = x + "px"; el.style.top = y + "px"; el.style.width = width + "px";
    parent.appendChild(el);
    const nodes = [], edges = [];
    steps.forEach((s, i) => {
      const n = document.createElement("div"); n.className = "node";
      n.style.cssText = `left:0;top:${i * (height + gap)}px;width:${width}px;height:${height}px`;
      n.innerHTML = `<span class="k">${s.index || String(i + 1).padStart(2, "0")}</span>${s.label}`;
      el.appendChild(n); nodes.push(n);
      if (i < steps.length - 1) {
        const e = document.createElement("div"); e.className = "edge";
        e.style.cssText = `left:${width / 2}px;top:${i * (height + gap) + height}px;height:${gap}px`;
        el.appendChild(e); edges.push(e);
      }
    });
    const packet = document.createElement("div"); packet.className = "packet"; packet.style.display = "none"; el.appendChild(packet);
    const total = steps.length * height + (steps.length - 1) * gap;
    function render(t, { reveal = [], highlight = -1, highlightAt = Infinity, packet: pk = null, dimOthers = false } = {}) {
      nodes.forEach((n, i) => {
        const p = ease.o5(seg(t, reveal[i] ?? 0, (reveal[i] ?? 0) + 0.7));
        n.style.opacity = p; n.style.transform = `translateY(${lerp(24, 0, p)}px)`;
        n.style.clipPath = `inset(0 ${lerp(100, 0, ease.o3(seg(t, reveal[i] ?? 0, (reveal[i] ?? 0) + 0.5)))}% 0 0)`;
        const on = i === highlight && t >= highlightAt;
        n.classList.toggle("on", on);
        n.classList.toggle("dim", dimOthers && t >= highlightAt && !on);
      });
      edges.forEach((e, i) => { const p = ease.o3(seg(t, (reveal[i + 1] ?? 0) - 0.25, (reveal[i + 1] ?? 0) + 0.2)); e.style.transform = `scaleY(${p})`; e.style.opacity = p; });
      if (pk == null) packet.style.display = "none";
      else { packet.style.display = ""; packet.style.left = width / 2 + "px"; packet.style.top = pk * total + "px"; }
    }
    return { el, nodes, edges, render, total };
  }
  GML.pipeline = { create };
})();
