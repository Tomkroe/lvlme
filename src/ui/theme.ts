/** Farben und Typo der App (dunkler Spiel-Look wie in der Demo). Zuständig: app-ui. */
import type { Mood } from '../types.ts';

export const C = {
  bg: '#0b0f1e',
  sheet: '#121729',
  card: '#182037',
  card2: '#1f2944',
  line: '#2b365a',
  ink: '#eef1fb',
  mute: '#98a2c6',
  ki: '#ff8a1f',
  kiInk: '#1a0d00',
  sky: '#3fd0ff',
  good: '#4fe08a',
  warn: '#ffcc3d',
  bad: '#ff5a6b',
  violet: '#b48cff',
  outline: '#1c1528',
} as const;

export const energyColor = (e: number) => (e >= 67 ? C.good : e >= 40 ? C.warn : C.bad);

/** Schriften: System, kräftige Gewichte statt Webfonts (keine Font-Dateien im Projekt) */
export const F = {
  display: { fontWeight: '900' as const, letterSpacing: 0.5 },
  num: { fontVariant: ['tabular-nums' as const], fontWeight: '800' as const },
};

/** Himmel je Stimmung: [oben, mitte, horizont] */
export const SKY: Record<Mood, [string, string, string]> = {
  charged: ['#2c86f5', '#79c3ff', '#ffe2a8'],
  awake: ['#3a7bd2', '#93c6f4', '#e2f1ff'],
  proud: ['#4b2470', '#f0604a', '#ffc56a'],
  tired: ['#0e1133', '#3a2d6b', '#a85d86'],
  lazy: ['#59617a', '#8890a4', '#c4c8d2'],
};

export const fmt = (n: number) => Math.round(n).toLocaleString('de-DE');
