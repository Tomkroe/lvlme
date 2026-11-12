/** Hintergrundszene je Stimmung (Port aus der Demo). Zuständig: app-ui. */
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Mood } from '../types.ts';

interface Palette {
  sky: [string, string, string];
  sun?: [number, number, number, string];
  moon?: [number, number, number];
  glow: string;
  mtn: [string, string];
  grass: [string, string];
  rock: [string, string];
  cloud: [string, number];
  speed?: boolean;
  stars?: boolean;
  many?: boolean;
}

const P: Record<Mood, Palette> = {
  charged: { sky: ['#2c86f5', '#79c3ff', '#ffe2a8'], sun: [300, 150, 30, '#fff6cf'], glow: '#ffd27a', mtn: ['#7aa6dc', '#5583c4'], grass: ['#62c96f', '#3d9450'], rock: ['#6d5c80', '#3f3352'], cloud: ['#ffffff', 0.92] },
  awake: { sky: ['#3a7bd2', '#93c6f4', '#e2f1ff'], sun: [322, 96, 20, '#fffbe8'], glow: '#fff3c0', mtn: ['#8cb1dd', '#6791c8'], grass: ['#5fc06c', '#3b8f4d'], rock: ['#6b5d7e', '#3f3352'], cloud: ['#ffffff', 0.9] },
  proud: { sky: ['#4b2470', '#f0604a', '#ffc56a'], sun: [210, 330, 62, '#ffe7ad'], glow: '#ff9a4a', mtn: ['#a84a6c', '#73294f'], grass: ['#7ab454', '#4c7d36'], rock: ['#5d3f62', '#33213f'], cloud: ['#ffd3b0', 0.75], speed: true },
  tired: { sky: ['#0e1133', '#3a2d6b', '#a85d86'], moon: [306, 104, 22], glow: '#c9b8ff', mtn: ['#3a2e62', '#271f4b'], grass: ['#3e6c5c', '#28493f'], rock: ['#3b3150', '#221b33'], cloud: ['#b8a8d8', 0.28], stars: true },
  lazy: { sky: ['#59617a', '#8890a4', '#c4c8d2'], glow: '#ffffff', mtn: ['#7c8497', '#646c80'], grass: ['#6f9068', '#4f6c4b'], rock: ['#5f5a6c', '#3e3a49'], cloud: ['#e6e9f0', 0.85], many: true },
};

function cloud(x: number, y: number, s: number, col: string, op: number) {
  return `<g opacity="${op}"><g transform="translate(${x} ${y}) scale(${s})" fill="${col}"><ellipse cx="0" cy="0" rx="34" ry="13"/><ellipse cx="-16" cy="-6" rx="16" ry="12"/><ellipse cx="9" cy="-12" rx="20" ry="16"/><ellipse cx="28" cy="-3" rx="13" ry="9"/></g></g>`;
}

export function sceneSvg(m: Mood, id = 'sc'): string {
  const p = P[m];
  let s = `<svg viewBox="0 0 390 452" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg"><defs>
  <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".58" stop-color="${p.sky[1]}"/><stop offset="1" stop-color="${p.sky[2]}"/></linearGradient>
  <radialGradient id="${id}g"><stop offset="0" stop-color="${p.glow}" stop-opacity=".95"/><stop offset="1" stop-color="${p.glow}" stop-opacity="0"/></radialGradient>
  <linearGradient id="${id}r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.rock[0]}"/><stop offset="1" stop-color="${p.rock[1]}"/></linearGradient>
  <linearGradient id="${id}h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[2]}" stop-opacity="0"/><stop offset="1" stop-color="${p.sky[2]}" stop-opacity=".55"/></linearGradient>
  </defs><rect width="390" height="452" fill="url(#${id}s)"/>`;
  if (p.stars) {
    const st = [[30, 70, 1.4], [64, 120, 1], [98, 58, 1.6], [140, 96, 1], [176, 44, 1.3], [214, 84, 1], [246, 140, 1.2], [268, 52, 1.5], [352, 160, 1], [370, 70, 1.3], [120, 170, 1], [40, 190, 1.1], [200, 190, 0.9], [330, 40, 1]];
    s += `<g fill="#fff">${st.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" opacity="${0.5 + r / 4}"/>`).join('')}</g>`;
  }
  if (p.sun) { const [x, y, r, c] = p.sun; s += `<circle cx="${x}" cy="${y}" r="${r * 3.4}" fill="url(#${id}g)"/><circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`; }
  if (p.moon) { const [x, y, r] = p.moon; s += `<circle cx="${x}" cy="${y}" r="${r * 3}" fill="url(#${id}g)" opacity=".5"/><circle cx="${x}" cy="${y}" r="${r}" fill="#f4efff"/><circle cx="${x + 11}" cy="${y - 7}" r="${r}" fill="${p.sky[0]}"/>`; }
  if (p.speed) {
    let g = '';
    for (let a = 0; a < 360; a += 7.5) {
      const r1 = (a * Math.PI) / 180, r2 = ((a + 2.2) * Math.PI) / 180, cx = 222, cy = 300, R = 520;
      g += `<polygon points="${cx + Math.cos(r1) * 70},${cy + Math.sin(r1) * 70} ${cx + Math.cos(r1) * R},${cy + Math.sin(r1) * R} ${cx + Math.cos(r2) * R},${cy + Math.sin(r2) * R}"/>`;
    }
    s += `<g fill="#fff" opacity=".16">${g}</g>`;
  }
  s += cloud(70, 96, 1, p.cloud[0], p.cloud[1]) + cloud(250, 64, 0.75, p.cloud[0], p.cloud[1] * 0.85);
  s += p.many
    ? cloud(170, 140, 1.2, p.cloud[0], p.cloud[1]) + cloud(340, 120, 1, p.cloud[0], p.cloud[1]) + cloud(20, 200, 0.9, p.cloud[0], p.cloud[1] * 0.8)
    : cloud(350, 200, 0.6, p.cloud[0], p.cloud[1] * 0.7);
  s += `<path d="M0 318 L36 292 L72 308 L120 258 L160 296 L200 276 L242 304 L292 250 L336 292 L390 270 V452 H0Z" fill="${p.mtn[0]}"/>`;
  s += `<path d="M120 258 L108 272 L118 270 L124 280 L134 270 Z M292 250 L280 266 L292 262 L300 272 L306 262Z" fill="#fff" opacity=".35"/>`;
  s += `<path d="M0 352 L46 326 L92 346 L146 312 L198 344 L254 320 L316 350 L390 324 V452 H0Z" fill="${p.mtn[1]}"/>`;
  s += `<rect y="250" width="390" height="202" fill="url(#${id}h)"/>`;
  s += `<path d="M96 402 Q104 436 150 452 L298 452 Q340 438 348 402 Z" fill="url(#${id}r)"/>`;
  s += `<path d="M150 420 L168 452 M232 418 L222 452 M300 418 L312 444" stroke="${p.rock[1]}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  s += `<ellipse cx="222" cy="402" rx="128" ry="17" fill="${p.grass[1]}"/><ellipse cx="222" cy="398" rx="124" ry="14" fill="${p.grass[0]}"/>`;
  s += `<path d="M110 400 l4 -9 l3 8 M126 404 l3 -8 l3 7 M318 401 l3 -9 l4 8 M334 398 l2 -7 l3 6 M150 408 l3 -6 l2 6" stroke="${p.grass[1]}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  return s + '</svg>';
}

/** Füllt den Elternbereich; Plattformmitte liegt bei x≈57 %, Oberkante Gras bei ≈88 % der Höhe. */
export function Scene({ mood, id = 'sc' }: { mood: Mood; id?: string }) {
  const xml = useMemo(() => sceneSvg(mood, id), [mood, id]);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <SvgXml xml={xml} width="100%" height="100%" />
    </View>
  );
}

/** Kleiner Himmel-Verlauf für Freundeskarten */
export function miniSkySvg(m: Mood, id: string): string {
  const s = P[m].sky;
  return `<svg viewBox="0 0 10 10" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s[0]}"/><stop offset=".6" stop-color="${s[1]}"/><stop offset="1" stop-color="${s[2]}"/></linearGradient></defs><rect width="10" height="10" fill="url(#${id})"/></svg>`;
}
