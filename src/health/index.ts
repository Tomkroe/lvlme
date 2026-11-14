/**
 * Health-Schnittstelle. Zuständig: Agent health-data.
 * Die App nutzt NUR diese Funktionen.
 * iPhone: Apple Health direkt. PC/Web/Android: Werte aus dem eigenen Konto (vom iPhone hochgeladen).
 */
import { Platform } from 'react-native';
import type { DailyMetrics } from '../types.ts';
import { demoProvider } from './demo.ts';
import { cloudProvider } from './cloud.ts';

export interface HealthProvider {
  /** Ist HealthKit auf diesem Gerät verfügbar? */
  isAvailable(): Promise<boolean>;
  /** Fragt die Leserechte an. true, wenn der Dialog durchlief (iOS verrät nicht, ob einzelne Typen erlaubt wurden). */
  requestAccess(): Promise<boolean>;
  /** Tageswerte der letzten `days` Tage, älteste zuerst, heute zuletzt. Fehlende Werte = null bzw. 0. */
  readDays(days: number): Promise<DailyMetrics[]>;
  /** Nur iPhone: aktuelles Gewicht, Größe und Körperfett aus Apple Health. Bleibt lokal. */
  readBody?(): Promise<{ weightKg?: number; heightCm?: number; bodyFatPct?: number } | null>;
}

let cached: HealthProvider | null = null;

/** iOS: Apple Health; sonst (PC/Web, Android) das eigene Konto bzw. Beispieldaten. */
export function getHealthProvider(): HealthProvider {
  if (cached) return cached;
  if (Platform.OS === 'ios') {
    try {
      // Ohne Dateiendung, damit Metro im Web healthkit.web.ts nimmt und das native Modul nie bündelt
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      // @ts-ignore – require ist in React Native vorhanden, Typen je nach Setup nicht
      const { healthKitProvider } = require('./healthkit') as typeof import('./healthkit.ts');
      cached = healthKitProvider;
      return cached;
    } catch {
      // natives Modul fehlt (z. B. Expo Go) → Demo
      cached = demoProvider;
      return cached;
    }
  }
  cached = cloudProvider;
  return cached;
}

export { demoProvider };
