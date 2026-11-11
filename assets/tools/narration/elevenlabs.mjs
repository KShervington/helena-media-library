#!/usr/bin/env node
// ElevenLabs TTS with word timestamps → narration.wav + narration.json
//   node elevenlabs.mjs script.txt outDir --model eleven_v4 --voice <voice_id> [--tags "[flat][calm]"] [--stability 0.8] [--speed 0.95] [--lexicon lexicon.json]
// Needs ELEVENLABS_API_KEY. Uses /v1/text-to-speech/{voice}/with-timestamps (character alignment → grouped into words).
//
// Delivery (Helena = flat): script.txt stays clean; this runner injects the delivery per model.
//   --tags     inline audio tags prepended to every beat, v3/v4 only (default "[flat][calm]"; pass "" to test untagged).
//              v2 models ignore/misread tags, so they're never sent there. Tag characters are stripped from the alignment.
//   --stability  higher = more consistent/less expressive (default 0.8). --style 0 (default). --speed 0.95 (default; 0.7–1.2).
//   --format     ElevenLabs output_format. Default pcm_24000; raw PCM at 44.1 kHz needs the Pro tier, and if the API answers
//                403 output_format_not_allowed the runner retries with mp3_44100_128 (all tiers). Every segment is decoded by
//                ffmpeg to 44.1 kHz PCM before concatenation, so timing math is identical whichever format came back.
// Render each setting 3× — tags can change consistency between takes, which is the thing we care most about.
// Untested in the cloud container (no network); written against the Nov 2026 REST docs — check field names if it fails.
import fs from "node:fs"; import path from "node:path"; import { execSync } from "node:child_process";
const [src, out] = process.argv.slice(2); const flag = (n, d) => { const i = process.argv.indexOf("--" + n); return i > 0 ? process.argv[i + 1] : d; };
// Production defaults = Helena's frozen voice (VOICE.md). Override only for tests.
const model = flag("model", "eleven_v4"), voice = flag("voice", "AWVBEFLEB7GbpYVc15fZ"), stability = +flag("stability", 0.8);
const supportsTags = /_v3|_v4/.test(model);
const tags = supportsTags ? flag("tags", "[flat][calm]") : "";
const speed = +flag("speed", 0.95), style = +flag("style", 0);
let format = flag("format", "pcm_24000");
const SR = 44100;
// decode any ElevenLabs output to mono s16le @ 44.1 kHz via ffmpeg (stdin → stdout)
function toPCM(buf, fmt) {
  const inArgs = fmt.startsWith("pcm_") ? ["-f", "s16le", "-ar", fmt.split("_")[1], "-ac", "1"] : fmt.startsWith("mp3") ? ["-f", "mp3"] : [];
  return execSync(`ffmpeg -v error ${inArgs.join(" ")} -i pipe:0 -f s16le -ar ${SR} -ac 1 pipe:1`, { input: buf, maxBuffer: 1 << 28 });
}
async function synth(spoken) {
  for (;;) {
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=${format}`, {
      method: "POST", headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY, "content-type": "application/json" },
      body: JSON.stringify({ text: spoken, model_id: model, voice_settings: { stability, similarity_boost: 0.75, style, speed } }) });
    if (r.ok) return r.json();
    const body = await r.text();
    if (r.status === 403 && /output_format_not_allowed/.test(body) && format !== "mp3_44100_128") {
      console.error(`output_format ${format} not allowed on this plan — retrying with mp3_44100_128`); format = "mp3_44100_128"; continue;
    }
    throw new Error(`${r.status} ${body}`);
  }
}
if (!voice) throw new Error("--voice <voice_id> required");
fs.mkdirSync(out, { recursive: true });
const text = fs.readFileSync(src, "utf8");
const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
const lex = flag("lexicon") ? JSON.parse(fs.readFileSync(flag("lexicon"), "utf8")) : {};
let words = [], beats = [], t0 = 0, pcm = [];
for (const b of blocks) {
  const lines = b.split("\n"); let id = null; if (lines[0].startsWith("#")) id = lines.shift().replace("#", "").trim();
  let spoken = lines.join(" "); for (const [k, v] of Object.entries(lex)) spoken = spoken.replaceAll(k, v);
  if (tags) spoken = tags + " " + spoken;
  if (id) beats.push({ id, s: t0 });
  const j = await synth(spoken);
  const buf = toPCM(Buffer.from(j.audio_base64, "base64"), format); pcm.push(buf);
  const al = j.alignment; // { characters[], character_start_times_seconds[], character_end_times_seconds[] }
  let w = "", ws = null;
  al.characters.forEach((c, i) => {
    if (/\s/.test(c)) { if (w) { words.push({ w, s: t0 + ws, e: t0 + al.character_end_times_seconds[i - 1] }); w = ""; ws = null; } }
    else { if (ws == null) ws = al.character_start_times_seconds[i]; w += c; }
  });
  if (w) words.push({ w, s: t0 + ws, e: t0 + al.character_end_times_seconds.at(-1) });
  words = words.filter((x) => !/^\[.*\]$/.test(x.w));   // drop audio-tag tokens if the alignment echoed them
  t0 += buf.length / 2 / SR + 0.35;            // 0.35 s pause between beats
  pcm.push(Buffer.alloc(Math.round(0.35 * SR) * 2));
}
const raw = path.join(out, "narration.pcm"); fs.writeFileSync(raw, Buffer.concat(pcm));
execSync(`ffmpeg -y -f s16le -ar ${SR} -ac 1 -i "${raw}" -ar 48000 "${path.join(out, "narration.wav")}"`, { stdio: "ignore" }); fs.unlinkSync(raw);
const json = { duration: t0, words, beats, provider: "elevenlabs", model, voice, delivery: { tags, stability, style, speed, format }, rendered_at: new Date().toISOString() };
fs.writeFileSync(path.join(out, "narration.json"), JSON.stringify(json, null, 1));
fs.writeFileSync(path.join(out, "narration.json.js"), "window.NARRATION = " + JSON.stringify(json) + ";\n");
console.log(`${words.length} words, ${t0.toFixed(1)} s → ${out}`);
