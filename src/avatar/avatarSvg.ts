/**
 * Avatar-Zeichnung als SVG-String (Port von avatar_v3.js aus der Demo). Zuständig: avatar-art.
 * Ebenen (layer) erlauben getrennte Animation in React Native: ground (Schatten), aura, body.
 */
import type { Mood } from '../types.ts';
import { STAGE_COLORS, type StageColors } from './palette.ts';

export type AvatarLayer = 'all' | 'ground' | 'aura' | 'body';
export interface AvatarOptions { flip?: boolean; layer?: AvatarLayer }
type Pt = [number, number];
type EyeKind = 'open' | 'fierce' | 'half' | 'side' | 'happy';
const MOODS: Mood[] = ['charged', 'awake', 'tired', 'proud', 'lazy'];

const OL='#1c1528';                 // Kontur
const SK='#ffdcbc', SK2='#f0b48f', SK3='#d9906e'; // Haut: Licht, Schatten, Tiefschatten
const PANT='#272b45', PANT2='#1a1d31', BOOT='#3a2620', BOOT2='#25170f', WRAP='#f4f1e8', WRAP2='#cfc9b8';
const BAND='#e0344f', BAND2='#a81f37';

const lerp=(a: number, b: number, t: number)=>a+(b-a)*t;
// Gliedmaße als Strich mit Kontur
function limb(d: string, col: string, w: number, shade?: string): string {
  let s=`<path d="${d}" fill="none" stroke="${OL}" stroke-width="${w+5}" stroke-linecap="round" stroke-linejoin="round"/>`;
  s+=`<path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  if(shade) s+=`<path d="${d}" fill="none" stroke="${shade}" stroke-width="${w*.38}" stroke-linecap="round" stroke-linejoin="round" transform="translate(${w*.22} ${w*.18})" opacity=".9"/>`;
  return s;
}
// Arm: Schulter, Ellbogen, Handgelenk, Faust
function arm(sh: Pt, el: Pt, wr: Pt, fist: Pt, st: StageColors): string {
  const sleeveEnd=[lerp(sh[0],el[0],.82),lerp(sh[1],el[1],.82)];
  const dx=wr[0]-el[0],dy=wr[1]-el[1],len=Math.hypot(dx,dy)||1;
  const wrapStart=[wr[0]-dx/len*11,wr[1]-dy/len*11];
  let s='';
  s+=limb(`M${sh[0]} ${sh[1]} L${el[0]} ${el[1]} L${wr[0]} ${wr[1]}`,SK,13,SK2);
  s+=limb(`M${sh[0]} ${sh[1]} L${sleeveEnd[0]} ${sleeveEnd[1]}`,st.gi,21,st.giShade);
  s+=limb(`M${wrapStart[0]} ${wrapStart[1]} L${wr[0]} ${wr[1]}`,WRAP,15,WRAP2);
  // Faust
  s+=`<circle cx="${fist[0]}" cy="${fist[1]}" r="10.5" fill="${SK}" stroke="${OL}" stroke-width="2.6"/>`;
  s+=`<path d="M${fist[0]+1} ${fist[1]+2} a8 8 0 0 0 7 -6 a10.5 10.5 0 0 1 -6 13 z" fill="${SK2}"/>`;
  s+=`<path d="M${fist[0]-5} ${fist[1]-3} q5 -3 10 0 M${fist[0]-5} ${fist[1]+1.5} q4 -2 7 0" stroke="${OL}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
  return s;
}
// Auge
function eye(cx: number, cy: number, kind: EyeKind, side: number, id: string, st: StageColors): string {
  const outer=cx+side*10, inner=cx-side*10;
  if(kind==='happy'){
    return `<path d="M${cx-9} ${cy+3} Q${cx} ${cy-9} ${cx+9} ${cy+3}" fill="none" stroke="${OL}" stroke-width="3.8" stroke-linecap="round"/>`+
           `<path d="M${outer} ${cy+1} l${side*4} -3" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  const look=kind==='side'?side*3.2:0;
  let s=`<path d="M${cx-10} ${cy-3} Q${cx} ${cy-14} ${cx+10} ${cy-3} Q${cx+9.5} ${cy+11} ${cx} ${cy+12.5} Q${cx-9.5} ${cy+11} ${cx-10} ${cy-3}Z" fill="#fff"/>`;
  // Lidschatten oben im Weiß
  s+=`<path d="M${cx-10} ${cy-3} Q${cx} ${cy-14} ${cx+10} ${cy-3} Q${cx} ${cy-7} ${cx-10} ${cy-1}Z" fill="#c9cde0"/>`;
  s+=`<ellipse cx="${cx+look}" cy="${cy+2.6}" rx="7.2" ry="9.2" fill="url(#ir${id})"/>`;
  s+=`<ellipse cx="${cx+look}" cy="${cy+2.6}" rx="7.2" ry="9.2" fill="none" stroke="${st.eyes[0]}" stroke-width="1.3"/>`;
  s+=`<ellipse cx="${cx+look}" cy="${cy+3.4}" rx="3.3" ry="4.8" fill="${OL}"/>`;
  s+=`<path d="M${cx+look-5} ${cy+7} Q${cx+look} ${cy+11} ${cx+look+5} ${cy+7}" stroke="${st.eyes[1]}" stroke-width="1.6" fill="none" opacity=".9"/>`;
  s+=`<ellipse cx="${cx+look+3}" cy="${cy-1.4}" rx="3.1" ry="2.6" fill="#fff"/>`;
  s+=`<circle cx="${cx+look-3.2}" cy="${cy+6.6}" r="1.4" fill="#fff"/>`;
  // Oberlid / Lidmasken
  if(kind==='fierce'){
    const yo=cy-9, yi=cy-3;
    s+=`<path d="M${outer+side*2} ${cy-18} L${inner-side*2} ${cy-18} L${inner-side*2} ${yi} L${outer+side*2} ${yo}Z" fill="${SK}"/>`;
    s+=`<path d="M${outer+side*1} ${yo} L${inner} ${yi}" stroke="${OL}" stroke-width="3.8" stroke-linecap="round"/>`;
    s+=`<path d="M${outer+side*1} ${yo} l${side*4} -3" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`;
  }else if(kind==='half'||kind==='side'){
    s+=`<path d="M${cx-12} ${cy-18} L${cx+12} ${cy-18} L${cx+12} ${cy+1} Q${cx} ${cy-3} ${cx-12} ${cy+1}Z" fill="${SK}"/>`;
    s+=`<path d="M${cx-10.5} ${cy+0.8} Q${cx} ${cy-3.4} ${cx+10.5} ${cy+0.8}" fill="none" stroke="${OL}" stroke-width="3.6" stroke-linecap="round"/>`;
    s+=`<path d="M${cx-9} ${cy-3.5} Q${cx} ${cy-7} ${cx+9} ${cy-3.5}" fill="none" stroke="${SK3}" stroke-width="1.4" stroke-linecap="round"/>`;
  }else{
    s+=`<path d="M${inner} ${cy-2} Q${cx} ${cy-14.5} ${outer} ${cy-4}" fill="none" stroke="${OL}" stroke-width="3.8" stroke-linecap="round"/>`;
    s+=`<path d="M${outer} ${cy-4} l${side*4.5} -3.5" stroke="${OL}" stroke-width="2.6" stroke-linecap="round"/>`;
  }
  // Unterlid
  s+=`<path d="M${cx-5} ${cy+12.2} Q${cx} ${cy+13.8} ${cx+5} ${cy+12.2}" fill="none" stroke="${OL}" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>`;
  return s;
}

export function avatarSvg(stageIndex: number, moodKey: Mood, uniqueId: string, opts: AvatarOptions = {}): string {
  const st=STAGE_COLORS[Math.max(0,Math.min(STAGE_COLORS.length-1,stageIndex|0))];
  const m: Mood=MOODS.includes(moodKey)?moodKey:'awake';
  const id=String(uniqueId==null?'a':uniqueId).replace(/[^A-Za-z0-9_-]/g,'_');
  const layer: AvatarLayer=opts.layer??'all';
  const want=(l: AvatarLayer)=>layer==='all'||layer===l;
  let s=`<svg viewBox="0 0 240 280" xmlns="http://www.w3.org/2000/svg">`;
  s+=`<defs>
    <radialGradient id="ir${id}" cx="50%" cy="78%" r="75%"><stop offset="0" stop-color="${st.eyes[1]}"/><stop offset=".55" stop-color="${st.eyes[0]}"/><stop offset="1" stop-color="${OL}"/></radialGradient>
    <linearGradient id="hg${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${st.hair[1]}"/><stop offset=".45" stop-color="${st.hair[0]}"/><stop offset="1" stop-color="${st.hair[0]}"/></linearGradient>
    <radialGradient id="ag${id}" cx="50%" cy="68%" r="62%"><stop offset="0" stop-color="#ffffff" stop-opacity=".9"/><stop offset=".35" stop-color="${st.aura||'#000'}" stop-opacity=".8"/><stop offset="1" stop-color="${st.aura||'#000'}" stop-opacity=".05"/></radialGradient>
    <linearGradient id="gg${id}" x1="0" y1="0" x2="1" y2="0"><stop offset=".55" stop-color="${st.gi}"/><stop offset=".56" stop-color="${st.giShade}"/></linearGradient>
  </defs>`;
  if(opts.flip) s+=`<g transform="translate(240 0) scale(-1 1)">`;
  // Bodenschatten
  if(want('ground')) s+=`<ellipse cx="120" cy="270" rx="58" ry="8" fill="#000" opacity=".32"/>`;

  // ---------- Aura ----------
  if(want('aura') && st.aura && m!=='lazy'){
    const dim=m==='tired'?.4:1;
    const flame='M120 2 C108 28 96 40 92 68 C84 54 70 62 68 90 C56 82 46 102 52 126 C40 138 36 168 44 196 C50 228 74 264 120 268 C166 264 190 228 196 196 C204 168 200 138 188 126 C194 102 184 82 172 90 C170 62 156 54 148 68 C144 40 132 28 120 2Z';
    s+=`<g opacity="${dim}">`;
    s+=`<path d="${flame}" fill="url(#ag${id})" stroke="${st.aura}" stroke-width="2.4" stroke-opacity=".9"/>`;
    s+=`<path d="${flame}" fill="${st.aura}" opacity=".35" transform="translate(120 210) scale(.8 .82) translate(-120 -210)"/>`;
    s+=`<path d="${flame}" fill="#ffffff" opacity=".28" transform="translate(120 220) scale(.6 .62) translate(-120 -220)"/>`;
    // Flammenzungen
    s+=`<path d="M60 150 Q50 120 62 96 Q62 124 74 140Z M180 150 Q190 120 178 96 Q178 124 166 140Z M96 60 Q98 36 112 22 Q104 44 108 62Z M144 60 Q142 36 128 22 Q136 44 132 62Z" fill="${st.aura}" opacity=".55"/>`;
    s+=`</g>`;
    if(st.bolts && m!=='tired'){
      const b='M34 104 l14 16 -10 5 16 22 M206 120 l-14 13 10 7 -16 20 M58 212 l10 -10 4 9 12 -12';
      s+=`<path d="${b}" fill="none" stroke="${st.aura}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" opacity=".55"/>`;
      s+=`<path d="${b}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
    }
    if(st.sparks){
      const star=(x: number, y: number, r: number)=>`<path d="M${x} ${y-r} L${x+r*.28} ${y-r*.28} L${x+r} ${y} L${x+r*.28} ${y+r*.28} L${x} ${y+r} L${x-r*.28} ${y+r*.28} L${x-r} ${y} L${x-r*.28} ${y-r*.28}Z"/>`;
      s+=`<g fill="#fff">${star(46,170,7)}${star(194,64,6)}${star(184,214,5)}${star(56,52,5)}<circle cx="200" cy="168" r="2"/><circle cx="38" cy="230" r="2"/></g>`;
    }
  }

  const headT=m==='tired'?'rotate(6 120 132) translate(2 4)':m==='lazy'?'rotate(-7 120 132) translate(-2 5)':m==='proud'?'rotate(-3 120 132)':'';
  const slump=(m==='tired'||m==='lazy')?4:0;
  if(want('body')){
  s+=`<g>`;

  // ---------- Hinterkopf: Stirnbandenden + Haarmasse ----------
  s+=`<g transform="${headT}">`;
  s+=`<path d="M156 74 Q182 70 204 84 Q186 84 168 80Z" fill="${BAND}" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`;
  s+=`<path d="M156 78 Q178 88 190 112 Q174 98 160 86Z" fill="${BAND2}" stroke="${OL}" stroke-width="2.4" stroke-linejoin="round"/>`;
  const backHair='M74 108 L48 100 L64 86 L36 72 L64 64 L44 38 L76 44 L70 14 L98 34 L110 4 L126 30 L150 8 L150 36 L180 26 L168 54 L196 58 L174 76 L192 92 L168 98 L166 110 Z';
  s+=`<path d="${backHair}" fill="url(#hg${id})" stroke="${OL}" stroke-width="2.8" stroke-linejoin="round"/>`;
  // Schattenseite Haare
  s+=`<path d="M150 36 L180 26 L168 54 L196 58 L174 76 L192 92 L168 98 L166 110 L150 104 Q160 70 150 36Z" fill="#000" opacity=".22"/>`;
  // Lichtkanten
  s+=`<path d="M76 46 L90 58 M98 36 L104 52 M126 32 L120 48 M64 66 L80 70 M46 74 L64 80" stroke="${st.hair[1]}" stroke-width="3" stroke-linecap="round" opacity=".85"/>`;
  s+=`</g>`;

  // ---------- Beine ----------
  s+=`<path d="M86 204 Q120 216 154 204 L166 244 L156 258 L128 258 L124 230 Q120 224 116 230 L112 258 L84 258 L74 244Z" fill="${PANT}" stroke="${OL}" stroke-width="2.8" stroke-linejoin="round"/>`;
  s+=`<path d="M124 230 L128 258 L156 258 L166 244 L156 210 Q146 230 124 230Z" fill="${PANT2}" opacity=".8"/>`;
  s+=`<path d="M96 216 L100 248 M140 216 L136 248 M82 232 L92 240 M158 232 L148 240 M108 222 L110 236" stroke="#3d4266" stroke-width="2" stroke-linecap="round" fill="none"/>`;
  // Wickel + Stiefel
  s+=`<path d="M86 248 L112 248 L112 258 L86 258Z M128 248 L154 248 L154 258 L128 258Z" fill="${WRAP}" stroke="${OL}" stroke-width="2.2"/>`;
  s+=`<path d="M86 252 L112 254 M128 254 L154 252" stroke="${WRAP2}" stroke-width="1.6"/>`;
  s+=`<path d="M84 256 L114 256 L116 272 L74 272 Q74 262 84 256Z M126 256 L156 256 Q166 262 166 272 L124 272Z" fill="${BOOT}" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>`;
  s+=`<path d="M74 272 L116 272 L116 267 L76 267Z M124 272 L166 272 L166 267 L124 267Z" fill="${BOOT2}"/>`;
  s+=`<path d="M82 262 Q90 259 98 262 M134 262 Q142 259 150 262" stroke="#6b4a3c" stroke-width="2" fill="none" stroke-linecap="round"/>`;

  // ---------- Oberkörper (Gi) ----------
  s+=`<path d="M110 128 L110 150 L130 150 L130 128Z" fill="${SK2}" stroke="${OL}" stroke-width="2.4"/>`;
  s+=`<path d="M110 136 Q120 142 130 136 L130 144 Q120 148 110 144Z" fill="${SK3}" opacity=".6"/>`;
  const torso=`M82 ${150+slump} Q120 ${136+slump} 158 ${150+slump} L168 172 L156 208 Q120 216 84 208 L72 172Z`;
  s+=`<path d="${torso}" fill="${st.gi}" stroke="${OL}" stroke-width="2.8" stroke-linejoin="round"/>`;
  s+=`<path d="M138 ${142+slump} Q156 ${146+slump} 168 172 L156 208 Q144 211 132 212 Q144 180 138 ${142+slump}Z" fill="${st.giShade}"/>`;
  s+=`<path d="M86 160 Q92 152 104 ${146+slump}" stroke="#fff" stroke-opacity=".3" stroke-width="3.2" fill="none" stroke-linecap="round"/>`;
  // Unterhemd + gekreuzter Kragen
  s+=`<path d="M106 ${142+slump} L120 176 L134 ${142+slump}Z" fill="#171a2c" stroke="${OL}" stroke-width="2"/>`;
  s+=`<path d="M114 160 Q120 166 126 160" stroke="#2c3150" stroke-width="1.6" fill="none"/>`;
  s+=`<path d="M104 ${141+slump} L122 186 L128 182 L110 ${139+slump}Z" fill="${st.giShade}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
  s+=`<path d="M136 ${141+slump} L121 180 L116 176 L130 ${139+slump}Z" fill="${st.gi}" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
  // Brustabzeichen: eigenes Symbol (Flammen-Rhombus)
  s+=`<g transform="translate(96 172)"><circle r="9" fill="#f6f4ee" stroke="${OL}" stroke-width="2"/><path d="M0 -6 L5 0 L0 6 L-5 0Z" fill="${st.aura||BAND}" stroke="${OL}" stroke-width="1.2"/><path d="M0 -3 Q2 0 0 3 Q-2 0 0 -3Z" fill="#fff"/></g>`;
  // Gi-Falten
  s+=`<path d="M90 194 Q100 190 108 196 M146 188 Q140 196 146 202" stroke="${OL}" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".5"/>`;
  // Schärpe + Knoten + Enden
  s+=`<path d="M82 196 Q120 208 158 196 L158 210 Q120 222 82 210Z" fill="${st.belt}" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>`;
  s+=`<path d="M84 200 Q120 211 156 200" stroke="#fff" stroke-opacity=".18" stroke-width="2" fill="none"/>`;
  s+=`<path d="M128 210 L120 240 L130 238 L134 214Z M138 210 L148 236 L156 230 L142 208Z" fill="${st.belt}" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`;
  s+=`<rect x="126" y="200" width="16" height="13" rx="4" fill="${st.belt}" stroke="${OL}" stroke-width="2.3"/>`;

  // ---------- Arme je Stimmung ----------
  if(m==='charged'){
    s+=arm([84,156],[60,182],[84,176],[93,172],st);
    s+=arm([156,156],[182,168],[166,144],[160,135],st);
  }else if(m==='proud'){
    s+=arm([84,156],[54,160],[58,128],[60,119],st);
    s+=arm([156,156],[186,160],[182,128],[180,119],st);
  }else if(m==='awake'){
    s+=arm([82,158],[70,186],[74,208],[75,216],st);
    s+=arm([158,158],[170,186],[166,208],[165,216],st);
  }else{
    const d=6, inn=m==='tired'?4:0;
    s+=arm([82,160],[72,190],[76+inn,212+d],[77+inn,220+d],st);
    s+=arm([158,160],[168,190],[164-inn,212+d],[163-inn,220+d],st);
  }

  // ---------- Kopf vorne ----------
  s+=`<g transform="${headT}">`;
  // Ohren
  s+=`<ellipse cx="78" cy="102" rx="8" ry="10" fill="${SK}" stroke="${OL}" stroke-width="2.6"/><path d="M79 98 q-4 4 0 9" stroke="${SK3}" stroke-width="2" fill="none"/>`;
  s+=`<ellipse cx="162" cy="102" rx="8" ry="10" fill="${SK2}" stroke="${OL}" stroke-width="2.6"/><path d="M161 98 q4 4 0 9" stroke="${SK3}" stroke-width="2" fill="none"/>`;
  // Gesicht
  s+=`<path d="M78 92 C78 64 96 52 120 52 C144 52 162 64 162 92 C162 110 154 124 140 132 C132 137 126 139 120 139 C114 139 108 137 100 132 C86 124 78 110 78 92Z" fill="${SK}" stroke="${OL}" stroke-width="2.8" stroke-linejoin="round"/>`;
  s+=`<path d="M152 92 C153 110 146 124 134 132 C128 136 124 137 121 138 C134 126 146 112 147 94Z" fill="${SK2}"/>`;
  // Schatten unter Pony
  s+=`<path d="M82 86 Q120 74 158 86 L158 92 Q120 82 82 92Z" fill="${SK2}" opacity=".7"/>`;
  // Augenbrauen
  const BR=({
    charged:['M88 88 L110 95','M152 88 L130 95'],
    awake:['M90 90 Q99 85 110 89','M150 90 Q141 85 130 89'],
    tired:['M90 92 Q100 89 110 90','M150 92 Q140 89 130 90'],
    proud:['M90 86 Q100 80 110 85','M150 86 Q140 80 130 85'],
    lazy:['M90 91 L110 91','M130 91 L150 90']
  } as Record<Mood,[string,string]>)[m];
  // Augen
  const ek=({charged:'fierce',awake:'open',tired:'half',proud:'happy',lazy:'side'} as Record<Mood,EyeKind>)[m];
  s+=eye(102,106,ek,-1,id,st)+eye(138,106,ek,1,id,st);
  if(m==='tired') s+=`<path d="M92 120 Q101 124 111 120 M129 120 Q139 124 148 120" stroke="#a7737f" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>`;
  // Nase
  s+=`<path d="M121 113 L118.5 119.5 L122.5 119.5" stroke="${SK3}" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  // Mund
  if(m==='charged'){
    s+=`<path d="M108 125 Q120 130 132 122 Q128 134 118 134 Q110 133 108 125Z" fill="#5a1f2c" stroke="${OL}" stroke-width="2" stroke-linejoin="round"/>`;
    s+=`<path d="M109.5 125.6 Q120 129.6 130.6 123.2 L130 126.6 Q120 132 110.6 128.4Z" fill="#fff"/>`;
    s+=`<path d="M132 122 l3 -2" stroke="${OL}" stroke-width="2" stroke-linecap="round"/>`;
  }else if(m==='awake'){
    s+=`<path d="M111 126 Q120 131 129 125" stroke="${OL}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  }else if(m==='tired'){
    s+=`<ellipse cx="120" cy="128" rx="5.5" ry="7" fill="#5a1f2c" stroke="${OL}" stroke-width="2.2"/><ellipse cx="120" cy="131.5" rx="3.2" ry="2.2" fill="#e06b7a"/>`;
  }else if(m==='proud'){
    s+=`<path d="M106 121 Q120 140 134 121Z" fill="#5a1f2c" stroke="${OL}" stroke-width="2.3" stroke-linejoin="round"/>`;
    s+=`<path d="M107.5 121.6 Q120 124.5 132.5 121.6 L131 125 Q120 127.6 109 125Z" fill="#fff"/>`;
    s+=`<ellipse cx="120" cy="131" rx="6" ry="3" fill="#e06b7a"/>`;
    s+=`<ellipse cx="94" cy="120" rx="8" ry="3.6" fill="#ff8f9a" opacity=".55"/><ellipse cx="146" cy="120" rx="8" ry="3.6" fill="#ff8f9a" opacity=".55"/>`;
    s+=`<path d="M90 118 l3 -3 M95 118 l3 -3 M142 118 l3 -3 M147 118 l3 -3" stroke="#e05a6a" stroke-width="1.4" stroke-linecap="round"/>`;
  }else{
    s+=`<path d="M112 127 Q116 125 120 127 Q124 129 128 126" stroke="${OL}" stroke-width="2.3" fill="none" stroke-linecap="round"/>`;
  }
  // Pony
  s+=`<path d="M76 86 L84 102 L90 82 L100 100 L106 78 L116 98 L122 76 L130 98 L138 78 L146 100 L152 82 L160 102 L164 86 C166 58 146 44 120 44 C94 44 74 58 76 86Z" fill="url(#hg${id})" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>`;
  s+=`<path d="M138 78 L146 100 L152 82 L160 102 L164 86 C165 70 158 58 146 51 Q152 68 138 78Z" fill="#000" opacity=".2"/>`;
  s+=`<path d="M92 60 Q104 52 118 52" stroke="${st.hair[1]}" stroke-width="3.2" fill="none" stroke-linecap="round" opacity=".9"/>`;
  // Stirnband
  s+=`<path d="M76 70 Q120 54 164 70 L164 80 Q120 64 76 80Z" fill="${BAND}" stroke="${OL}" stroke-width="2.6" stroke-linejoin="round"/>`;
  s+=`<path d="M136 63 Q152 66 164 72 L164 80 Q150 72 136 70Z" fill="${BAND2}"/>`;
  s+=`<path d="M82 70 Q110 60 132 61" stroke="#fff" stroke-opacity=".45" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  s+=`<rect x="113" y="61" width="14" height="9" rx="2" fill="#f2f0ea" stroke="${OL}" stroke-width="1.6" transform="rotate(-1 120 66)"/>`;
  // Augenbrauen über Pony (Anime-Konvention)
  s+=`<g transform="translate(0 2)"><path d="${BR[0]} ${BR[1]}" stroke="${SK}" stroke-width="6.6" stroke-linecap="round" fill="none"/>`;
  s+=`<path d="${BR[0]} ${BR[1]}" stroke="${OL}" stroke-width="3.8" stroke-linecap="round" fill="none"/></g>`;
  s+=`</g>`;

  // ---------- Extras je Stimmung ----------
  if(m==='tired') s+=`<g font-family="Bangers, Impact, sans-serif" fill="#e6ebff" stroke="${OL}" stroke-width="1.2"><text x="168" y="40" font-size="24">Z</text><text x="188" y="22" font-size="16">z</text></g>`;
  if(m==='proud') s+=`<path d="M170 60 q7 10 0 15 q-7 -5 0 -15Z M66 94 q6 9 0 13 q-6 -4 0 -13Z M176 100 q5 8 0 11 q-5 -3 0 -11Z" fill="#a8e4ff" stroke="${OL}" stroke-width="1.6"/>`;
  if(m==='lazy'){
    s+=`<g fill="#9a95a8" opacity=".75"><circle cx="72" cy="150" r="2.2"/><circle cx="164" cy="176" r="2.6"/><circle cx="108" cy="166" r="1.8"/><circle cx="96" cy="36" r="2.2"/><circle cx="146" cy="140" r="1.7"/><circle cx="132" cy="236" r="2"/></g>`;
    s+=`<path d="M160 130 L184 116 M160 130 L188 134 M160 130 L176 150 M168 125 Q172 132 179 131 M172 139 Q170 133 176 128 M176 120 Q180 128 186 128" stroke="#d6d2e2" stroke-width="1.1" fill="none" opacity=".7"/>`;
    s+=`<path d="M176 150 L178 164" stroke="#d6d2e2" stroke-width=".9" opacity=".6"/><circle cx="178" cy="166" r="2.4" fill="#2a2433"/>`;
  }
  s+=`</g>`;
  } // body
  if(opts.flip) s+=`</g>`;
  s+=`</svg>`;
  return s;
}
