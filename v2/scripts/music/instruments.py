"""Deterministic local instruments. No samples or external synthesizer required."""
from functools import lru_cache
import numpy as np
from scores import midi

SR=44100

def envelope(t,hold,attack,release):
 return np.minimum(t/attack,1)*np.maximum(0,np.minimum(1,(hold+release-t)/release))**2

@lru_cache(maxsize=192)
def synth(voice,pitch,hold):
 f=440*2**((midi(pitch)-69)/12)
 release={'lead':.16,'organ':.24,'strings':.65,'bass':.13,'harp':.55,'bell':1.35,
  'piano':1,'cello':.7,'flute':.35,'rhodes':1.3,'pluckbass':.22,'marimba':.4,
  'kalimba':.8,'synthlead':.18,'seq':.12,'pad':1.3,'fmglass':1.8,'sub':.16,
  'guitar':.16,'brass':.3,'spiccato':.12,'tremolo':.4,'metalbow':1.2,'nylon':.6}[voice]
 t=np.arange(round((hold+release)*SR),dtype=np.float32)/SR
 phase=2*np.pi*f*t;rng=np.random.default_rng(7919+midi(pitch))
 noise=rng.standard_normal(len(t)).astype(np.float32)
 if voice=='lead':
  phase+=.021*np.sin(2*np.pi*5.2*t)*np.minimum(1,t/.24)
  y=sum(a*np.sin(k*phase) for k,a in [(1,1),(2,.30),(3,.21),(4,.085),(5,.055),(7,.018)])*envelope(t,hold,.014,release)
 elif voice=='organ':
  y=sum(a*np.sin(k*phase) for k,a in [(1,1),(2,.34),(3,.27),(4,.15),(6,.08)])*envelope(t,hold,.015,release)
 elif voice in ['strings','cello','spiccato','tremolo']:
  attack=.16 if voice=='strings' else .07 if voice=='cello' else .009
  # Independent bow oscillators and gradual brightness give bowed strings a
  # moving envelope instead of the old constant additive-organ character.
  y=np.zeros(len(t),np.float32)
  for i,detune in enumerate([-.0035,.001,.0038]):
   bow=phase*(1+detune)+.055*np.sin(2*np.pi*(4.9+i*.21)*t+i)*np.minimum(1,t/.3)
   for k in range(1,min(16,int(15000/f))):
    y+=np.sin(bow*k+i*.7)*np.exp(-k/(4.5+4*np.minimum(t/.2,1)))/k**.85
  y*=.38*envelope(t,hold,attack,release)
  if voice=='spiccato':y*=np.exp(-t*7)
  if voice=='tremolo':y*=.6+.4*np.sin(2*np.pi*8.3*t)**2
 elif voice in ['bass','pluckbass','sub']:
  y=(np.sin(phase)+.35*np.sin(phase*2)+.12*np.sin(phase*3))*envelope(t,hold,.006,release)
  if voice!='sub':y*=np.exp(-t*(2.8 if voice=='pluckbass' else .65))
  if voice=='sub':y=np.tanh(y*2)*.85
 elif voice in ['harp','nylon','guitar']:
  y=np.zeros(len(t),np.float32)
  for k in range(1,min(30,int(15000/f))):
   pluck=np.sin(k*np.pi*.21)**2/k**1.35
   y+=pluck*np.sin(k*phase*(1+k*k*.000008))*np.exp(-t*(1.5+k*(.38 if voice=='nylon' else .8)))
  y+=noise*.018*np.exp(-t*80)
  if voice=='guitar':
   y=np.tanh(7*y)*.8*np.exp(-t*3.1)
   # Cabinet rolloff suppresses brittle high harmonics from distortion.
   for _ in range(5):y=(y+np.roll(y,1))*.5
  y*=envelope(t,hold,.003,release)
 elif voice in ['piano','rhodes']:
  if voice=='piano':y=sum(a*np.sin(k*phase)*np.exp(-t*d) for k,a,d in [(1,1,1.7),(2,.34,3),(3.001,.19,4),(4.004,.08,6),(7.015,.025,11)])
  else:
   y=np.sin(phase+1.5*np.sin(phase*2)*np.exp(-t*5))*np.exp(-t*1.6)
   y+=.2*np.sin(phase*3.002)*np.exp(-t*4)
   y*=.94+.06*np.sin(2*np.pi*4.1*t)
  y*=envelope(t,hold,.004,release)
 elif voice=='flute':
  phase+=.04*np.sin(2*np.pi*4.6*t)*np.minimum(t/.4,1)
  air=np.convolve(noise,np.ones(9,dtype=np.float32)/9,mode='same')
  y=(np.sin(phase)+.13*np.sin(phase*2)+.04*np.sin(phase*3)+air*.08)*envelope(t,hold,.07,release)
 elif voice in ['marimba','kalimba','bell']:
  ratios=[(1,1,3),(4,.23,13),(10,.07,25)] if voice=='marimba' else [(1,1,3.7),(2.76,.36,8),(5.4,.15,14)] if voice=='kalimba' else [(1,1,1.8),(2.007,.3,4),(4.79,.065,9)]
  y=sum(a*np.sin(k*phase)*np.exp(-t*d) for k,a,d in ratios if k*f<17000)*envelope(t,hold,.002,release)
 elif voice in ['synthlead','seq']:
  y=np.zeros(len(t),np.float32)
  for detune in [-.004,.004]:
   for k in range(1,min(22,int(15000/f))):
    y+=np.sin(phase*k*(1+detune))*np.exp(-k/(2+7*np.exp(-t*7)))/k
  y*=envelope(t,hold,.008,release)
  if voice=='seq':y*=np.exp(-t*7)
 elif voice=='brass':
  swell=np.minimum(t/.09,1)*(.7+.3*np.exp(-t*2))
  y=sum(np.sin(phase*k+.02*k*np.sin(2*np.pi*5.3*t))*np.exp(-k/(2+7*swell))/k**.7 for k in range(1,min(24,int(16000/f))))
  y*=envelope(t,hold,.035,release)*(.83+.17*np.sin(2*np.pi*2.1*t))
 elif voice=='pad':
  y=sum(np.sin(phase*(1+d)+.2*np.sin(2*np.pi*.2*t+i)) for i,d in enumerate([-.004,0,.003]))/3
  y+=.12*np.sin(phase*3)*np.sin(2*np.pi*.13*t)**2
  y*=envelope(t,hold,.45,release)
 elif voice=='fmglass':
  y=np.sin(phase+2.1*np.sin(phase*1.414)*np.exp(-t*.65))*np.exp(-t*.45)*envelope(t,hold,.012,release)
 else:
  # Inharmonic rubbing metal, voiced as an unstable swell rather than a bell.
  y=sum(np.sin(phase*r+.7*np.sin(2*np.pi*(.6+i*.2)*t))*a for i,(r,a) in enumerate([(1,.45),(1.013,.3),(2.71,.17),(4.11,.09)]))
  y*=envelope(t,hold,.32,release)*(.6+.4*np.sin(2*np.pi*6.7*t)**2)
 return y.astype(np.float32)

@lru_cache(maxsize=16)
def percussion(kind):
 duration={'kick':.4,'snare':.25,'gear':.08,'anvil':.7,'tom':.5,'hat':.15,
  'brush':.36,'taiko':1.3,'timpani':1.5,'crash':2.5,'slam':1.5,'tick':.12}[kind]
 t=np.arange(round(duration*SR),dtype=np.float32)/SR
 rng=np.random.default_rng(1009+sum(kind.encode()));noise=rng.standard_normal(len(t)).astype(np.float32)
 high=(noise-np.roll(noise,1))*.5
 if kind=='kick':y=np.sin(2*np.pi*(47*t+2.1*(1-np.exp(-t*37))))*np.exp(-t*13)+high*.08*np.exp(-t*110)
 elif kind=='tom':y=np.sin(2*np.pi*(87*t+.7*(1-np.exp(-t*25))))*np.exp(-t*12)
 elif kind=='snare':y=(high*.8+.5*np.sin(2*np.pi*179*t)*np.exp(-t*12))*np.exp(-t*19)
 elif kind=='gear':y=(np.sin(2*np.pi*1940*t)+.27*np.sin(2*np.pi*2771*t))*np.exp(-t*95)
 elif kind=='anvil':y=(np.sin(2*np.pi*740*t)+.38*np.sin(2*np.pi*1189*t)+.16*np.sin(2*np.pi*1903*t))*np.exp(-t*15)
 elif kind in ['hat','brush','tick']:
  y=high*np.exp(-t*(45 if kind=='hat' else 9 if kind=='brush' else 65))
  if kind=='tick':y+=.2*np.sin(2*np.pi*1350*t)*np.exp(-t*70)
 elif kind in ['taiko','timpani','slam']:
  f=58 if kind=='taiko' else 73 if kind=='timpani' else 39
  phase=2*np.pi*(f*t+1.4*(1-np.exp(-t*18)))
  y=(np.sin(phase)+.43*np.sin(phase*1.59)+.16*np.sin(phase*2.14))*np.exp(-t*(4.5 if kind=='timpani' else 6))
  y+=noise*.13*np.exp(-t*28)
  if kind=='slam':y+=high*.3*np.exp(-t*6)
 else:
  y=high*.55*np.exp(-t*2.4)
  y+=sum(np.sin(2*np.pi*f*t)*.035 for f in [2137,3451,4793,6311])*np.exp(-t*3.5)
 return (y*np.minimum(t/.002,1)).astype(np.float32)
