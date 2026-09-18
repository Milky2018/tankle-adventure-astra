"""Render authored scores locally with NumPy; ffmpeg only encodes audio."""
from pathlib import Path
import json, math, struct, subprocess, sys, wave
import numpy as np
from scores import TRACKS
from instruments import SR, synth, percussion
from arrangements import arrange

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/music/soundtrack'; PUBLIC=ROOT/'public/music'
OUT.mkdir(parents=True,exist_ok=True); PUBLIC.mkdir(parents=True,exist_ok=True)

def write_wav(path,data,loop=None):
 pcm=np.round(np.clip(data,-1,1)*32767).astype('<i2')
 with wave.open(str(path),'wb') as w:
  w.setnchannels(2);w.setsampwidth(2);w.setframerate(SR);w.writeframes(pcm.tobytes())
 if loop:
  payload=struct.pack('<9I',0,0,round(1e9/SR),60,0,0,0,1,0)+struct.pack('<6I',0,0,loop[0],loop[1]-1,0,0)
  with path.open('r+b') as f:
   f.seek(0,2);f.write(b'smpl'+struct.pack('<I',len(payload))+payload);size=f.tell();f.seek(4);f.write(struct.pack('<I',size-8))

def encode(source,target,mp3=False):
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(source),'-map_metadata','-1',
                 *(['-codec:a','libmp3lame','-b:a','192k'] if mp3 else ['-codec:a','flac','-compression_level','8']),str(target)],check=True)

def convolve_room(signal,ir,cyclic):
 # Bounded overlap-add avoids allocating a multi-minute complex FFT.
 block=131072;nfft=1<<(block+len(ir)-1).bit_length()
 kernel=np.fft.rfft(ir,nfft);result=np.zeros(len(signal)+len(ir)-1,np.float32)
 for at in range(0,len(signal),block):
  chunk=signal[at:at+block];count=len(chunk)+len(ir)-1
  result[at:at+count]+=np.fft.irfft(np.fft.rfft(chunk,nfft)*kernel,nfft)[:count].astype(np.float32)
 if cyclic:result[:len(ir)-1]+=result[len(signal):]
 return result[:len(signal)]

def render(track):
 id=track['id'];style=track['style'];beat=60/track['bpm'];bars=len(track['chords']);beats=track['beats']
 ending=track['kind']=='ending';battle=track['kind']=='battle'
 length=round(bars*beats*beat*SR)+(3*SR if ending else 0)
 intro=round(track['introBars']*beats*beat*SR)
 rng=np.random.default_rng(180926+sum(id.encode()))
 buses={k:np.zeros((length,2),np.float32) for k in ['bed','melody','pulse']}
 sends={k:np.zeros((length,2),np.float32) for k in buses};score=[];instruments=set()
 def place(stem,y,at,gain,pan,wet):
  at=round(at*beat*SR)
  stereo=y[:,None]*np.array([math.cos((pan+1)*math.pi/4),math.sin((pan+1)*math.pi/4)],np.float32)*gain
  offset=0
  while offset<len(y):
   start=(at+offset)%length;count=min(length-start,len(y)-offset)
   if ending and at+offset>=length:break
   buses[stem][start:start+count]+=stereo[offset:offset+count]
   sends[stem][start:start+count]+=stereo[offset:offset+count]*wet
   offset+=count
 def note(stem,voice,pitch,b,at,duration,gain,pan=0,wet=.24):
  if pitch=='-':return
  instruments.add(voice)
  place(stem,synth(voice,pitch,round(duration*beat,6)),b*beats+at,gain,pan,wet)
  score.append([stem,voice,pitch,b*beats+at,duration])
 def drum(kind,b,at,gain,pan=0):
  instruments.add(kind);place('pulse',percussion(kind),b*beats+at,gain,pan,.18 if style=='keeper' else .08)
 arrange(track,note,drum)
 quiet=style in ['station','stars','ruins','ending']
 room_seconds={'clockwork':2.2,'station':1.8,'water':2.4,'drive':.8,'stars':4.2,
  'breath':.8,'ruins':3.2,'battle':.65,'mirror':2.8,'keeper':2.4,'ending':2.8}[style]
 ir_len=round(SR*room_seconds);t=np.arange(ir_len,dtype=np.float32)/SR
 irs=[]
 for c in range(2):
  ir=rng.standard_normal(ir_len).astype(np.float32)*np.exp(-t*7/room_seconds)
  for _ in range(6):ir=(ir+np.roll(ir,1))*.5
  ir[:round(.026*SR)]=0;ir*=.3/np.sqrt(np.sum(ir**2))
  for seconds,amp in [(.039,.18),(.067,.12),(.107,.07)]:ir[round((seconds+c*.005)*SR)]+=amp
  irs.append(ir)
 for stem in buses:
  for c in range(2):buses[stem][:,c]+=convolve_room(sends[stem][:,c],irs[c],not ending)
 del sends
 pulse_level={'clockwork':.7,'station':.32,'water':.45,'drive':.65,'stars':.12,
  'breath':.65,'ruins':0,'ending':0}.get(style,1)
 mix=buses['bed']+buses['melody']+buses['pulse']*pulse_level
 full=buses['bed']+buses['melody']+buses['pulse']
 target=-18.5 if quiet else -16.8 if not battle else -15.2
 gain=10**(target/20)/float(np.sqrt(np.mean(mix**2)))
 if battle:
  # One continuous saturating bus for the fixed battle mix. Regional stems
  # retain a shared linear gain so exploration/combat layering remains exact.
  mix=.79*np.tanh(mix*gain/.79)
  peak=float(np.max(np.abs(mix)))
 else:
  gain=min(gain,.79/float(np.max(np.abs(full))))
  for k in buses:buses[k]*=gain
  mix*=gain;peak=float(np.max(np.abs(full*gain)))
 del full
 if ending:
  fade=np.minimum(np.arange(length,dtype=np.float32)/(SR*.6),1)*np.minimum(np.arange(length,dtype=np.float32)[::-1]/(SR*4),1)
  mix*=fade[:,None]
 def with_intro(a):
  if not intro:return a
  head=a[-intro:].copy();head*=np.minimum(np.arange(intro,dtype=np.float32)/(SR*1.1),1)[:,None]
  return np.concatenate((head,a))
 loop=(intro,intro+length) if not ending else None;assets={}
 if track['kind']=='region':
  for stem,data in buses.items():
   name=f'{id}-{stem}';path=OUT/(name+'.wav');write_wav(path,with_intro(data),loop)
   encode(path,PUBLIC/(name+'.flac'));assets[stem]=name+'.flac'
 else:
  path=OUT/(id+'.wav');write_wav(path,with_intro(mix),loop);encode(path,PUBLIC/(id+'.flac'));assets['mix']=id+'.flac'
 master=OUT/(id+'-master.wav');write_wav(master,with_intro(mix),loop)
 # A standalone audition is one complete form, also within 90–180 seconds.
 # The game and audition deck use the lossless sources without this final fade.
 preview=with_intro(mix).copy()
 if not ending:preview[-2*SR:]*=np.linspace(1,0,2*SR,dtype=np.float32)[:,None]
 path=OUT/(id+'-preview.wav');write_wav(path,preview);encode(path,PUBLIC/(id+'-preview.mp3'),True)
 rms=float(np.sqrt(np.mean(mix**2)))
 seam=float(np.max(np.abs(mix[0]-mix[-1]))) if not ending else 0
 diffs=np.abs(np.diff(mix,axis=0));p999=float(np.quantile(diffs,.999))
 assert np.isfinite(mix).all() and peak<.8,(id,peak)
 assert ending or seam<max(.02,p999*2),(id,seam,p999)
 meta={k:track[k] for k in ['id','title','zh','region','bpm','kind','description','genre','meter']}
 meta.update(sampleRate=SR,frames=intro+length,duration=(intro+length)/SR,
  loopStartFrame=intro if not ending else None,loopEndFrameExclusive=intro+length if not ending else None,
  loopStart=intro/SR if not ending else None,loopEnd=(intro+length)/SR if not ending else None,
  assets=assets,preview=id+'-preview.mp3',explorationPulse=pulse_level,
  sections=[dict(s,time=intro/SR+(s['bar']-1)*beats*beat) for s in track['sections']],
  instruments=sorted(instruments),peakDbfs=20*math.log10(peak),rmsDbfs=20*math.log10(rms),
  seamDelta=seam,adjacentDeltaP999=p999)
 assert 90<=meta['duration']<=180
 if ending:meta['cues']=[{'time':0,'name':'Coupling'},{'time':9,'name':'Rail'},{'time':15,'name':'Garden'},{'time':20,'name':'Awakening'},{'time':26,'name':'Title'},{'time':meta['duration'],'name':'Silence'}]
 (OUT/(id+'-score.json')).write_text(json.dumps(score,indent=2)+'\n')
 (OUT/(id+'.json')).write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'id':id,'duration':meta['duration'],'peak':meta['peakDbfs'],'seam':seam,'instruments':meta['instruments']}),flush=True)
 synth.cache_clear()
 return meta

if __name__=='__main__':
 selected=set(sys.argv[1:]);known={t['id'] for t in TRACKS}
 if selected-known:raise SystemExit('Unknown track: '+', '.join(sorted(selected-known)))
 for t in TRACKS:
  if not selected or t['id'] in selected:render(t)
 all_meta=[json.loads((OUT/(t['id']+'.json')).read_text()) for t in TRACKS if (OUT/(t['id']+'.json')).exists()]
 (PUBLIC/'manifest.json').write_text(json.dumps({'title':'The City Remembers','version':2,'sampleRate':SR,
  'attribution':'Clockwork Crypt retains the historical Dies irae incipit. Ten independent new compositions; locally synthesized instruments. No game recordings or external samples.',
  'tracks':all_meta},ensure_ascii=False,indent=2)+'\n')
