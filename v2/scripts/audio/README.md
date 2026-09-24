# Sound-effect auditions

The game synthesizes its effects in `src/audio/sound-effects.js`. `src/audio/playback.js` owns playback state, regional machinery cadence, listener position and music coordination. No sampled effects or external generation service are required. Music assets are unchanged.

The A/B baseline is the actual `audio.js` at commit `dd92d79`. The preparation script copies that source into ignored output, adjusts its relative imports and builds an offline-render page. The browser runs both versions through Web Audio at 44.1 kHz with the same default master gain and seeded noise. Legacy delayed repair/unlock notes are scheduled on the offline clock. No old effects are bundled into the game.

From `v2/`, with the development server on port 5174 and `playwright-cli` available (or `PLAYWRIGHT_CLI` pointing to its wrapper):

```sh
node scripts/audio/prepare-comparison.mjs
npm run test:browser -- sfx-render
tar -xf output/audio/sfx-comparison/raw-sfx.tar -C output/audio/sfx-comparison
python3 scripts/audio/package-comparison.py
npm run test:browser -- sfx-audition
```

Encoding requires `ffmpeg` with libmp3lame. The Python script uses only the standard library. Open `/output/audio/sfx-comparison/index.html` on the development server. It provides 32 event comparisons plus engine, spatial and battle sequences, grouped players, individual A/B players and timed captions. The new hurt cue is compared with the original shared hit cue; magnetic traction with the original scan; sniper and seeker launches with their previous shared enemy cues.

The first four groups use fixed-gain integrated-loudness matching around -23 LUFS, with a -2 dBTP ceiling. Pairs with a larger crest factor use the same lower target for both clips so neither transient needs compression. Short clips are remeasured after gain changes because loudness gating can change; the original attack/decay envelope is never compressed for the audition. `loudness.json` records measured levels. The engine, spatial and battle sequences keep the game's original master gain and relative dynamics. `report.json` records raw rendered peaks, energy, invalid samples and unreleased event voices. `timeline.json` records each montage's ordering. Raw WAVs and MP3s remain in ignored `output/`.

`npm run test:browser -- sfx-lifecycle` additionally checks dense overlapping fire, the voice budget, source release, cancellation of delayed sounds and live mute/resume. These checks validate signal/lifecycle behaviour, not subjective approval of the sound design or Safari-specific playback.

## Warning revision

`node scripts/audio/prepare-comparison.mjs --warnings` snapshots the current synth **once, before editing** into ignored `output/audio/warning-comparison/before.js`; subsequent runs preserve it. For this revision that snapshot is the layered synth immediately preceding the warning redesign, not the older Git baseline. Both sides use identical event dispatch, weapon effects, spatial positions and master gain. Six warning pairs use loudness matching; the battle mix retains relative levels.

```sh
node scripts/audio/prepare-comparison.mjs --warnings
npm run test:browser -- warning-render
tar -xf output/audio/warning-comparison/raw-sfx.tar -C output/audio/warning-comparison
python3 scripts/audio/package-comparison.py --warnings
```

The recognition chirp, accelerating lock pulse, clamp triplet, alternating press alarm, high/low thermal alarm and rejection double buzz are original synthesized signals. They use pitch and rhythm rather than the noise, falling bass and metallic transients of gunfire. No sampled game audio is included.
