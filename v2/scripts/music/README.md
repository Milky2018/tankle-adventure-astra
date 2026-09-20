# Four-track MZ soundtrack

The active soundtrack uses four recordings from the owner's local RPG Maker MZ collection. The original OGG copies retain their metadata and SHA-256 hashes. Playback FLACs contain the same arrangements and sample positions, with constant gain only: approximately -19 LUFS and at least 3 dB true-peak headroom. No new instruments, compression, reverb, time stretching or remixes are applied.

| Role | Original | Duration | Native loop |
| --- | --- | ---: | --- |
| Before Phoenix | Dungeon2.ogg | 91.43 s | 0–91.429 s |
| After Phoenix | Theme1.ogg | 92.25 s | 1.500–92.250 s |
| Ordinary Bosses | Battle4.ogg | 107.37 s | 11.368–107.368 s |
| Final Keeper | Battle8.ogg | 107.43 s | 0–107.429 s |

Author metadata: KADOKAWA, RPG Maker MZ, 2020. Imported at the resource owner's request from `Documents/rpgGames/快乐城堡/audio/bgm`. These commercial recordings are not authored by this project; the repository does not grant an independent license to them.

## Reimport and verify

Requires Python 3, ffmpeg and ffprobe. Supply the local resource directory explicitly:

```sh
python3 scripts/music/import_mz.py /path/to/MZ/audio/bgm
python3 scripts/music/validate.py
npm test
```

The importer copies the four originals, measures source loudness, creates browser-compatible FLAC playback versions, preserves `LOOPSTART` and `LOOPLENGTH`, and records hashes and frame boundaries in `public/music/manifest.json`. It removes only obsolete recordings named by the replaced manifest. The former composition generators and generated recordings have been removed.

The audition page is `/music/index.html`, including an original-file download and a loop-transition preview. Playback decodes only the selected recording; the game keeps at most two cached recordings. Safari compatibility uses the same FLAC path as the previous soundtrack.

Music routing is progression-based: Phoenix ownership permanently selects the second exploration track, including on earlier maps and after reload or death. Committed Boss arenas override exploration; victory restores the appropriate main cue. Ordinary enemies do not trigger another track. The final quiet approach remains silent, and the ending reuses the second main theme without adding a fifth cue. Pause resumes at the saved position; death discards that position. Warning sounds briefly duck music.
