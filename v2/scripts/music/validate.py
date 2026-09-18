"""Validate shipped duration, signal headroom, loop metadata and score identity."""
from pathlib import Path
import json, math, subprocess, wave
import numpy as np
from scores import TRACKS

ROOT=Path(__file__).resolve().parents[2];PUBLIC=ROOT/'public/music';OUT=ROOT/'output/music/soundtrack'
manifest=json.loads((PUBLIC/'manifest.json').read_text());report=[]
assert len(manifest['tracks'])==11
assert len({t['genre'] for t in manifest['tracks']})==11
assert [t['id'] for t in manifest['tracks'] if 'organ' in t['instruments']]==['clockwork-crypt']
# Independent melodies should not share the old complete eight-bar phrases.
fingerprints={}
for t in TRACKS:
 phrases={json.dumps(t['melodies'][b:b+8]) for b in range(0,len(t['melodies'])-7,8)}
 for id,prior in fingerprints.items():assert not phrases.intersection(prior),(t['id'],id,'shared eight-bar theme')
 fingerprints[t['id']]=phrases
for t in manifest['tracks']:
 assert 90<=t['duration']<=180,t['id']
 assert t['loopStart'] is None or t['loopEnd']-t['loopStart']>=90
 for file in t['assets'].values():
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(PUBLIC/file)]))['streams'][0]
  assert int(probe['sample_rate'])==t['sampleRate'] and probe['channels']==2,file
  assert int(probe['duration_ts'])==t['frames'],file
 # Measure the actual exported MP3, including inter-sample peaks after encoding.
 result=subprocess.run(['ffmpeg','-hide_banner','-i',str(PUBLIC/t['preview']),'-af','loudnorm=print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
 loudness=json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])[0]
 assert float(loudness['input_tp'])<-.5,(t['id'],loudness)
 with wave.open(str(OUT/(t['id']+'-master.wav')),'rb') as w:
  assert w.getnframes()==t['frames']
  data=np.frombuffer(w.readframes(w.getnframes()),'<i2').reshape(-1,2).astype(np.float32)/32768
 sr=t['sampleRate'];loop=t['loopStartFrame']
 assert np.max(np.abs(data))<.8
 if loop is not None:
  jump=float(np.max(np.abs(data[loop]-data[-1])))
  assert jump<max(.02,t['adjacentDeltaP999']*2),(t['id'],jump)
 else:assert np.max(np.abs(data[-100:]))<.001
 sections=[]
 for i,s in enumerate(t['sections']):
  end=t['sections'][i+1]['time'] if i+1<len(t['sections']) else t['duration']
  chunk=data[round(s['time']*sr):round(end*sr)]
  sections.append({'name':s['name'],'rmsDbfs':round(20*math.log10(max(1e-9,float(np.sqrt(np.mean(chunk**2))))),2)})
 item={'id':t['id'],'duration':t['duration'],'loopSeconds':None if loop is None else t['duration']-t['loopStart'],
       'lufs':float(loudness['input_i']),'truePeakDbfs':float(loudness['input_tp']),
       'loudnessRange':float(loudness['input_lra']),'sections':sections}
 report.append(item);print(json.dumps(item),flush=True)
(OUT/'validation-v2.json').write_text(json.dumps(report,indent=2)+'\n')
