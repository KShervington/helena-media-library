/* GML.narration — word-level timing from a TTS/alignment step, so visuals follow the voice.
 *
 * narration.json (written by tts.mjs / align.py):
 *   { "audio": "narration.wav", "duration": 47.2,
 *     "words": [ { "w": "This", "s": 0.12, "e": 0.31 }, { "w": "repo", "s": 0.33, "e": 0.58 }, … ],
 *     "beats": [ { "id": "hook", "s": 0.0 }, { "id": "proof", "s": 3.4 }, … ] }      // optional, from the script's beat markers
 *
 * const N = GML.narration.create(json);
 *   N.at("tiles")            → start time of the first occurrence of the word (case/punctuation-insensitive)
 *   N.at("tiles", 2)         → second occurrence
 *   N.at("256 tiny tiles")   → start of a phrase (consecutive words)
 *   N.end("tiles")           → end time of that word
 *   N.beat("proof")          → start of a named beat (falls back to the word if no beats[])
 *   N.after("so", idx)       → first occurrence after word index idx → { s, e, i } (captions use this to resolve lines in order)
 *   N.wordsBetween(a, b)     → words with s in [a, b)
 *   N.index(t)               → index of the word being spoken at t (−1 before the first word)
 *   N.words                  → the raw list
 * Throws with a clear message if a word/phrase isn't found — a composition must never silently guess a time.
 */
(function () {
  const norm = (s) => s.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9%$.]+/g, " ").replace(/\.(?=\s|$)/g, "").trim();
  function create(json) {
    const words = (json.words || []).map((x, i) => ({ ...x, n: norm(x.w), i }));
    const beats = json.beats || [];
    function find(phrase, occurrence = 1, after = -1) {
      const toks = norm(phrase).split(" ").filter(Boolean);
      let seen = 0;
      for (let i = after + 1; i + toks.length <= words.length; i++) {
        let ok = true;
        for (let j = 0; j < toks.length; j++) if (words[i + j].n !== toks[j]) { ok = false; break; }
        if (ok && ++seen === occurrence) return { s: words[i].s, e: words[i + toks.length - 1].e, i };
      }
      throw new Error(`narration: "${phrase}" (occurrence ${occurrence}) not found`);
    }
    const at = (phrase, occ) => find(phrase, occ).s;
    const end = (phrase, occ) => find(phrase, occ).e;
    const after = (phrase, idx) => find(phrase, 1, idx);   // first occurrence after word index idx → { s, e, i }
    const beat = (id) => { const b = beats.find((x) => x.id === id); if (b) return b.s; return at(id); };
    const wordsBetween = (a, b) => words.filter((w) => w.s >= a && w.s < b);
    const index = (t) => { let k = -1; for (let i = 0; i < words.length; i++) if (words[i].s <= t) k = i; else break; return k; };
    return { words, beats, at, end, beat, after, find, wordsBetween, index, duration: json.duration };
  }
  window.GML = window.GML || {};
  GML.narration = { create, norm };
})();
