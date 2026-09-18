"""Separate rhythmic and instrumental grammar for each score."""
from scores import transpose

def arrange(track,note,drum):
 style=track['style'];beats=track['beats'];bar_count=len(track['chords'])
 for b,(root,fifth,upper,arp) in enumerate(track['chords']):
  energy=track['energy'][b];local=next(b-(s['bar']-1) for s in reversed(track['sections']) if b>=s['bar']-1)
  def n(stem,voice,pitch,at,duration,gain,pan=0,wet=.2):
   note(stem,voice,pitch,b,at,duration,gain*energy,pan,wet)
  def d(kind,at,gain,pan=0):drum(kind,b,at,gain*energy,pan)
  def chord(voice,at,duration,gain,stem='bed',shift=0,wet=.2):
   for k,p in enumerate(upper):n(stem,voice,transpose(p,shift),at+k*.009,duration,gain,(-.48 if k%2 else .48),wet)
  def tune(voice,gain,stem='melody',shift=0,gate=.88,wet=.23):
   at=0
   for p,duration in track['melodies'][b]:
    n(stem,voice,transpose(p,shift),at,duration*gate,gain,.08,wet);at+=duration

  if style=='clockwork':
   chord('strings',0,3.85,.023,wet=.3)
   for at in [0,2]:chord('organ',at,.66,.036)
   for j in range(8):
    n('bed','bass',root if j%3!=1 else fifth,j*.5,.38,.1 if j%2==0 else .067,wet=.08)
    n('bed','harp',arp[[0,2,1,3,2,1,3,2][j]],j*.5+.03,.3,.047,-.45 if j%2 else .45,.28)
   tune('lead',.15)
   for at,g in [(0,.14),(1.5,.065),(2,.11),(3.5,.075)]:d('kick',at,g)
   for at in [1,3]:d('snare',at,.072,.08)
   for j in range(8):d('gear',j*.5,.016 if j%2 else .021,-.6 if j%2 else .6)
   if b%4==0:d('anvil',0,.047,-.23)

  elif style=='station':
   chord('rhodes',0,2.8,.075,wet=.3)
   if local%2:chord('rhodes',2.66,.8,.033,shift=12,wet=.3)
   n('bed','pluckbass',root,0,1.6,.15,wet=.1)
   n('bed','pluckbass',fifth,2.66,.9,.08,wet=.1)
   tune('rhodes',.21,gate=.96,wet=.3)
   if energy>.8 and local%2==1:n('melody','nylon',arp[2],3.33,.6,.13,-.42,.3)
   for at in [1,3]:d('brush',at,.10,-.2)
   d('kick',0,.11);d('kick',2.66,.055)
   for at in [.66,1.66,2.66,3.66]:d('hat',at,.027,.48)

  elif style=='water':
   n('bed','pluckbass',root,0,1.3,.15,wet=.16)
   n('bed','pluckbass',fifth,1.5,1.1,.095,wet=.16)
   for j in range(6):
    n('bed','marimba',arp[[0,2,1,3,1,2][j]],j*.5,.37,.13 if j%3==0 else .085,-.4,.28)
    if energy>.7:n('bed','kalimba',transpose(arp[(j+1)%4],12),j*.5+.25,.28,.06,.5,.35)
   tune('flute',.14,gate=.93,wet=.32)
   if energy>.9 and local%2:n('melody','kalimba',transpose(upper[1],24),2,.7,.10,-.25,.38)
   for at in [0,1.5]:d('tom',at,.1,-.2)
   for at in [.5,1,2,2.5]:d('brush',at,.04,.4)

  elif style=='drive':
   chord('pad',0,3.8,.043,wet=.15)
   for j in range(16):
    at=j*.25
    n('bed','seq',root if j%4<3 else fifth,at,.18,.12 if j%4==0 else .08,wet=.06)
    if energy>.7:n('bed','seq',transpose(arp[[0,2,1,3][j%4]],12),at,.16,.054,-.4 if j%2 else .4,.12)
   tune('synthlead',.125,gate=.83,wet=.15)
   if energy>1.15:tune('synthlead',.03,shift=-12)
   for at in range(4):d('kick',at,.31 if energy>.7 else .13)
   for at in [1,3]:d('snare',at,.16,.05)
   for j in range(8):d('hat',j*.5+.25,.032 if j%2 else .05,.55)
   if local==0 and energy>.8:d('crash',0,.10,-.45)
   if local%8==7:
    for j in range(4):d('tom',3+j*.25,.075+j*.015,j*.2-.3)

  elif style=='stars':
   chord('pad',0,4.8,.065,wet=.65)
   n('bed','sub',root,0,4.6,.09,wet=.15)
   tune('fmglass',.095,gate=.98,wet=.6)
   if local%2==0:n('bed','bell',transpose(arp[1],24),3.5,.7,.028,-.6,.65)
   for at in [0,1.5,3.5]:n('pulse','seq',root,at,.32,.08,wet=.15)
   for at in [1,2.5,4.5]:d('tick',at,.045,-.5 if at==1 else .5)

  elif style=='breath':
   for at in [0,.75,1.5,2.75,3.5]:
    n('bed','sub',root if at<2 else fifth,at,.45,.16,wet=.05)
   chord('rhodes',.75,.5,.085,wet=.1);chord('rhodes',2.5,.7,.065,wet=.1)
   tune('brass',.09,gate=.62,wet=.12)
   if energy>1:chord('brass',3.25,.25,.024,shift=12,wet=.1)
   for at,g in [(0,.32),(.75,.12),(1.75,.22),(2.75,.14),(3.5,.18)]:d('kick',at,g)
   d('snare',2,.24);d('snare',3.75,.06)
   for j in range(8):d('hat',j*.5+.04*(j%2),.03 if j%2 else .047,.48)
   for at in [.5,3]:d('anvil',at,.019,-.55)
   if local%8==7:
    for j in range(3):d('tom',3+j*.33,.085+j*.02,-.3)

  elif style=='ruins':
   n('bed','cello',root,0,3.85,.085,-.35,.48)
   # Slow contrary voices, no generic arpeggio or drum backing.
   n('bed','strings',upper[1],0,3.75,.055,.5,.5)
   if energy>.75:n('bed','strings',transpose(upper[-1],12),1,2.8,.033,-.5,.48)
   tune('cello',.185,gate=.97,wet=.5)
   for at in [0,1.5,3]:n('pulse','spiccato',root,at,.45,.11,-.2,.2)

  elif style=='battle':
   # Double-tracked low power chords; the main hook is percussive and low.
   for at in ([0,.5,.75,1.5,2,2.5,3.25,3.5] if energy>.8 else [0,1.5,3]):
    for side in [-.7,.7]:
     n('bed','guitar',root,at+(.008 if side>0 else 0),.24,.20,side,.06)
     n('bed','guitar',fifth,at+(.011 if side>0 else 0),.22,.12,side,.06)
    n('bed','sub',transpose(root,-1),at,.24,.13,wet=.04)
   tune('guitar',.26,gate=.7,wet=.08)
   if energy>1.1:tune('brass',.075,gate=.72,wet=.12)
   kicks=[0,.75,1.5,2,2.75,3.5] if energy>.8 else [0,2.5]
   for at in kicks:d('kick',at,.38)
   for at in [1,3]:d('snare',at,.27,.08)
   for j in range(16):
    if j%2==0 or energy>1.1:d('hat',j*.25,.036 if j%2 else .055,.52)
   if local%4==0:d('slam',0,.21);d('crash',0,.13,-.5)
   if local%8==7:
    for j in range(6):d('tom',2.5+j*.25,.13+j*.015,j*.22-.55)
   if local%4==2:d('anvil',2.5,.055,-.48)

  elif style=='mirror':
   n('bed','sub',transpose(root,-1),0,3.3,.15,wet=.12)
   for at in [0,1,2]:
    n('bed','spiccato',root,at,.3,.22,-.5,.18)
    n('bed','spiccato',fifth,at+.5,.24,.14,.5,.18)
   if local%2==0:
    n('bed','metalbow',transpose(root,24),0,3.25,.047,-.6,.5)
    n('bed','metalbow',transpose(root,25),.3,2.9,.032,.6,.5)
   tune('tremolo',.12,gate=.82,wet=.35)
   if energy>1.1:tune('spiccato',.095,shift=-12,gate=.6,wet=.2)
   for at in [0,1.5,2.5]:d('taiko',at,.19)
   d('snare',1,.16);d('snare',3,.20)
   for j in range(14):d('tick',j*.25,.035 if j%2 else .07,-.5 if j%2 else .5)
   if local%4==0:d('slam',0,.19)
   if local%8==7:d('crash',3,.15,.5)

  elif style=='keeper':
   chord('strings',0,3.8,.055,wet=.4)
   n('bed','cello',transpose(root,-1),0,3.7,.10,-.15,.25)
   for j in range(8):
    n('bed','spiccato',arp[[0,2,1,3,0,1,2,3][j]],j*.5,.32,.13 if j%2==0 else .095,-.45 if j%2 else .45,.25)
    if energy>1.1:n('bed','spiccato',transpose(arp[(j+2)%4],12),j*.5+.25,.18,.066,.3,.3)
   tune('brass' if energy>.8 else 'cello',.17,gate=.92,wet=.35)
   if energy>.8:tune('brass',.055,shift=-12,gate=.9,wet=.3)
   if energy>1.1:tune('strings',.065,gate=.97,wet=.4)
   for at,g in [(0,.34),(1.5,.16),(2.5,.25),(3.5,.14)]:d('taiko',at,g)
   for at in [0,2]:d('timpani',at,.19)
   for at in [1,3]:d('snare',at,.14,-.32)
   if local%4==0:d('crash',0,.14,.55);d('slam',0,.21)
   if local%8==7:
    for j in range(8):d('timpani',2+j*.25,.07+j*.014,-.15)

  else:
   # The epilogue keeps the cinematic anchors but develops beneath the card.
   chord('piano',0,3.8,.058,wet=.33)
   chord('strings',0,3.85,.032,wet=.4)
   n('bed','pluckbass',root,0,3,.06,wet=.25)
   for j in range(4):n('bed','nylon',arp[[0,2,1,3][j]],j+.03,.8,.115,-.45,.3)
   tune('piano',.18,gate=.98,wet=.33)
   if energy>.8:tune('strings',.035,shift=-12,gate=.97,wet=.4)
 if track['kind']=='ending':
  beat=60/track['bpm']
  for seconds,pitch,voice,gain in [(9,'A3','piano',.065),(15,'F#5','bell',.05),(20,'G4','piano',.075),(26,'F#5','bell',.065)]:
   note('melody',voice,pitch,0,seconds/beat,1.8/beat,gain,-.12,.3)
