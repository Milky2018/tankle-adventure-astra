"""Encode the browser-rendered A/B clips and build a local audition page."""
import html
import sys
import json
from pathlib import Path
import subprocess
import wave

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/audio/sfx-comparison'
GROUPS = [
    ('weapons', '武器', [('shot','主炮'),('mortar','迫击炮'),('laser','激光连射'),('magnet','磁力空扫'),('magnet-pull','磁力牵引'),('welder-shot','轻型敌炮'),('guard-shot','守卫炮'),('foundry-shot','重型 Boss 炮'),('rail-shot','狙击炮'),('seeker-shot','追踪弹')]),
    ('impacts', '命中、受伤与爆炸', [('hit','击中敌人'),('hurt','主角受伤'),('armor','装甲弹开'),('explode','爆炸'),('ram','冲撞'),('crate','障碍物破碎')]),
    ('machinery', '机械交互', [('lever','开关与卡扣'),('blocked','操作受阻'),('flotation','浮航展开'),('fuse','机械蓄能'),('vent','泄压排气'),('crusher','重压机械'),('couple','终局接驳')]),
    ('states', '警告与状态', [('clamp-warn','夹击预警'),('boss-lock','Boss 锁定'),('press-warn','重压预警'),('warn','敌人预警'),('heat','过热泄压'),('ready','冷却完成'),('repair','维修'),('unlock','获得与解锁'),('death','死亡')]),
    ('mix', '行驶与战场', [('engine','行驶 → 加速 → 凤凰 → 减速停车'),('spatial','左近 → 右近 → 右远 → 前方远处'),('battle','相同射击与命中时间线')]),
]

if '--warnings' in sys.argv:
    OUT = ROOT / 'output/audio/warning-comparison'
    GROUPS = [
        ('warnings', '警报音色', [('warn','发现威胁'),('boss-lock','锁定倒计时'),('clamp-warn','夹击预警'),('press-warn','重压预警'),('heat','过热警报'),('blocked','操作受阻')]),
        ('mix', '战斗中的警报', [('battle','连续炮击中的锁定与过热')]),
    ]


def run(*args):
    return subprocess.run(['ffmpeg','-hide_banner','-nostdin','-y',*map(str,args)], capture_output=True, text=True, check=True)


def loudness(source):
    measured = run('-i',source,'-af','loudnorm=I=-23:TP=-2:LRA=11:print_format=json','-f','null','-').stderr
    info, _ = json.JSONDecoder().raw_decode(measured[measured.rfind('{'):])
    return info


def normalize(source, target, target_i, info):
    # Fixed gain preserves the transient. Recheck short clips because the
    # loudness gate can select different blocks after a large level change.
    maximum = -2 - float(info['input_tp'])
    gain = min(target_i - float(info['input_i']), maximum)
    for _ in range(4):
        run('-i',source,'-af',f'volume={gain}dB','-ar','44100','-c:a','pcm_s16le',target)
        rendered = loudness(target)
        error = target_i - float(rendered['input_i'])
        if abs(error) <= .15: break
        gain = min(gain + error, maximum)
    if abs(error) > .3: raise RuntimeError(f'Loudness mismatch: {source.name}: {rendered}')
    return {**info, 'listen_i': rendered['input_i'], 'listen_tp': rendered['input_tp'], 'gain_db': gain}


def encode(source, target):
    run('-i',source,'-c:a','libmp3lame','-b:a','160k',target)


def join(paths, output):
    # Browser clips have the same stereo PCM layout. Add short gaps between A/B pairs.
    timeline=[]
    with wave.open(str(output),'wb') as dest:
        dest.setparams((2,2,44100,0,'NONE','not compressed'))
        seconds=0
        for index,(path,label) in enumerate(paths):
            with wave.open(str(path),'rb') as source:
                timeline.append({'time':round(seconds,2),'label':label})
                count=source.getnframes();dest.writeframes(source.readframes(count));seconds+=count/44100
            gap=.25 if index%2==0 else .65
            dest.writeframes(bytes(round(gap*44100)*4));seconds+=gap
    return timeline


metrics={}; timelines={}; sections=[]
for group,title,items in GROUPS:
    paths=[]; rows=[]
    for name,label in items:
        versions=[]
        measured = {version: loudness(OUT/f'{version}-{name}.wav') for version in ['before','after']} if group!='mix' else {}
        target_i = min([-23] + [float(info['input_i']) - 2.1 - float(info['input_tp']) for info in measured.values()])
        for version in ['before','after']:
            source=OUT/f'{version}-{name}.wav'
            target=OUT/f'{version}-{name}-listen.wav'
            # Keep real mix dynamics in distance, acceleration and battle demonstrations.
            if group=='mix':target=source
            else:metrics[f'{version}-{name}']=normalize(source,target,target_i,measured[version])
            encode(target,OUT/f'{version}-{name}.mp3')
            versions.append(target)
            paths.append((target,label+(' · 旧版' if version=='before' else ' · 新版')))
        pair=OUT/f'compare-{name}.wav'
        timelines[name]=join(list(zip(versions,[label+' · 旧版',label+' · 新版'])),pair)
        encode(pair,OUT/f'compare-{name}.mp3')
        note='原版与击中敌人共用音效' if name=='hurt' else '原版与空扫共用音效' if name=='magnet-pull' else '原版复用轻型敌炮' if name=='rail-shot' else '原版复用守卫炮（Guardian）' if name=='seeker-shot' else ''
        rows.append(f'<article><div><h3>{html.escape(label)}</h3><small>{note}</small></div><label>旧版<audio controls preload="metadata" src="before-{name}.mp3"></audio></label><label>新版<audio controls preload="metadata" src="after-{name}.mp3"></audio></label><button data-src="compare-{name}.mp3">连续 A/B</button></article>')
    groupwav=OUT/f'{group}-comparison.wav';timelines[group]=join(paths,groupwav)
    encode(groupwav,OUT/f'{group}-comparison.mp3')
    tracklist=' · '.join(f'{int(x["time"])//60}:{int(x["time"])%60:02} {x["label"]}' for x in timelines[group])
    sections.append(f'<section id="{group}"><header><h2>{title}</h2><button data-src="{group}-comparison.mp3">试听整组 · 旧 → 新</button></header><details><summary>整组播放顺序与时间</summary><p>{tracklist}</p></details>{"".join(rows)}</section>')
    print('Encoded',group,flush=True)

(OUT/'loudness.json').write_text(json.dumps(metrics,indent=2))
(OUT/'timeline.json').write_text(json.dumps(timelines,ensure_ascii=False,indent=2))
nav=''.join(f'<a href="#{key}">{title}</a>' for key,title,_ in GROUPS)
(OUT/'index.html').write_text('''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Furnace Born · 声效试听</title><style>
:root{color-scheme:dark;font:16px/1.55 system-ui;background:#102326;color:#e4e9da}*{box-sizing:border-box}body{max-width:1120px;margin:auto;padding:42px 24px 150px}h1{font-size:36px;margin:10px 0}h2{font-size:24px}h3{margin:0;font-size:16px}p,small{color:#a9c2ba}small{font-size:12px}nav{display:flex;gap:12px;flex-wrap:wrap;margin:28px 0}a{color:#e9c16f;text-decoration:none}nav a{padding:8px 14px;border:1px solid #476461;border-radius:5px}section{margin:40px 0;scroll-margin-top:15px}header{display:flex;align-items:center;justify-content:space-between;gap:12px}article{display:grid;grid-template-columns:1.1fr 1fr 1fr auto;gap:20px;align-items:center;border-top:1px solid #36514e;padding:18px 0}audio{width:100%;height:34px;display:block;margin-top:6px}label{color:#a9c2ba;font-size:12px}button{color:#18292b;background:#e9c16f;border:0;border-radius:4px;padding:9px 13px;font:inherit;font-size:13px;cursor:pointer}details{font-size:13px;color:#9ab3ac;margin-bottom:15px}#player{position:fixed;bottom:0;left:0;right:0;border-top:1px solid #52716a;background:#122b2eeF;padding:16px max(24px,calc((100vw - 1072px)/2));backdrop-filter:blur(12px)}#now{color:#e9c16f;font-size:14px}#player audio{max-width:1072px} .eyebrow{letter-spacing:3px;color:#e9c16f;font-size:12px}@media(max-width:780px){article{grid-template-columns:1fr 1fr;gap:10px}article>div{grid-column:1/-1}article>button{grid-column:1/-1}header{align-items:start}h1{font-size:28px}}
</style><span class="eyebrow">FURNACE BORN / SOUND LAB</span><h1>听见机械的重量</h1><p>每项按「旧版 → 新版」播放。前四组已做响度匹配，便于比较音色；「行驶与战场」保留游戏内总音量与远近关系。建议戴耳机试听方位。</p><p>主炮加入后坐回位；命中、受伤与装甲弹开分开表达。维修、解锁、磁力空扫与牵引也各有自己的声音。音乐未更换。</p><nav>'''+nav+'</nav>'+''.join(sections)+r'''<div id="player"><div id="now">选择单项或整组试听</div><audio id="main" controls preload="none"></audio></div><script>
let timeline={};fetch('./timeline.json').then(r=>r.json()).then(data=>timeline=data);const main=document.getElementById('main');main.addEventListener('timeupdate',()=>{const file=main.getAttribute('src')||'';const key=file.replace(/^compare-/, '').replace(/-comparison\.mp3$|\.mp3$/,'');const cue=timeline[key]?.findLast(c=>c.time<=main.currentTime);if(cue)document.getElementById('now').textContent=cue.label;});for(const b of document.querySelectorAll('[data-src]'))b.onclick=()=>{main.src=b.dataset.src;document.getElementById('now').textContent=(b.closest('article')?.querySelector('h3')||b.closest('section').querySelector('h2')).textContent+' · 旧版 → 新版';main.play();};document.addEventListener('play',e=>{if(e.target.tagName==='AUDIO')for(const a of document.querySelectorAll('audio'))if(a!==e.target)a.pause();},true);
</script></html>''')

if '--warnings' in sys.argv:
    page = OUT / 'index.html'
    content = page.read_text().replace('听见机械的重量', '听清危险的信号').replace('前四组已做响度匹配', '警报组已做响度匹配').replace('「行驶与战场」', '「战斗中的警报」')
    start = content.index('<p>主炮加入后坐回位')
    end = content.index('</p>', start) + 4
    content = content[:start] + '<p>旧版为本次修改前的实际声音。新版用电子音高与节奏表达危险，去掉警报中的炮击噪声、金属撞击和低音下坠。战斗对比保持相同武器声音和原始混音音量。</p>' + content[end:]
    page.write_text(content)
