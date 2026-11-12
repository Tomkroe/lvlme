/**
 * Spielregeln: reine Funktionen ohne Abhängigkeiten. Zuständig: Agent game-balance.
 * Startwerte aus der Demo; vor dem Launch mit echten Daten nachjustieren.
 */
import type { Baseline, DailyMetrics, DayScore, Mood, Progress, PublicAvatar, Stats } from '../types.ts';

export const STAGES = [
  { name: 'Grundform', level: 1 },
  { name: 'Erwacht', level: 10 },
  { name: 'Entfesselt', level: 25 },
  { name: 'Aufgestiegen', level: 45 },
  { name: 'Meisterform', level: 70 },
  { name: 'Legende', level: 100 },
] as const;

export const MOOD_TEXT: Record<Mood, { label: string; text: string }> = {
  charged: { label: 'Voll aufgeladen', text: 'Super geschlafen, gute Erholung. Heute geht was!' },
  awake: { label: 'Wach', text: 'Solide Form. Ein bisschen Bewegung würde mir guttun.' },
  tired: { label: 'Müde', text: 'Hab schlecht geschlafen … heute lieber locker machen.' },
  proud: { label: 'Erschöpft, aber stolz', text: 'Puh, das war hart. Aber ich spüre, wie ich stärker werde!' },
  lazy: { label: 'Träge', text: 'Mir ist langweilig. Gehen wir mal raus?' },
};

export const SLEEP_GOAL_HOURS = 8;

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Schlaf in % des Ziels */
export function sleepScore(m: DailyMetrics): number {
  if (m.sleepHours == null) return 60;
  return Math.round(clamp((m.sleepHours / SLEEP_GOAL_HOURS) * 100));
}

/**
 * Erholung 0–100 (Startvorschlag): HRV über Basis → besser, Ruhepuls über Basis → schlechter, dazu Schlaf.
 * Ohne Basiswerte (erste Woche) zählt fast nur der Schlaf.
 */
export function recoveryScore(m: DailyMetrics, base: Baseline): number {
  const sleep = sleepScore(m);
  let hrvPart = 50;
  if (m.hrvMs != null && base.hrvMs) hrvPart = clamp(50 + ((m.hrvMs - base.hrvMs) / base.hrvMs) * 150);
  let rhrPart = 50;
  if (m.restingHr != null && base.restingHr) rhrPart = clamp(50 - ((m.restingHr - base.restingHr) / base.restingHr) * 300);
  const hasVitals = m.hrvMs != null && base.hrvMs != null;
  const score = hasVitals ? 0.45 * hrvPart + 0.2 * rhrPart + 0.35 * sleep : 0.2 * 50 + 0.8 * sleep;
  return Math.round(clamp(score));
}

/** Belastung 0–21 aus aktiven Kalorien und Workout-Minuten (logarithmisch wie bei WHOOP) */
export function strainScore(m: DailyMetrics): number {
  const load = m.activeEnergyKcal + m.workoutMinutes * 4 + m.steps / 40;
  const s = 21 * (1 - Math.exp(-load / 900));
  return Math.round(s * 10) / 10;
}

export function moodFor(recovery: number, strain: number, sleep: number, steps: number, overtraining: boolean): Mood {
  const energy = Math.round(recovery * 0.6 + sleep * 0.4);
  if (overtraining) return 'tired';
  if (steps < 3000 && strain < 4) return 'lazy';
  if (strain >= 15) return 'proud';
  if (energy >= 67) return 'charged';
  if (energy >= 40) return 'awake';
  return 'tired';
}

export function scoreDay(m: DailyMetrics, base: Baseline): DayScore {
  const recovery = recoveryScore(m, base);
  const strain = strainScore(m);
  const sleep = sleepScore(m);
  const energy = Math.round(recovery * 0.6 + sleep * 0.4);
  const overtraining = strain >= 14 && recovery < 34;
  const mood = moodFor(recovery, strain, sleep, m.steps, overtraining);
  const base_ = strain * 11 + m.steps / 220 + (sleep >= 85 ? 25 : 0);
  const bonus = !overtraining && recovery >= 67 ? 1.25 : 1;
  return { date: m.date, recovery, strain, sleep, energy, mood, overtraining, xp: Math.round(base_ * bonus) };
}

export const xpNeeded = (level: number) => 100 + level * 18;

export function stageFor(level: number): number {
  let i = 0;
  STAGES.forEach((s, k) => { if (level >= s.level) i = k; });
  return i;
}

export function power(progress: Progress, energy: number): number {
  const s = progress.stats;
  return Math.round((s.str * 1.4 + s.end * 1.2 + s.rec + s.dis * 1.1) * progress.level * 2.3 * (0.75 + energy / 400));
}

export const NEW_PROGRESS: Progress = { level: 1, xp: 0, stats: { str: 10, end: 10, rec: 10, dis: 10 }, streak: 0, booked: [] };

export interface BookResult {
  progress: Progress;
  levelsGained: number;
  stageBefore: number;
  stageAfter: number;
}

/** Verbucht einen abgeschlossenen Tag. Bereits verbuchte Tage ändern nichts. */
export function bookDay(p: Progress, m: DailyMetrics, d: DayScore): BookResult {
  const stageBefore = stageFor(p.level);
  if (p.booked.includes(d.date)) return { progress: p, levelsGained: 0, stageBefore, stageAfter: stageBefore };
  const stats: Stats = { ...p.stats };
  stats.str += d.strain >= 10 ? 2 : d.strain >= 5 ? 1 : 0;
  stats.end += Math.round(m.steps / 6000) + (d.strain >= 8 ? 1 : 0);
  stats.rec += d.sleep >= 85 ? 2 : d.sleep >= 70 ? 1 : 0;
  const active = m.steps >= 6000 || d.strain >= 8;
  const streak = active ? p.streak + 1 : 0;
  if (active) stats.dis += streak >= 7 ? 2 : 1;
  let level = p.level;
  let xp = p.xp + d.xp;
  while (xp >= xpNeeded(level)) { xp -= xpNeeded(level); level++; }
  const booked = [...p.booked, d.date].slice(-60);
  const progress: Progress = { level, xp, stats, streak, booked };
  return { progress, levelsGained: level - p.level, stageBefore, stageAfter: stageFor(level) };
}

export function toPublic(name: string, p: Progress, d: DayScore | null): PublicAvatar {
  return {
    displayName: name,
    level: p.level,
    stage: stageFor(p.level),
    mood: d?.mood ?? 'awake',
    power: power(p, d?.energy ?? 60),
    streak: p.streak,
    updatedAt: new Date().toISOString(),
  };
}

/** Basiswerte als Mittel der letzten Tage (ohne heute) */
export function baselineFrom(days: DailyMetrics[]): Baseline {
  const avg = (xs: (number | null)[]) => {
    const v = xs.filter((x): x is number => x != null);
    return v.length >= 3 ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  return { hrvMs: avg(days.map(d => d.hrvMs)), restingHr: avg(days.map(d => d.restingHr)), sleepHours: avg(days.map(d => d.sleepHours)) };
}
