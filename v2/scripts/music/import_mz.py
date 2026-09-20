"""Import four user-owned MZ tracks without altering their arrangements or loop timing."""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'public/music'
SELECTION = [
    ('mz-dungeon2', 'Dungeon2', 'exploration', 'Before Phoenix', 'A restrained, mysterious first half.'),
    ('mz-theme1', 'Theme1', 'exploration', 'After Phoenix', 'An open, forward-moving adventure theme after the engine awakens.'),
    ('mz-battle4', 'Battle4', 'battle', 'Boss Battle', 'The shared battle cue for Prototype, Overseer, Guardian and Sorter.'),
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
        playback = 'mz/' + name + '.flac'
        shutil.copy2(source, PUBLIC / original)
        analysis = subprocess.run([
            'ffmpeg', '-hide_banner', '-i', str(source), '-af', 'loudnorm=print_format=json',
            '-f', 'null', '-'
        ], capture_output=True, text=True, check=True).stderr
        loudness = json.JSONDecoder().raw_decode(analysis[analysis.rfind('{'):])[0]
        # A constant gain retains dynamics; no compressor, limiter, reverb or resynthesis.
        gain_db = min(-19 - float(loudness['input_i']), -3 - float(loudness['input_tp']))
        subprocess.run([
            'ffmpeg', '-v', 'error', '-y', '-i', str(source), '-af', f'volume={gain_db:.6f}dB',
            '-c:a', 'flac', '-sample_fmt', 's32', str(PUBLIC / playback)
        ], check=True)
        rendered = probe(PUBLIC / playback)
        frames = int(rendered['duration_ts'])
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
            gainDb=round(gain_db, 6), sourceLufs=float(loudness['input_i']),
            peakDbfs=round(float(loudness['input_tp']) + gain_db, 3),
        ))
        print(f'{role}: {name}, {frames / rate:.2f}s, loop {start / rate:.3f}–{end / rate:.3f}s', flush=True)
    manifest = dict(title='Tankle Adventure — Astra', version=3,
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
