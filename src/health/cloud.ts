/**
 * Konto-Provider für PC/Web (und Android): liest die Tageswerte, die das iPhone mit Einwilligung
 * ins eigene Konto geladen hat (Migration 0012). Zuständig: Agent health-data.
 * Nicht angemeldet → Beispieldaten, damit die App trotzdem ausprobiert werden kann.
 */
import type { DailyMetrics } from '../types.ts';
import * as social from '../social/api.ts';
import { demoProvider, localDateKey } from './demo.ts';

export const cloudProvider = {
  async isAvailable(): Promise<boolean> {
    return social.isConfigured();
  },
  async requestAccess(): Promise<boolean> {
    // Im Browser gibt es keinen Health-Dialog; die Werte kommen vom iPhone.
    return true;
  },
  async readDays(days: number): Promise<DailyMetrics[]> {
    if (!social.isConfigured() || !(await social.isSignedIn())) return demoProvider.readDays(days);
    const n = Math.max(1, Math.min(60, Math.floor(days) || 1));
    const rows = await social.fetchHealthDays(n);
    if (rows.length === 0) return [];
    const todayKey = localDateKey(new Date());
    // Nur Tage mit Werten zurückgeben: Fehlt ein Vortag noch (iPhone hat noch nicht synchronisiert),
    // wird er nicht als leerer Tag verbucht, sondern später, sobald er da ist.
    const past = rows.filter(r => r.date < todayKey);
    const today = rows.find(r => r.date === todayKey) ?? {
      date: todayKey, steps: 0, activeEnergyKcal: 0, workoutMinutes: 0,
      sleepHours: null, hrvMs: null, restingHr: null, source: 'cloud' as const,
    };
    return [...past.slice(-(n - 1)), today];
  },
};
