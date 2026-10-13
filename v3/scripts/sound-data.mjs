// Immutable synthesis parameters and music cues; no runtime code is translated.
import {SOUND_EFFECTS} from '../../v2/src/audio/sound-effects.js';
import {readFileSync,writeFileSync} from 'node:fs';
const str=JSON.stringify;
const voices=Object.entries(SOUND_EFFECTS).map(([name,layers])=>`${str(name)}: [${layers.map(v=>`{noise:${!!v.noise},frequency:${v.frequency??0},end:${v.end??0},duration:${v.duration},gain:${v.gain},delay:${v.delay??0},attack:${Math.min(v.attack??.003,v.duration*.3)},hold:${Math.min(v.hold??0,v.duration*.5)},wave:${str(v.type??'sine')},cutoff:${v.cutoff??0},filter:${str(v.filter??'lowpass')}}`).join(',')}]`).join(',\n');
const tracks=JSON.parse(readFileSync('public/music/manifest.json')).tracks.map(t=>`${str(t.id)}: (${str('/music/'+t.assets.mix)},${t.gain??1})`).join(',\n');
writeFileSync('cmd/play/sound-data.mbt',`// Authored sound parameters.\n///|\nlet sound_layers : Map[String,Array[Voice]] = {${voices}}\n///|\nlet music_tracks : Map[String,(String,Double)] = {${tracks}}\n`);
