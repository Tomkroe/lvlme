/**
 * Health-Schnittstelle. Zuständig: Agent health-data.
 * Die App nutzt NUR diese Funktionen. Rohdaten bleiben auf dem Gerät.
 */
import { Platform } from 'react-native';
import type { DailyMetrics } from '../types.ts';

export interface HealthProvider {
  /** Ist HealthKit auf diesem Gerät verfügbar? */
  isAvailable(): Promise<boolean>;
  /** Fragt die Leserechte an. true, wenn der Dialog durchlief (iOS verrät nicht, ob einzelne Typen erlaubt wurden). */
  requestAccess(): Promise<boolean>;
  /** Tageswerte der letzten `days` Tage, älteste zuerst, heute zuletzt. Fehlende Werte = null bzw. 0. */
  readDays(days: number): Promise<DailyMetrics[]>;
}

// Implementierungen in healthkit.ts (iOS) und demo.ts (Simulator/Android/Web)
export { };
export declare function getHealthProvider(): HealthProvider;
