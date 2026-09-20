"""Import the selected user-owned MZ tracks without altering arrangements or loop timing."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'public/music'
SELECTION = [
    ('mz-castle3', 'Castle3', 'exploration', 'Initial Hull', 'Exploration before acquiring Boost.'),
    ('mz-scene5', 'Scene5', 'exploration', 'After Boost', 'Exploration after acquiring Overdrive, before Phoenix.'),
    ('mz-scene7', 'Scene7', 'exploration', 'After Phoenix', 'Exploration after acquiring Phoenix, before Water Circulation.'),
    ('mz-dungeon1', 'Dungeon1', 'exploration', 'After Water Circulation', 'The final exploration phase, including earlier regions and the ending.'),
    ('mz-battle1', 'Battle1', 'battle', 'Prototype', 'Reserved for the Prototype encounter.'),
    ('mz-battle3', 'Battle3', 'battle', 'Foundry Overseer', 'Reserved for the Foundry Overseer encounter.'),
    ('mz-battle4', 'Battle4', 'battle', 'Sorter', 'Reserved for the Sorter encounter.'),
    ('mz-battle6', 'Battle6', 'battle', 'Optical Guardian', 'Reserved for the Optical Guardian encounter.'),
    ('mz-battle8', 'Battle8', 'battle', 'Final Keeper', 'Reserved for the final confrontation.'),
]

def probe(path):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(path)
    ]))['streams'][0]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bgm_directory', type=Path)
    args = parser.parse_args()
    old_path = PUBLIC / 'manifest.json'
    old = json.loads(old_path.read_text()) if old_path.exists() else {'tracks': []}
    (PUBLIC / 'mz').mkdir(parents=True, exist_ok=True)
    tracks = []
    for id, name, kind, role, description in SELECTION:
        source = args.bgm_directory / (name + '.ogg')
        info = probe(source)
        tags = {key.upper(): value for key, value in info.get('tags', {}).items()}
        rate = int(info['sample_rate'])
        start = int(tags['LOOPSTART'])
        end = start + int(tags['LOOPLENGTH'])
        original = 'mz/' + name + '.ogg'
        playback = 'mz/' + name + '.webm'
        shutil.copy2(source, PUBLIC / original)
        analysis = subprocess.run([
            'ffmpeg', '-hide_banner', '-i', str(source), '-af', 'loudnorm=print_format=json',
            '-f', 'null', '-'
        ], capture_output=True, text=True, check=True).stderr
        loudness = json.JSONDecoder().raw_decode(analysis[analysis.rfind('{'):])[0]
        # Apply this constant gain at playback; keep the compressed Vorbis packets intact.
        gain_db = min(-19 - float(loudness['input_i']), -3 - float(loudness['input_tp']))
        subprocess.run([
            'ffmpeg', '-v', 'error', '-y', '-i', str(source),
            '-c:a', 'copy', str(PUBLIC / playback)
        ], check=True)
        rendered = probe(PUBLIC / playback)
        # WebM timestamps use milliseconds; loop positions retain the OGG sample clock.
        frames = int(info['duration_ts'])
        assert 0 <= start < end <= frames, (name, start, end, frames)
        assert int(rendered['sample_rate']) == rate
        assert digest(source) == digest(PUBLIC / original)
        tracks.append(dict(
            id=id, title=name, kind=kind, role=role, description=description,
            artist=tags.get('ARTIST', ''), album=tags.get('ALBUM_ARTIST', ''),
            sourceFile=name + '.ogg', sourceSha256=digest(source), playbackSha256=digest(PUBLIC / playback),
            original=original, assets={'mix': playback}, preview=playback,
            sampleRate=rate, frames=frames, duration=frames / rate,
            loopStartFrame=start, loopEndFrameExclusive=end, loopStart=start / rate, loopEnd=end / rate,
            gain=10 ** (gain_db / 20), gainDb=round(gain_db, 6), sourceLufs=float(loudness['input_i']),
            peakDbfs=round(float(loudness['input_tp']) + gain_db, 3),
        ))
        print(f'{role}: {name}, {frames / rate:.2f}s, loop {start / rate:.3f}–{end / rate:.3f}s', flush=True)
    manifest = dict(title='Tankle Adventure — Astra', version=5,
                    attribution='KADOKAWA / RPG Maker MZ. Imported from the owner-provided local resource collection.',
                    tracks=tracks)
    old_path.write_text(json.dumps(manifest, indent=2) + '\n')
    keep = {file for track in tracks for file in [*track['assets'].values(), track['original'], track['preview']]}
    # Remove only recordings named by the replaced manifest, never unrelated files.
    for track in old['tracks']:
        for file in [*track['assets'].values(), track.get('preview'), track.get('original')]:
            if file and file not in keep:
                (PUBLIC / file).unlink(missing_ok=True)

if __name__ == '__main__':
    main()
