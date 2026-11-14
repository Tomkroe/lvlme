/**
 * Kalorienhaushalt: grobe Schätzung des Tagesbedarfs. Zuständig: game-balance. Reine Funktionen.
 * Reine Information: nichts davon fließt in Energie, XP, Stimmung, Streaks oder Avatar ein, kein Defizit wird belohnt.
 * Datenschutz: Alter, Geschlecht, Gewicht, Größe, KFA und der eigene Wert bleiben auf dem Gerät.
 */
import type { CalorieGoal, CalorieTarget, Sex } from '../types.ts';
import { bmi, type BodyStats } from './body.ts';

export const AGE_LIMITS = { min: 14, max: 100, def: 30 } as const;
/** Faktor für den Alltag ohne Training; Training kommt über die aktiven Kalorien dazu */
export const BASE_ACTIVITY = 1.2;
/** Abnehmen: Standard −15 %, nie mehr als −20 % vom Gesamtbedarf */
export const LOSE_FACTOR = 0.85;
export const MAX_DEFICIT = 0.2;
/** Aufbauen: +7,5 % (erlaubt sind +5 bis +10 %) */
export const GAIN_FACTOR = 1.075;
/** Unter diesem BMI und unter 18 Jahren gibt es keine Abnehmen-Empfehlung */
export const MIN_LOSE_BMI = 18.5;
export const MIN_LOSE_AGE = 18;
export const CUSTOM_LIMITS = { min: 800, max: 6000 } as const;

export const GOAL_LABEL: Record<CalorieGoal, string> = { lose: 'Abnehmen', maintain: 'Halten', gain: 'Aufbauen' };
export const SEX_LABEL: Record<Sex, string> = { female: 'Weiblich', male: 'Männlich', unspecified: 'Keine Angabe' };

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const round10 = (v: number) => Math.round(v / 10) * 10;

export function sanitizeAge(v: unknown): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 ? clamp(n, AGE_LIMITS.min, AGE_LIMITS.max) : AGE_LIMITS.def;
}
export function sanitizeSex(v: unknown): Sex {
  return v === 'female' || v === 'male' ? v : 'unspecified';
}
export function sanitizeGoal(v: unknown): CalorieGoal {
  return v === 'lose' || v === 'gain' ? v : 'maintain';
}
/** Eigener Wert: nur eine sinnvolle ganze Zahl, sonst keiner */
export function sanitizeCustom(v: unknown): number | undefined {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && v != null && v !== '' ? clamp(n, CUSTOM_LIMITS.min, CUSTOM_LIMITS.max) : undefined;
}

export interface CalorieInput {
  stats: BodyStats;
  ageYears: number;
  sex: Sex;
  /** KFA in der Formel verwenden (Katch-McArdle); sonst Mifflin-St Jeor */
  useBodyFat: boolean;
  /** Aktive Kalorien, Schnitt der letzten bis zu 7 Tage; null = keine Daten */
  activeKcalAvg: number | null;
  goal: CalorieGoal;
  custom?: number;
}

/** Grundumsatz. Mit KFA: Katch-McArdle; ohne: Mifflin-St Jeor, bei „keine Angabe“ der Mittelwert aus weiblich und männlich. */
export function basalRate(i: Pick<CalorieInput, 'stats' | 'ageYears' | 'sex' | 'useBodyFat'>): { bmr: number; method: 'katch' | 'mifflin' } {
  const { weightKg: w, heightCm: h, bodyFatPct: f } = i.stats;
  if (i.useBodyFat) return { bmr: Math.round(370 + 21.6 * w * (1 - f / 100)), method: 'katch' };
  const base = 10 * w + 6.25 * h - 5 * i.ageYears;
  const off = i.sex === 'male' ? 5 : i.sex === 'female' ? -161 : (5 - 161) / 2;
  return { bmr: Math.round(base + off), method: 'mifflin' };
}

export function calorieTarget(i: CalorieInput): CalorieTarget {
  const { bmr, method } = basalRate(i);
  const active = i.activeKcalAvg != null && i.activeKcalAvg > 0 ? i.activeKcalAvg : 0;
  const tdee = Math.round(bmr * BASE_ACTIVITY + active);
  let applied = i.goal;
  let limitedBy: CalorieTarget['limitedBy'];
  if (applied === 'lose') {
    if (i.ageYears < MIN_LOSE_AGE) { applied = 'maintain'; limitedBy = 'age'; }
    else if (bmi(i.stats) < MIN_LOSE_BMI) { applied = 'maintain'; limitedBy = 'bmi'; }
  }
  const factor = applied === 'lose' ? Math.max(LOSE_FACTOR, 1 - MAX_DEFICIT) : applied === 'gain' ? GAIN_FACTOR : 1;
  // Die Empfehlung fällt nie unter den Grundumsatz
  const recommended = Math.max(bmr, round10(tdee * factor));
  const custom = sanitizeCustom(i.custom);
  return { bmr, tdee, recommended, custom, goal: i.goal, goalApplied: applied, limitedBy, method, belowBmr: custom != null && custom < bmr };
}

/** Schnitt der aktiven Kalorien über Tage mit Messwerten (Tage mit 0 = Uhr nicht getragen, zählen nicht) */
export function avgActiveKcal(days: ReadonlyArray<{ activeEnergyKcal: number }>): number | null {
  const v = days.map(d => d.activeEnergyKcal).filter(k => Number.isFinite(k) && k > 0).slice(-7);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

export const CALORIE_NOTICE =
  'Diese Werte sind eine grobe Schätzung auf Basis allgemeiner Formeln und ersetzen keine ärztliche oder ernährungsfachliche Beratung. '
  + 'Der tatsächliche Bedarf kann deutlich abweichen. Bei Vorerkrankungen, in Schwangerschaft oder Stillzeit, bei Essstörungen oder wenn du unsicher bist, '
  + 'sprich bitte mit einer Ärztin, einem Arzt oder einer Ernährungsfachkraft.';
