/**
 * Demo-Provider: deterministische Beispieldaten für Simulator, Android und Web.
 * Kein Zugriff auf echte Gesundheitsdaten. source: 'demo'.
 */
import type { DailyMetrics } from '../types.ts';

/** Lokales Datum als YYYY-MM-DD */
export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Kleiner deterministischer Pseudo-Zufall aus einem Integer-Seed */
function rand(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Ein Wochenmuster mit Trainingstagen, Couch-Tag und kurzer Nacht, damit alle Stimmungen vorkommen */
const PATTERN = [
  { steps: 9500, kcal: 480, workout: 45, sleep: 7.8, hrv: 64, rhr: 54 }, // guter Tag
  { steps: 12000, kcal: 900, workout: 90, sleep: 7.2, hrv: 58, rhr: 55 }, // harter Trainingstag
  { steps: 7000, kcal: 320, workout: 0, sleep: 5.1, hrv: 44, rhr: 60 }, // kurze Nacht
  { steps: 1500, kcal: 90, workout: 0, sleep: 8.4, hrv: 60, rhr: 55 }, // Couch-Tag
  { steps: 10500, kcal: 560, workout: 50, sleep: 8.0, hrv: 66, rhr: 53 },
  { steps: 8200, kcal: 410, workout: 30, sleep: 7.0, hrv: 57, rhr: 56 },
  { steps: 14000, kcal: 1100, workout: 120, sleep: 6.6, hrv: 52, rhr: 57 }, // langer Lauf
];

export function demoDay(date: Date, index: number): DailyMetrics {
  const p = PATTERN[index % PATTERN.length];
  const j = (k: number) => 0.92 + rand(index * 7 + k) * 0.16; // ±8 %
  return {
    date: localDateKey(date),
    steps: Math.round(p.steps * j(1)),
    activeEnergyKcal: Math.round(p.kcal * j(2)),
    workoutMinutes: Math.round(p.workout * j(3)),
    sleepHours: Math.round(p.sleep * j(4) * 10) / 10,
    hrvMs: Math.round(p.hrv * j(5)),
    restingHr: Math.round(p.rhr * j(6)),
    source: 'demo',
  };
}

export const demoProvider = {
  async isAvailable(): Promise<boolean> {
    return true;
  },
  async requestAccess(): Promise<boolean> {
    return true;
  },
  async readDays(days: number): Promise<DailyMetrics[]> {
    const n = Math.max(1, Math.min(60, Math.floor(days) || 1));
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    // Index am Kalendertag verankern, damit derselbe Tag immer dieselben Werte hat
    const dayNumber = Math.floor(today.getTime() / 86400000);
    const out: DailyMetrics[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      out.push(demoDay(d, dayNumber - i));
    }
    return out;
  },
};
