"""Validate copied recordings, preserved loop frames and normalized playback assets."""
from pathlib import Path
from array import array
import hashlib
import json
import subprocess

ROOT = Path(__file__).resolve().parents[2]
PUBLIC = ROOT / 'public/music'
manifest = json.loads((PUBLIC / 'manifest.json').read_text())
assert len(manifest['tracks']) == 4
report = []

def pcm(path, start, end):
    raw = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(path), '-af', f'atrim=start_sample={start}:end_sample={end}',
        '-f', 'f32le', '-'
    ])
    values = array('f')
    values.frombytes(raw)
    return values

for track in manifest['tracks']:
    original = PUBLIC / track['original']
    playback = PUBLIC / track['assets']['mix']
    for path, digest in [(original, track['sourceSha256']), (playback, track['playbackSha256'])]:
        assert hashlib.sha256(path.read_bytes()).hexdigest() == digest
    probes = [json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(path)
    ]))['streams'][0] for path in [original, playback]]
    tags = {key.upper(): value for key, value in probes[0]['tags'].items()}
    start, end = track['loopStartFrame'], track['loopEndFrameExclusive']
    assert start == int(tags['LOOPSTART'])
    assert end == start + int(tags['LOOPLENGTH'])
    assert int(probes[1]['duration_ts']) == track['frames']
    assert int(probes[1]['sample_rate']) == track['sampleRate']
    assert probes[1]['channels'] == 2
    assert 0 <= start < end <= track['frames']
    assert 90 <= track['duration'] <= 180
    assert track['loopEnd'] - track['loopStart'] >= 90
    left, right = pcm(playback, end - 256, end), pcm(playback, start, start + 256)
    assert len(left) == len(right) == 512
    seam = max(abs(left[-2 + c] - right[c]) for c in range(2))
    local_step = max(abs(samples[i] - samples[i - 2]) for samples in [left, right] for i in range(2, len(samples)))
    assert seam <= max(.015, local_step * 2), (track['id'], seam, local_step)
    result = subprocess.run([
        'ffmpeg', '-hide_banner', '-i', str(playback), '-af', 'loudnorm=print_format=json', '-f', 'null', '-'
    ], capture_output=True, text=True, check=True).stderr
    loudness = json.JSONDecoder().raw_decode(result[result.rfind('{'):])[0]
    assert float(loudness['input_tp']) <= -2.9
    row = dict(id=track['id'], seconds=track['duration'], lufs=float(loudness['input_i']),
               truePeakDbfs=float(loudness['input_tp']), seamDelta=round(seam, 6),
               nearbySampleDelta=round(local_step, 6))
    print(json.dumps(row), flush=True)
    report.append(row)
output = ROOT / 'output/music/replacement'
output.mkdir(parents=True, exist_ok=True)
(output / 'validation.json').write_text(json.dumps(report, indent=2) + '\n')
