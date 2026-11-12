/**
 * Health-Schnittstelle. Zuständig: Agent health-data.
 * Die App nutzt NUR diese Funktionen. Rohdaten bleiben auf dem Gerät.
 */
import { Platform } from 'react-native';
import type { DailyMetrics } from '../types.ts';
import { demoProvider } from './demo.ts';

export interface HealthProvider {
  /** Ist HealthKit auf diesem Gerät verfügbar? */
  isAvailable(): Promise<boolean>;
  /** Fragt die Leserechte an. true, wenn der Dialog durchlief (iOS verrät nicht, ob einzelne Typen erlaubt wurden). */
  requestAccess(): Promise<boolean>;
  /** Tageswerte der letzten `days` Tage, älteste zuerst, heute zuletzt. Fehlende Werte = null bzw. 0. */
  readDays(days: number): Promise<DailyMetrics[]>;
}

let cached: HealthProvider | null = null;

/** iOS: Apple Health; sonst (Android, Web) Demo-Daten. */
export function getHealthProvider(): HealthProvider {
  if (cached) return cached;
  if (Platform.OS === 'ios') {
    try {
      // Lazy require, damit Android/Web das native Modul nie laden
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      // @ts-ignore – require ist in React Native vorhanden, Typen je nach Setup nicht
      const { healthKitProvider } = require('./healthkit.ts') as typeof import('./healthkit.ts');
      cached = healthKitProvider;
      return cached;
    } catch {
      // natives Modul fehlt (z. B. Expo Go) → Demo
    }
  }
  cached = demoProvider;
  return cached;
}

export { demoProvider };
