"""Eleven independent scores. Only Clockwork retains the historical chant.

Durations describe one introduction plus one complete form, never padded repeats
in the audition export. Section reprises change register, orchestration or rhythm.
"""
import json
from pathlib import Path

PCS={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
NAMES=['C','C#','D','Eb','E','F','F#','G','Ab','A','Bb','B']
def midi(p):return 12*(int(p[-1])+1)+PCS[p[0]]+(1 if '#' in p else -1 if 'b' in p else 0)
def transpose(p,n):
 if p=='-':return p
 m=midi(p)+n;return NAMES[m%12]+str(m//12-1)

def chord(symbol):
 # Explicit tonal material, with colour tones retained in the upper voices.
 split=2 if len(symbol)>1 and symbol[1] in '#b' else 1
 root=symbol[:split];quality=symbol[split:]
 intervals={'m':[0,3,7],'':[0,4,7],'m9':[0,3,7,14],'maj7':[0,4,7,11],
            '7':[0,4,7,10],'sus':[0,5,7],'5':[0,7,12],'dim':[0,3,6],
            'm6':[0,3,7,9],'add9':[0,4,7,14]}[quality]
 low=root+'2';upper=[transpose(root+'3',n) for n in intervals]
 return low,transpose(low,7),upper,[root+'3',transpose(root+'3',7),root+'4',transpose(root+'4',intervals[1])]

def melody(text,beats):
 bars=[]
 for bar in text.strip().split('|'):
  notes=[(n.split(':')[0],float(n.split(':')[1])) for n in bar.split()]
  assert abs(sum(d for _,d in notes)-beats)<1e-8,(bar,beats)
  bars.append(notes)
 return bars

def section(name,harmony,tune,beats=4,energy=1,register=0):
 chords=[chord(c) for c in harmony.split()];notes=melody(tune,beats)
 assert len(chords)==len(notes),(name,len(chords),len(notes))
 return dict(name=name,chords=chords,melodies=[[(transpose(p,register),d) for p,d in bar] for bar in notes],energy=energy)

def reprise(s,name,energy=1,register=0):
 return dict(s,name=name,energy=energy,melodies=[[(transpose(p,register),d) for p,d in bar] for bar in s['melodies']])

TRACKS=[]
def track(id,title,zh,region,bpm,style,genre,description,sections,beats=4,meter='4/4',kind='region',intro=2):
 chords=[];notes=[];form=[];bar_energy=[]
 for s in sections:
  form.append({'bar':len(chords)+1,'name':s['name'],'energy':s['energy']})
  chords.extend(s['chords']);notes.extend(s['melodies']);bar_energy.extend([s['energy']]*len(s['chords']))
 duration=(len(chords)+intro)*beats*60/bpm+(3 if kind=='ending' else 0)
 assert 90<=duration<=180,(id,duration)
 TRACKS.append(dict(id=id,title=title,zh=zh,region=region,bpm=bpm,style=style,genre=genre,
  description=description,kind=kind,introBars=intro,beats=beats,meter=meter,chords=chords,
  melodies=notes,sections=form,energy=bar_energy))

approved=json.loads((Path(__file__).parent/'clockwork.json').read_text())
original=dict(name='The original clockwork theme',energy=1,**approved)
clock_b=section('The clockmaker gallery','F C Gm A Bb Gm Edim A',
 'C6:1 A5:.5 F5:.5 G5:1 A5:1 | G5:1 E5:1 C5:1 G4:1 | Bb4:.5 D5:.5 G5:1 F5:1 D5:1 | E5:2 C#5:1 A4:1 | F5:1 D5:1 Bb4:.5 D5:.5 F5:1 | G5:1 D5:1 Bb4:1 G4:1 | E5:.5 G5:.5 Bb5:1 A5:1 G5:1 | E5:1 C#5:1 A4:1 -:1',energy=.75)
clock_c=section('Gears interlock','Dm F Bb A Gm Dm Edim A Dm Bb Gm A',
 'A4:.5 D5:.5 F5:.5 A5:.5 D6:1 A5:1 | C6:1 A5:1 G5:.5 F5:.5 A5:1 | Bb5:1 A5:.5 F5:.5 D5:1 F5:1 | E5:.5 C#5:.5 A4:1 G5:.5 E5:.5 C#5:1 | G5:.5 Bb5:.5 A5:1 G5:.5 F5:.5 D5:1 | F5:1 E5:.5 F5:.5 D5:1 A4:1 | G5:.5 Bb5:.5 A5:1 G5:1 E5:1 | C#5:1 E5:1 A5:1 -:1 | F5:.75 E5:.25 F5:.5 D5:.5 A4:1 D5:1 | F5:1 D5:1 Bb4:1 D5:1 | G5:1 F5:.5 D5:.5 Bb4:1 D5:1 | C#5:.5 E5:.5 G5:1 E5:1 A4:1',energy=1.12)
track('clockwork-crypt','Clockwork Crypt','齿轮古堡','foundry',96,'clockwork','Gothic clockwork',
 '保留的齿轮主题：拨弦、簧管与唯一的管风琴。新增钟匠回廊和齿轮合奏段。',[original,clock_b,clock_c],intro=4)

# A slow, swung electric-piano nocturne: added ninths, no minor-key chant.
station_a=section('Empty departures','Abmaj7 Fm9 Dbmaj7 Ebadd9 Cm Fm9 Bbm9 Eb7',
 'C5:1.5 Eb5:.5 Bb4:2 | Ab4:1 C5:1 G4:1 -:1 | F4:1.5 Ab4:.5 Eb5:1 C5:1 | Bb4:3 -:1 | G4:.5 Bb4:.5 D5:1 Eb5:2 | C5:1 Ab4:1 G4:1 F4:1 | Ab4:1 C5:1 F5:1 Eb5:1 | Db5:1 Bb4:1 G4:1 -:1',energy=.68)
station_b=section('A train once arrived','Dbmaj7 Cm Bbm9 Eb7 Abmaj7 Fm9 Dbmaj7 Eb7',
 'Ab4:1 Eb5:1 F5:1.5 Eb5:.5 | D5:1 Eb5:1 G5:2 | F5:1 Db5:1 C5:1 Bb4:1 | G4:1 Bb4:1 Db5:1 -:1 | Eb5:1 C5:1 Bb4:2 | C5:1 G4:1 Ab4:1 F4:1 | Eb4:1 Ab4:1 C5:1 F5:1 | G4:2 Bb4:1 -:1',energy=.95)
station_c=section('The vacant platform','Fm9 Dbmaj7 Abmaj7 Cm Bbm9 Fm9 Dbmaj7 Ebsus',
 'C5:2 -:1 Ab4:1 | F4:2 Eb4:1 -:1 | Eb5:2 C5:1 Bb4:1 | G4:3 -:1 | F4:1 Ab4:2 C5:1 | G4:2 Ab4:2 | F4:1 Eb4:1 Ab4:2 | Bb4:2 -:2',energy=.5)
track('platform-zero','Platform Zero','零号站台','transit',68,'station','Electric-piano nocturne',
 '降A大调的慢拍电钢琴、拨奏低音与刷奏；空站台里的温暖夜曲。',[station_a,station_b,station_c,reprise(station_a,'Distant departures',.8)],intro=2)

# Six-eight water dance, pentatonic material and wooden/metallic interlocking voices.
water_a=section('First ripples','Gadd9 Em Cmaj7 Dsus Gadd9 Bm Cmaj7 D',
 'B4:.5 D5:.5 E5:1 D5:1 | B4:1 G4:.5 A4:.5 B4:1 | E5:1 G5:1 D5:1 | A4:1 D5:1 -:1 | G5:1 D5:.5 B4:.5 A4:1 | D5:1 F#5:.5 A5:.5 F#5:1 | E5:.5 G5:.5 B5:1 A5:1 | F#5:1 E5:1 D5:1',3,.75)
water_b=section('Canal current','Cmaj7 Gadd9 Am D Em Cmaj7 Gadd9 Dsus',
 'G5:1 E5:1 B4:1 | D5:.5 G5:.5 A5:1 B5:1 | A5:1 E5:1 C5:1 | D5:1 A4:2 | B4:.5 D5:.5 E5:1 G5:1 | E5:1 D5:.5 B4:.5 G4:1 | B4:1 A4:1 G4:1 | A4:1 D5:1 -:1',3,1)
water_c=section('Below the surface','Em Bm Cmaj7 Am Em Cmaj7 Am Dsus',
 'G4:1 B4:1 E5:1 | F#5:1 D5:2 | E5:1 B4:1 G4:1 | A4:2 E4:1 | B4:1 G4:.5 E4:.5 G4:1 | B4:1 E5:2 | C5:1 B4:1 A4:1 | D5:2 -:1',3,.5)
track('water-remembers','Water Remembers','水的记忆','garden',84,'water','6/8 mallet water dance',
 '六八拍木琴、拇指琴和气息长笛；水波、暗渠和开阔水面形成三个段落。',
 [water_a,water_b,water_c,reprise(water_a,'Sun on the water',.9,12),reprise(water_b,'Open water',1.1),reprise(water_c,'Return current',.65)],3,'6/8',intro=4)

# A fast analogue-synth track, sparse hook against a propulsive sequencer.
flight_a=section('Ignition','F#m D A E F#m D Bm C#5',
 'C#5:.5 -:.5 F#5:1 E5:.5 C#5:.5 -:1 | A4:1 F#5:1 E5:1 D5:1 | E5:.5 -:.5 A5:1 C#6:1 B5:1 | G#5:1 E5:1 B4:1 -:1 | F#5:.5 C#5:.5 F#5:1 A5:.5 G#5:.5 F#5:1 | D5:1 A5:1 F#5:1 E5:1 | D5:.5 F#5:.5 B5:1 A5:1 F#5:1 | G#5:1 C#5:1 -:2',energy=.85)
flight_b=section('Test straight','A E Bm D A E D C#5',
 'E6:2 C#6:1 B5:1 | G#5:1 B5:1 E6:1 B5:1 | F#5:1 D5:1 B4:2 | A5:1 F#5:1 E5:1 D5:1 | C#6:1 E6:1 A5:1 -:1 | B5:1 G#5:1 E5:1 B4:1 | F#5:1 A5:1 E5:1 D5:1 | C#5:.5 G#5:.5 C#6:1 B5:1 G#5:1',energy=1.1)
flight_c=section('Engine suspended','Dmaj7 A E F#m Dmaj7 A Bm C#5',
 'F#5:3 E5:1 | C#5:2 A4:2 | B4:2 G#4:2 | A4:3 -:1 | C#5:2 F#5:2 | E5:2 C#5:2 | D5:2 F#5:2 | G#5:3 -:1',energy=.42)
track('flight-test','Flight Test','试飞轨道','testworks',140,'drive','Analogue synth / motorik',
 '疾驰的模拟合成器与四拍底鼓；中途悬停蓄力，再进入双层琶音冲刺。',
 [flight_a,flight_b,reprise(flight_a,'Acceleration',1),flight_c,reprise(flight_b,'Phoenix release',1.2),reprise(flight_a,'Open rail',1.1,12),reprise(flight_b,'Full throttle',1.25),reprise(flight_a,'Banked return',.9)],intro=4)

# Five-four spectral ambient; long intervals and FM tones, no common chant cadence.
light_a=section('An unanswered signal','B5 F#5 Emaj7 C#5 B5 Amaj7 Emaj7 F#sus',
 'F#5:2 -:2 C#6:1 | A#5:2 -:3 | G#5:1 B5:2 -:2 | D#6:3 C#6:1 -:1 | B5:2 F#5:1 -:2 | E5:3 C#5:1 -:1 | B4:2 F#5:2 -:1 | C#6:1 -:4',5,.65)
light_b=section('The glass constellation','Emaj7 B5 C#5 Amaj7 Emaj7 G#5 C#5 F#sus',
 'G#5:2 D#6:2 B5:1 | F#6:3 C#6:1 -:1 | G#5:2 C#6:2 D#6:1 | E6:2 C#6:1 B5:2 | G#5:2 F#5:2 E5:1 | D#5:3 -:2 | C#5:1 G#5:2 -:2 | F#5:2 C#6:1 -:2',5,.92)
light_c=section('Vacuum','B5 Amaj7 Emaj7 C#5 B5 Emaj7 Amaj7 F#sus',
 'B4:3 -:2 | E5:2 -:3 | D#5:2 B4:1 -:2 | C#5:4 -:1 | F#4:3 -:2 | G#4:2 B4:2 -:1 | C#5:3 E5:1 -:1 | F#5:2 -:3',5,.4)
track('unanswered-light','Unanswered Light','无人应答的光','optics',80,'stars','5/4 spectral ambient',
 '五四拍的冷色FM信号、玻璃泛音与缓慢移动的音场；不使用风琴或常规鼓组。',
 [light_a,light_b,light_c,reprise(light_a,'Signal returns',.8)],5,'5/4',intro=2)

heart_a=section('Pressure valves','Cm Ab Fm G5 Cm Bb Ab G5',
 'G4:.75 Bb4:.25 C5:.5 -:.5 Eb5:1 C5:1 | Eb5:1 C5:.5 Ab4:.5 G4:1 -:1 | C5:.5 F5:.5 Eb5:1 C5:.5 Ab4:.5 F4:1 | D5:1 G4:1 -:2 | C5:.75 G4:.25 Bb4:.5 C5:.5 Eb5:1 G5:1 | F5:1 D5:1 Bb4:.5 D5:.5 F5:1 | Eb5:1 C5:1 Ab4:1 -:1 | D5:.5 G5:.5 F5:1 D5:1 G4:1',energy=.9)
heart_b=section('The pump room','Eb Bb Fm Ab Eb Bb Ab G5',
 'G5:1 Bb5:1 G5:1 Eb5:1 | F5:1 D5:.5 Bb4:.5 F5:2 | Ab5:1 G5:1 F5:1 C5:1 | Eb5:2 C5:1 Ab4:1 | G4:.5 Bb4:.5 Eb5:1 G5:1 Bb5:1 | D6:1 Bb5:1 F5:1 D5:1 | C5:1 Eb5:1 Ab5:1 G5:1 | D5:2 G4:1 -:1',energy=1.15)
heart_c=section('Pressure release','Fm Cm Ab G5 Fm Ab Bb G5',
 'C5:2 Ab4:2 | G4:1 C5:3 | Eb5:2 C5:2 | D5:1 G4:1 -:2 | Ab4:2 C5:1 F5:1 | Eb5:2 C5:2 | D5:1 F5:1 Bb5:1 F5:1 | D5:2 -:2',energy=.5)
track('second-heart','Second Heart','第二颗心脏','circulation',110,'breath','Industrial trip-hop',
 '半拍重鼓、失真贝斯与短促铜管；阀门的切分节奏构成新的心跳。',
 [heart_a,heart_b,heart_c,reprise(heart_a,'Repressurise',1),reprise(heart_b,'All pumps working',1.2),reprise(heart_c,'Return valve',.65)],intro=4)

ruins_a=section('The abandoned carriers','Bm Gmaj7 Em F#sus Bm Dmaj7 Em F#5',
 'F#3:2 B3:1 C#4:1 | D4:3 B3:1 | G3:2 E3:2 | F#3:3 -:1 | B3:2 F#4:2 | E4:1 D4:2 A3:1 | G3:2 B3:1 E4:1 | C#4:2 F#3:1 -:1',energy=.65)
ruins_b=section('Names without voices','Dmaj7 A Gmaj7 Em Bm Gmaj7 Em F#sus',
 'A3:1 D4:1 F#4:2 | E4:2 C#4:1 A3:1 | B3:1 D4:1 G4:2 | F#4:1 E4:1 B3:2 | C#4:1 D4:1 F#4:2 | E4:1 D4:1 B3:2 | G3:1 B3:1 E4:2 | C#4:2 -:2',energy=.92)
ruins_c=section('An empty cradle','Em Bm Gmaj7 Dmaj7 Em Gmaj7 Bm F#sus',
 'E3:3 B3:1 | F#3:2 D3:2 | G3:2 A3:1 B3:1 | F#3:3 -:1 | E3:2 G3:1 B3:1 | D4:2 B3:1 G3:1 | F#3:2 B3:2 | C#4:1 F#3:2 -:1',energy=.45)
track('those-before-us','Those Before Us','先行者','furnace',64,'ruins','Low-string elegy',
 '裸露的大提琴与中提琴缓慢对答；没有鼓组和风琴，留下走向终点的重量。',
 [ruins_a,ruins_b,ruins_c,reprise(ruins_a,'Carrying their memory',.85)],intro=2)

# Battle I: palm-muted fifths, heavy breakbeat and short horn orders. No reed lead.
iron_a=section('Steel impact','E5 E5 F5 E5 C5 D5 F5 B5',
 'E3:.5 -:.5 E3:.5 G3:.5 B3:1 -:1 | E3:.75 E3:.25 G3:.5 A3:.5 B3:.5 G3:.5 E3:1 | F3:1 C4:.5 B3:.5 A3:1 F3:1 | E3:.5 B3:.5 E4:1 D4:.5 B3:.5 E3:1 | C4:1 G3:1 E3:1 G3:1 | D4:.5 A3:.5 D4:1 C4:.5 A3:.5 D3:1 | F3:1 C4:1 F4:1 E4:1 | B3:.5 F#3:.5 B3:1 A3:1 F#3:1',energy=1)
iron_b=section('No retreat','C5 D5 E5 E5 C5 A5 F5 B5',
 'G4:1 E4:1 C4:1 G3:1 | A4:.5 F#4:.5 D4:1 A3:2 | B3:.5 E4:.5 G4:1 F#4:.5 E4:.5 B3:1 | E4:1 G4:1 B4:1 A4:1 | G4:2 E4:1 C4:1 | E4:1 A4:1 G4:1 E4:1 | F4:.5 E4:.5 C4:1 A3:1 F3:1 | F#4:1 B3:1 -:2',energy=1.2)
iron_c=section('Hydraulic weight','E5 F5 E5 C5 E5 D5 C5 B5',
 'E3:2 -:2 | F3:1 E3:1 -:2 | B2:1 E3:3 | C3:2 G3:2 | E3:2 B3:2 | D3:1 A3:1 D4:2 | C4:2 G3:1 E3:1 | B2:1 F#3:1 B3:1 -:1',energy=.55)
track('iron-vigil','Iron Vigil','钢铁守夜','foundry',148,'battle','Industrial metal / breakbeat',
 '闷音动力和弦、重型破拍和铁砧冲击；低频停顿后连续推进，摆脱原来的轻巧古堡旋律。',
 [iron_a,reprise(iron_a,'Closing jaws',1.12),iron_b,reprise(iron_b,'Crossfire',1.25,12),iron_c,reprise(iron_c,'Pressure rising',.85),reprise(iron_a,'Hammer charge',1.25),reprise(iron_b,'Furnace surge',1.3),reprise(iron_b,'Last resistance',1.15),reprise(iron_a,'Steel return',1.1)],kind='battle',intro=4)

# Battle II: 7/8 asymmetry, semitone pursuit, dissonant bowed-metal swells.
mirror_a=section('The hunter wakes','C#5 D5 C#5 G5 C#5 A5 D5 G#5',
 'C#5:.5 D5:.5 C#5:.5 G4:.5 C#5:1 -:.5 | D5:.5 Eb5:.5 D5:1 A4:1 -:.5 | C#5:.5 -:.5 G5:.5 C#6:1 G5:1 | G5:1 Ab5:.5 D5:1 G4:1 | E5:.5 D5:.5 C#5:.5 G4:.5 C#5:1 -:.5 | E5:1 A5:.5 Bb5:.5 E5:1 -:.5 | D5:.5 Eb5:.5 A5:1 D6:1 -:.5 | G#5:1 D5:.5 C#5:.5 G#4:1 -:.5',3.5,.9)
mirror_b=section('No reflection is safe','F#5 G5 C#5 D5 A5 G5 D5 G#5',
 'F#5:.5 G5:.5 C#6:1 C6:.5 G5:1 | D6:1 Db6:.5 G5:.5 Ab5:1 -:.5 | G5:.5 C#6:.5 D6:1 C#6:1 -:.5 | A5:.5 D6:.5 Eb6:.5 D6:.5 A5:1 -:.5 | E6:1 Bb5:.5 A5:.5 E5:1 -:.5 | D5:.5 G5:.5 Ab5:1 D6:1 -:.5 | A5:1 Eb5:.5 D5:.5 A4:1 -:.5 | G#4:.5 D5:.5 G#5:1 A5:.5 G#5:1',3.5,1.2)
mirror_c=section('The light goes out','C#5 G5 D5 G#5 C#5 A5 G5 G#5',
 'C#4:2 -:1.5 | G4:1 -:2.5 | D4:2 -:1.5 | G#4:1 -:2.5 | C#5:1 G4:1 -:1.5 | E5:1 Bb4:1 -:1.5 | G4:.5 Ab4:.5 G4:1 -:1.5 | D5:1 G#4:1 -:1.5',3.5,.42)
track('mirror-hunt','Mirror Hunt','镜中追猎','optics',140,'mirror','7/8 horror pursuit',
 '七八拍追逐、半音擦弦和失谐金属；短暂抽空后突然合击，形成不稳定的恐怖感。',
 [mirror_a,reprise(mirror_a,'Second shadow',1.05),mirror_b,reprise(mirror_b,'Fracture',1.25),mirror_c,reprise(mirror_c,'Footsteps return',.78),reprise(mirror_a,'Pursuit resumes',1.18),reprise(mirror_b,'All mirrors awake',1.3),reprise(mirror_b,'Closing distance',1.15),reprise(mirror_a,'Unfinished pursuit',1)],3.5,'7/8',kind='battle',intro=4)

# Battle III: broad brass intervals, string ostinati and orchestral percussion.
keeper_a=section('The last gate','Cm Ab Eb Bb Cm Fm Ab G7',
 'C4:1 G4:1 Eb5:2 | C5:1 Ab4:1 Eb4:2 | G4:1 Bb4:1 Eb5:1 G5:1 | F5:2 D5:1 Bb4:1 | G4:.5 C5:.5 Eb5:1 D5:1 C5:1 | Ab4:1 C5:1 F5:2 | Eb5:1 C5:1 Ab4:1 Eb4:1 | D5:1 B4:1 G4:2',energy=.9)
keeper_b=section('A city at stake','Ab Eb Bb Cm Fm Ab Ddim G7',
 'Eb5:1 Ab5:1 G5:1 Eb5:1 | Bb5:2 G5:1 Eb5:1 | F5:1 Bb5:1 A5:1 F5:1 | G5:2 Eb5:1 C5:1 | F5:1 Ab5:1 C6:1 Bb5:1 | Ab5:1 G5:1 Eb5:1 C5:1 | F5:1 Ab5:1 D6:1 C6:1 | B5:2 G5:1 D5:1',energy=1.18)
keeper_c=section('The cost of keeping watch','Fm Dbmaj7 Ab Eb Fm Dbmaj7 Ddim Gsus',
 'C4:2 F4:2 | Ab4:2 F4:1 Db4:1 | Eb4:1 Ab4:1 C5:2 | Bb4:2 G4:2 | Ab4:1 C5:1 F5:2 | Eb5:1 Db5:1 Ab4:2 | F4:1 Ab4:1 D5:2 | D5:2 G4:1 -:1',energy=.48)
keeper_d=section('The living answer','Eb Bb Cm Ab Fm Ab Gsus G7',
 'G5:1 Bb5:1 Eb6:2 | D6:1 Bb5:1 F5:2 | G5:1 Eb5:1 C5:1 G4:1 | Ab4:1 Eb5:1 Ab5:2 | C6:1 Ab5:1 F5:1 C5:1 | Eb5:1 Ab5:1 G5:1 Eb5:1 | D5:.5 G5:.5 C6:1 B5:1 A5:1 | B5:1 G5:1 D5:1 G4:1',energy=1.28)
track('last-keeper','The Last Keeper','最后的守望者','furnace',96,'keeper','Symphonic siege',
 '低铜管、弦乐急奏、定音鼓与大鼓；由围城推进到悲剧慢段，再进入完整终战高潮。',
 [keeper_a,reprise(keeper_a,'The siege advances',1),keeper_b,keeper_c,reprise(keeper_c,'Gathering resolve',.75,12),keeper_d,reprise(keeper_b,'Final stand',1.3),reprise(keeper_a,'The gate still stands',1.12)],kind='battle',intro=4)

ending_a=section('The city wakes','Dadd9 Gmaj7 Em A Dadd9 Bm Gmaj7 A',
 'F#4:2 A4:1 D5:1 | B4:2 A4:1 G4:1 | G4:1 B4:1 E5:2 | C#5:2 B4:1 A4:1 | A4:1 D5:1 F#5:2 | E5:1 D5:1 B4:2 | G4:1 B4:1 D5:2 | E5:2 C#5:1 A4:1',energy=.65)
ending_b=section('Morning through the windows','Gmaj7 Dadd9 Em A Bm Gmaj7 Em A',
 'B4:1 D5:1 G5:2 | F#5:2 E5:1 D5:1 | B4:1 E5:1 G5:2 | E5:1 C#5:1 A4:2 | F#4:1 B4:1 D5:2 | B4:1 D5:1 G5:2 | F#5:1 E5:1 B4:1 G4:1 | A4:2 E5:1 C#5:1',energy=.9)
ending_c=section('The streets without us','Bm F#m Gmaj7 Dadd9 Em Bm Gmaj7 Asus',
 'D5:2 B4:2 | C#5:2 A4:2 | B4:1 A4:1 G4:2 | F#4:1 A4:1 D5:2 | E5:2 G5:2 | F#5:2 D5:2 | B4:1 D5:1 G5:2 | E5:2 -:2',energy=.55)
ending_d=section('A finite horizon','Gmaj7 Dadd9 Em A Gmaj7 A Dadd9 Dadd9',
 'G5:2 D5:1 B4:1 | F#5:2 A5:2 | G5:1 E5:1 B4:2 | C#5:1 E5:1 A5:2 | B5:1 A5:1 G5:1 D5:1 | E5:1 C#5:1 A4:2 | F#4:1 A4:1 D5:2 | D5:4',energy=.65)
track('morning-without-us','Morning Without Us','我们之后的清晨','ending',72,'ending','Piano / chamber epilogue',
 '明亮的钢琴、尼龙拨弦与柔和弦乐；镜头结束后继续展开，最终自然收束。',
 [ending_a,ending_b,ending_c,ending_d],kind='ending',intro=0)
