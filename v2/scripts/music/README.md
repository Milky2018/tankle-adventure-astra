# The City Remembers

Eleven locally authored scores for Furnace Born: seven regions, three battles, and a finite ending. Only **Clockwork Crypt** retains the approved notes in `clockwork.json` and the historical Dies irae fragment. Ten independent themes replace the former related arrangements. Organ appears in Clockwork alone.

`scores.py` defines notes, harmony, meter and developed forms. `arrangements.py` gives each piece its own rhythmic and instrumental grammar. `instruments.py` synthesizes every voice; `render.py` mixes and exports. No external music service, samples, SoundFonts or game recordings are used.

| Piece | Identity | Duration |
| --- | --- | --- |
| Clockwork Crypt | Gothic clockwork; retained theme plus new sections | 1:50 |
| Platform Zero | Electric-piano nocturne, swung brushes | 2:00 |
| Water Remembers | 6/8 marimba, kalimba and flute | 1:51 |
| Flight Test | Analogue synth, sequenced bass, motor rhythm | 1:57 |
| Unanswered Light | 5/4 spectral ambient and FM glass | 2:08 |
| Second Heart | Industrial trip-hop and brass stabs | 1:53 |
| Those Before Us | Exposed low-string elegy | 2:08 |
| Iron Vigil | Industrial metal / breakbeat | 2:16 |
| Mirror Hunt | 7/8 horror pursuit, bowed metal | 2:06 |
| The Last Keeper | Symphonic siege, brass, strings and battle drums | 2:50 |
| Morning Without Us | Piano / chamber epilogue | 1:50 |

## Render

Requires Python 3 with NumPy and ffmpeg on PATH:

```sh
python scripts/music/render.py
# Render one changed composition:
python scripts/music/render.py water-remembers
python scripts/music/validate.py
```

Production FLAC stems and single-form MP3 previews go to `public/music/`. Each complete asset is 90–180 seconds, without a baked second pass. WAV masters, note lists and diagnostics go to ignored `output/music/soundtrack/`. MP3 previews have a listening-only final fade. The game and audition deck use the lossless sources without that fade.

Regional bed, melody and pulse files have identical lengths and one shared linear master gain. The rhythmic layer rises during encounters without restarting the composition. Release tails and reverb are rendered cyclically. Introductions quote the turnaround and fade in only at the beginning; there is no fade at the repeat. WAV masters carry RIFF `smpl` markers, and the generated manifest records exact frame boundaries. Reverb uses bounded overlap-add blocks rather than a multi-minute FFT. Battle mixes use gentle bus saturation; mastering retains at least 2 dB of sample-peak headroom.

The 109.67-second ending keeps the cinematic accents at 9, 15, 20 and 26 seconds, then develops beneath the completion card. It does not lengthen the cinematic or loop. Skipping the cinematic seeks to the title accent, not to the end of the track.

The audition page is `/music/index.html`. It shows genre, meter, duration and buttons for each form section, plus a seam preview and combat-layer switch. Only the selected piece is decoded. The game cache retains at most two score entries; outgoing voices disconnect after transitions. Web Audio requests 44.1 kHz to match the frame markers. Longer stems increase download and decoded memory size; sequential loading avoids simultaneous decoding allocations.

The historical fragment in Clockwork is public-domain plainchant, not a transcription of a Castlevania or Hollow Knight recording. All other themes, accompaniment and timbres are newly authored here. Numeric and browser checks verify playback, clipping and continuity; they do not establish listener approval of the compositions.
