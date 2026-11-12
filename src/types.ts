/**
 * Gemeinsame Typen. Einzige Schnittstelle zwischen Health-Daten, Spiellogik, Avatar, UI und Backend.
 * Wer hier etwas ändert, nennt es in der Übergabe (siehe CLAUDE.md).
 */

/** Tageswerte, wie sie aus Apple Health (oder später WHOOP) gelesen werden. Rohdaten, bleiben auf dem Gerät. */
export interface DailyMetrics {
  /** Kalendertag in lokaler Zeit, Format YYYY-MM-DD */
  date: string;
  steps: number;
  /** aktive Kalorien in kcal */
  activeEnergyKcal: number;
  /** Summe der Workout-Minuten */
  workoutMinutes: number;
  /** Schlaf der vorherigen Nacht in Stunden (nur "asleep"-Phasen) */
  sleepHours: number | null;
  /** HRV (SDNN) in ms, Mittel der Nacht/des Morgens */
  hrvMs: number | null;
  /** Ruhepuls in bpm */
  restingHr: number | null;
  /** Woher die Werte stammen */
  source: 'healthkit' | 'whoop' | 'demo';
}

/** Persönliche Basiswerte über 7 Tage, um Recovery relativ zu berechnen */
export interface Baseline {
  hrvMs: number | null;
  restingHr: number | null;
  sleepHours: number | null;
}

export type Mood = 'charged' | 'awake' | 'tired' | 'proud' | 'lazy';

/** Abgeleitete Tagesform (0–100 bzw. 0–21) */
export interface DayScore {
  date: string;
  /** Erholung 0–100, eigene Berechnung (Apple liefert keinen Recovery-Score) */
  recovery: number;
  /** Belastung 0–21, an WHOOP-Strain angelehnt */
  strain: number;
  /** Schlaf 0–100 (% des Schlafziels) */
  sleep: number;
  /** Energie 0–100 = Mischung aus Erholung und Schlaf */
  energy: number;
  mood: Mood;
  overtraining: boolean;
  /** XP, die dieser Tag bringt */
  xp: number;
}

export interface Stats {
  str: number;
  end: number;
  rec: number;
  dis: number;
}

/** Gespeicherter Fortschritt des Spielers (lokal) */
export interface Progress {
  level: number;
  /** XP innerhalb des aktuellen Levels */
  xp: number;
  stats: Stats;
  /** Tage in Folge aktiv */
  streak: number;
  /** bereits verbuchte Tage (YYYY-MM-DD), damit kein Tag doppelt zählt */
  booked: string[];
}

/** Öffentlicher Avatarzustand. Das ist ALLES, was an das Backend und an Freunde geht – keine Rohdaten. */
export interface PublicAvatar {
  displayName: string;
  level: number;
  stage: number;
  mood: Mood;
  power: number;
  streak: number;
  updatedAt: string;
}
