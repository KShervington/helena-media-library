# Helena's voice — DECIDED 2026-11-09 (D-02)

One voice for the life of the account. Never tuned per video; pronunciations go in the lexicon, not in voice settings.

```yaml
provider:   elevenlabs
voice_id:   AWVBEFLEB7GbpYVc15fZ        # designed by Kyle in the ElevenLabs portal, 2026-11-09
model:      eleven_v4                   # CONFIRM — the model the voice was auditioned with
delivery:                               # CONFIRM — the settings Kyle liked; these are the runner defaults until then
  tags:       "[flat][calm]"            # prepended to every beat (v3/v4 only)
  stability:  0.8
  style:      0
  speed:      0.95
  similarity_boost: 0.75
decided:    2026-11-09
```

`elevenlabs.mjs` in this folder uses these as defaults, so production is:

```bash
node assets/tools/narration/elevenlabs.mjs Project_Files/script.txt Project_Files --lexicon Project_Files/lexicon.json
python3 assets/tools/narration/levels.py Project_Files/narration.wav Project_Files/levels.json
```

Change log: record any change here with a date and the reason. (There should be very few.)
