#!/usr/bin/env node
// Turn a cue list into render-pipeline/audio.sh `--sfx` arguments, so SFX timing lives next to the visuals.
//   node cues.mjs <cues.json | cues.js | cues.mjs> <sfxDir>
//   bash audio.sh song.mp3 <start> <dur> mix.wav --fade-out 0.8 $(node cues.mjs cues.json SFX)
// A cue list is [[name, videoSeconds, gain], …] (name = a wav in sfxDir without ".wav"). A .js/.mjs module may
// export the list, or a function returning it — handy when cue times come from a composition's shared timeline:
//   export default () => { const T = require("./timeline.js"); return [["tap", T.tapChip, 0.45], …]; }
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
const [file, dir = "SFX"] = process.argv.slice(2);
if (!file) { console.error("usage: cues.mjs <cues.json|cues.js> <sfxDir>"); process.exit(1); }
let cues;
if (file.endsWith(".json")) cues = JSON.parse(readFileSync(file, "utf8"));
else if (file.endsWith(".mjs")) cues = (await import(pathToFileURL(resolve(file)))).default;
else cues = createRequire(import.meta.url)(resolve(file));
if (typeof cues === "function") cues = await cues();
const bad = cues.filter((c) => !Array.isArray(c) || typeof c[0] !== "string" || !Number.isFinite(c[1]));
if (bad.length) { console.error("bad cues:", JSON.stringify(bad.slice(0, 3))); process.exit(1); }
console.log(cues.map(([n, t, g = 0.4]) => `--sfx ${dir}/${n}.wav@${t.toFixed(3)}@${g}`).join(" "));
