#!/usr/bin/env node
// Capture a composition (an HTML page whose every frame is window.render(t)) with headless Chromium.
//
//   node capture.mjs <composition.html> frames  <outDir> [--fps 30] [--from 0] [--to N] [--workers 4] [--query "textless=1"]
//   node capture.mjs <composition.html> stills  <outDir> <t> [<t> ...]                        [--query ...]
//   node capture.mjs <composition.html> element <out.png> --t <sec> --selector <css> [--pad 70] [--query ...]
//
// Composition contract (see the library README):
//   window.ready      Promise that resolves when fonts/images are loaded and layout is measured
//   window.render(t)  draws frame t (seconds) — pure function of t
//   window.DURATION   seconds (frames mode default length)      window.SIZE = { width, height } (default 1080×1920)
//   window.isolate(selector)  optional: hide everything except one element (element mode, transparent PNG)
//
// Needs Playwright: `npm i playwright && npx playwright install chromium`, or set CHROME=/path/to/chrome.
import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

let chromium;
try { ({ chromium } = await import("playwright")); }
catch { ({ chromium } = await import("/opt/npm-tools/node_modules/playwright/index.mjs")); }

const argv = process.argv.slice(2);
const flag = (name, dflt) => { const i = argv.indexOf("--" + name); return i >= 0 ? argv[i + 1] : dflt; };
const positional = argv.filter((a, i) => !a.startsWith("--") && !(i > 0 && argv[i - 1].startsWith("--")));
const [comp, mode, out, ...rest] = positional;
if (!comp || !mode || !out) { console.error("usage: capture.mjs <composition.html> frames|stills|element <out> ..."); process.exit(1); }

const CHROME = process.env.CHROME || ["/opt/pw-browsers/chromium-1194/chrome-linux/chrome"].find((p) => existsSync(p));
const url = "file://" + resolve(comp) + (flag("query") ? "?" + flag("query") : "");
const browser = await chromium.launch({ executablePath: CHROME, args: ["--allow-file-access-from-files"] });

async function openPage() {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.error("[pageerror]", e.message));
  await page.goto(url);
  const size = await page.evaluate(() => window.SIZE || { width: 1080, height: 1920 });
  await page.setViewportSize(size);
  await page.evaluate(() => window.ready);
  return page;
}

if (mode === "frames") {
  mkdirSync(out, { recursive: true });
  const fps = +flag("fps", 30), workers = +flag("workers", 4);
  const probe = await openPage();
  const total = Math.round((await probe.evaluate(() => window.DURATION)) * fps);
  await probe.close();
  const from = +flag("from", 0), to = +flag("to", total);
  const chunk = Math.ceil((to - from) / workers);
  await Promise.all(Array.from({ length: workers }, async (_, w) => {
    const a = from + w * chunk, b = Math.min(to, a + chunk);
    if (a >= b) return;
    const page = await openPage();
    for (let f = a; f < b; f++) {
      await page.evaluate((tt) => window.render(tt), f / fps);
      await page.screenshot({ path: `${out}/f${String(f).padStart(5, "0")}.png` });
    }
    await page.close();
  }));
  console.log(`frames ${from}–${to - 1} → ${out}`);
} else if (mode === "stills") {
  mkdirSync(out, { recursive: true });
  const page = await openPage();
  for (const t of rest) {
    await page.evaluate((tt) => window.render(tt), +t);
    await page.screenshot({ path: `${out}/t${(+t).toFixed(2).padStart(5, "0")}.jpg`, type: "jpeg", quality: 90 });
  }
} else if (mode === "element") {
  mkdirSync(dirname(resolve(out)), { recursive: true });
  const page = await openPage();
  const sel = flag("selector"), pad = +flag("pad", 70);
  await page.evaluate((tt) => window.render(tt), +flag("t", 0));
  const box = await page.evaluate((s) => {
    if (window.isolate) window.isolate(s);
    for (const e of [document.documentElement, document.body]) e.style.background = "transparent";
    const r = document.querySelector(s).getBoundingClientRect();
    return { x: r.left, y: r.top, w: r.width, h: r.height };
  }, sel);
  await page.screenshot({ path: out, omitBackground: true, clip: { x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad), width: box.w + 2 * pad, height: box.h + 2 * pad } });
} else {
  console.error("unknown mode " + mode);
}
await browser.close();
