# Nine-track MZ soundtrack

The active soundtrack uses nine recordings from the owner's local RPG Maker MZ collection. The original OGG copies retain their metadata and SHA-256 hashes. Playback WebM files contain the original compressed Vorbis packets, copied without re-encoding. Runtime gain supplies the same approximately -19 LUFS level and at least 3 dB true-peak headroom. No audio-quality loss, new instruments, dynamic compression, reverb, time stretching or remixes are introduced.

| Role | Original | Duration | Native loop |
| --- | --- | ---: | --- |
| Initial Hull | Castle3.ogg | 90.00 s | 0.000–90.000 s |
| After Boost | Scene5.ogg | 74.67 s | 0.000–74.667 s |
| After Phoenix | Scene7.ogg | 65.31 s | 0.000–65.306 s |
| After Water Circulation | Dungeon1.ogg | 80.56 s | 0.000–80.559 s |
| Prototype | Battle1.ogg | 70.59 s | 2.824–70.588 s |
| Foundry Overseer | Battle3.ogg | 89.37 s | 0.000–89.375 s |
| Sorter | Battle4.ogg | 107.37 s | 11.368–107.368 s |
| Optical Guardian | Battle6.ogg | 87.77 s | 0.000–87.771 s |
| Final Keeper | Battle8.ogg | 107.43 s | 0.000–107.429 s |

Author metadata: KADOKAWA, RPG Maker MZ, 2020. Imported at the resource owner's request from `Documents/rpgGames/快乐城堡/audio/bgm`. These commercial recordings are not authored by this project; the repository does not grant an independent license to them.

## Reimport and verify

Requires Python 3, ffmpeg and ffprobe. Supply the local resource directory explicitly:

```sh
python3 scripts/music/import_mz.py /path/to/MZ/audio/bgm
python3 scripts/music/validate.py
npm test
```

The importer copies the nine originals, measures source loudness, remuxes their Vorbis audio into WebM without re-encoding, preserves `LOOPSTART` and `LOOPLENGTH`, and records hashes and frame boundaries in `public/music/manifest.json`. It removes only obsolete recordings named by the replaced manifest. The former composition generators and generated recordings have been removed.

The audition page is `/music/index.html`, including an original-file download and a loop-transition preview. Playback decodes only the selected recording; the game keeps at most two cached recordings. Playback requires WebM/Vorbis decoding. This is supported by modern Chromium and WebKit; see [WebKit’s Safari 17.4 media support notes](https://webkit.org/blog/15063/webkit-features-in-safari-17-4/). Chromium 153 and Playwright WebKit 26.5 were exercised locally; native Safari automation was unavailable. Direct OGG decoding in the tested WebKit shifted some streams by 128 samples, whereas WebM retained the original start and all authored loop samples. Some WebM decoders retain up to 128 padding samples at the end; the explicit original loop boundary excludes them.

Music routing follows permanent acquisitions in priority order: Water Circulation (Dungeon1), Phoenix (Scene7), Overdrive / Boost (Scene5), initial hull (Castle3). Returning to earlier regions, releasing Boost, changing weapons and ordinary combat do not restart a cue. Prototype, Overseer, Sorter, Guardian and Keeper use Battle1, Battle3, Battle4, Battle6 and Battle8 respectively. Victory restores the current acquisition phase. The final approach remains silent; the ending reuses Dungeon1. Pause resumes at the saved position; death discards that position. Warning sounds briefly duck music. Selected originals retain their native lengths even where they are shorter than 90 seconds.

The nine playback files total about 6.37 MB. Including the original OGG downloads, the complete production build is about 13.53 MB, down from 145.64 MB with FLAC. Decoded PCM buffers still occupy their original memory footprint; this change reduces storage and transfer size, not decoded audio memory.
