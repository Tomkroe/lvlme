/**
 * Apple-Health-Provider (nur iOS, nur Lesezugriff) über @kingstinct/react-native-healthkit v14.
 *
 * Verifiziert gegen das Paket 14.0.1 (cdn.jsdelivr.net):
 *  - src/specs/CoreModule.nitro.ts: isHealthDataAvailableAsync(): Promise<boolean>,
 *    requestAuthorization(toRequest: AuthDataTypes): Promise<boolean>
 *  - src/hooks/useHealthkitAuthorization.ts: requestAuthorization({ toShare, toRead })
 *  - src/specs/QuantityTypeModule.nitro.ts: queryStatisticsForQuantity(identifier, statistics[], options?),
 *    queryQuantitySamples(identifier, options)
 *  - src/generated/healthkit.generated.ts: Identifier-Strings und Einheiten
 *    (StepCount 'count', ActiveEnergyBurned 'kcal', HRV SDNN 'ms', RestingHeartRate 'count/min'),
 *    Schlafwerte inBed=0, asleepUnspecified=1, awake=2, asleepCore=3, asleepDeep=4, asleepREM=5
 *
 * Nicht verifizierbar (Quelldateien hier nicht abrufbar) und deshalb defensiv gekapselt, siehe TODO verify:
 *  - Form der Datumsfilter in den Query-Optionen, Feldnamen der Statistik-Antwort,
 *    Namen von queryCategorySamples / queryWorkoutSamples, Workout-Identifier, Form von WorkoutSample.duration.
 *
 * Alle Aufrufe gehen über die lose typisierte Hülle `hk`, damit ein abweichender Typ nicht den Build bricht;
 * zur Laufzeit wird jede Funktion vor dem Aufruf geprüft. Fehler → null bzw. 0, nie Absturz.
 */
import * as HealthKitLib from '@kingstinct/react-native-healthkit';
import type { DailyMetrics } from '../types.ts';
import { localDateKey } from './demo.ts';

const STEPS = 'HKQuantityTypeIdentifierStepCount';
const ACTIVE_ENERGY = 'HKQuantityTypeIdentifierActiveEnergyBurned';
const HRV = 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN';
const RESTING_HR = 'HKQuantityTypeIdentifierRestingHeartRate';
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis';
const WORKOUT = 'HKWorkoutTypeIdentifier'; // TODO verify: Name in src/types/Shared.ts (ObjectTypeIdentifier)

/** Schlafphasen, die als Schlaf zählen (asleepUnspecified, asleepCore, asleepDeep, asleepREM) */
const ASLEEP_VALUES = new Set([1, 3, 4, 5]);

type AnyFn = (...args: any[]) => Promise<any>;
interface LooseHK {
  isHealthDataAvailableAsync?: () => Promise<boolean>;
  isHealthDataAvailable?: () => boolean;
  requestAuthorization?: (req: { toRead?: readonly string[]; toShare?: readonly string[] }) => Promise<boolean>;
  queryStatisticsForQuantity?: AnyFn;
  queryQuantitySamples?: AnyFn;
  queryCategorySamples?: AnyFn; // TODO verify name
  queryWorkoutSamples?: AnyFn; // TODO verify name
}
const lib = HealthKitLib as unknown as LooseHK & { default?: LooseHK };
const hk: LooseHK = { ...(lib.default ?? {}), ...lib };

const READ_TYPES = [STEPS, ACTIVE_ENERGY, HRV, RESTING_HR, SLEEP, WORKOUT] as const;

/** TODO verify: Datumsfilter-Form. Angenommen { filter: { date: { startDate, endDate } } } (v9+ "new filters"). */
const range = (startDate: Date, endDate: Date) => ({ filter: { date: { startDate, endDate } } });

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const v = await fn();
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

const num = (v: unknown): number | null => (typeof v === 'number' && isFinite(v) ? v : null);
const toDate = (v: unknown): Date | null => {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

/** Summe einer kumulativen Größe im Zeitraum (Statistik-Query vermeidet Doppelzählung iPhone + Watch) */
async function sumQuantity(identifier: string, unit: string, start: Date, end: Date): Promise<number> {
  if (!hk.queryStatisticsForQuantity) return 0;
  const res = await safe(() => hk.queryStatisticsForQuantity!(identifier, ['cumulativeSum'], { ...range(start, end), unit }), null);
  // TODO verify: Antwortfeld sumQuantity: { quantity, unit }
  return num(res?.sumQuantity?.quantity) ?? 0;
}

/** Mittelwert einer diskreten Größe im Zeitraum, null wenn keine Daten */
async function avgQuantity(identifier: string, unit: string, start: Date, end: Date): Promise<number | null> {
  if (hk.queryStatisticsForQuantity) {
    const res = await safe(() => hk.queryStatisticsForQuantity!(identifier, ['discreteAverage'], { ...range(start, end), unit }), null);
    // TODO verify: Antwortfeld averageQuantity: { quantity, unit }
    const v = num(res?.averageQuantity?.quantity);
    if (v != null) return v;
  }
  if (hk.queryQuantitySamples) {
    const samples = await safe(() => hk.queryQuantitySamples!(identifier, { ...range(start, end), unit, limit: 0 }), [] as any[]);
    const vals = (Array.isArray(samples) ? samples : []).map(s => num(s?.quantity)).filter((x): x is number => x != null);
    if (vals.length) return vals.reduce((a, b) => a + b, 0) / vals.length;
  }
  return null;
}

/** Schlafstunden der Nacht, die am Morgen von `day` endet (18:00 Vortag bis 12:00 des Tages), nur Asleep-Phasen */
async function sleepHours(day: Date): Promise<number | null> {
  if (!hk.queryCategorySamples) return null;
  const start = new Date(day);
  start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);
  const end = new Date(day);
  end.setHours(12, 0, 0, 0);
  const samples = await safe(() => hk.queryCategorySamples!(SLEEP, { ...range(start, end), limit: 0 }), [] as any[]);
  const intervals: [number, number][] = [];
  for (const s of Array.isArray(samples) ? samples : []) {
    if (!ASLEEP_VALUES.has(Number(s?.value))) continue;
    const a = toDate(s?.startDate);
    const b = toDate(s?.endDate);
    if (!a || !b) continue;
    const lo = Math.max(a.getTime(), start.getTime());
    const hi = Math.min(b.getTime(), end.getTime());
    if (hi > lo) intervals.push([lo, hi]);
  }
  if (!intervals.length) return null;
  // Überlappungen zusammenführen (iPhone und Watch liefern oft parallel)
  intervals.sort((x, y) => x[0] - y[0]);
  let total = 0;
  let [cs, ce] = intervals[0];
  for (const [s, e] of intervals.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  total += ce - cs;
  return Math.round((total / 3600000) * 10) / 10;
}

/** Summe der Workout-Minuten, die am Tag beginnen */
async function workoutMinutes(start: Date, end: Date): Promise<number> {
  if (!hk.queryWorkoutSamples) return 0;
  // TODO verify: Signatur queryWorkoutSamples(options) mit Datumsfilter
  const workouts = await safe(() => hk.queryWorkoutSamples!({ ...range(start, end), limit: 0 }), [] as any[]);
  let minutes = 0;
  for (const w of Array.isArray(workouts) ? workouts : []) {
    // TODO verify: duration ist { quantity, unit: 's' } oder Sekunden als Zahl; Fallback über Start/Ende
    const d = w?.duration;
    let secs = num(d?.quantity) ?? num(d);
    if (d?.unit === 'min' && secs != null) secs *= 60;
    if (secs == null) {
      const a = toDate(w?.startDate);
      const b = toDate(w?.endDate);
      secs = a && b ? (b.getTime() - a.getTime()) / 1000 : 0;
    }
    if (secs > 0) minutes += secs / 60;
  }
  return Math.round(minutes);
}

async function readDay(day: Date): Promise<DailyMetrics> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  const now = new Date();
  const until = end > now ? now : end;
  // Morgenfenster für HRV und Ruhepuls: Schlafende bis Vormittag des Tages, bei leeren Werten der ganze Tag
  const morningStart = new Date(start.getTime() - 6 * 3600000);
  const morningEnd = new Date(start.getTime() + 11 * 3600000);

  const [steps, kcal, workouts, sleep, hrvMorning, rhr] = await Promise.all([
    sumQuantity(STEPS, 'count', start, until),
    sumQuantity(ACTIVE_ENERGY, 'kcal', start, until),
    workoutMinutes(start, until),
    sleepHours(start),
    avgQuantity(HRV, 'ms', morningStart, morningEnd < until ? morningEnd : until),
    avgQuantity(RESTING_HR, 'count/min', start, until),
  ]);
  const hrv = hrvMorning ?? (await avgQuantity(HRV, 'ms', start, until));

  return {
    date: localDateKey(start),
    steps: Math.round(steps),
    activeEnergyKcal: Math.round(kcal),
    workoutMinutes: workouts,
    sleepHours: sleep,
    hrvMs: hrv == null ? null : Math.round(hrv),
    restingHr: rhr == null ? null : Math.round(rhr),
    source: 'healthkit',
  };
}

export const healthKitProvider = {
  async isAvailable(): Promise<boolean> {
    if (hk.isHealthDataAvailableAsync) return safe(() => hk.isHealthDataAvailableAsync!(), false);
    try {
      return hk.isHealthDataAvailable ? hk.isHealthDataAvailable() : false;
    } catch {
      return false;
    }
  },
  async requestAccess(): Promise<boolean> {
    if (!hk.requestAuthorization) return false;
    // Nur Lesen. iOS verrät nicht, welche Typen erlaubt wurden; fehlende Rechte ergeben einfach leere Werte.
    return safe(() => hk.requestAuthorization!({ toShare: [], toRead: [...READ_TYPES] }), false);
  },
  async readDays(days: number): Promise<DailyMetrics[]> {
    const n = Math.max(1, Math.min(60, Math.floor(days) || 1));
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const out: DailyMetrics[] = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      out.push(
        await safe(() => readDay(d), {
          date: localDateKey(d),
          steps: 0,
          activeEnergyKcal: 0,
          workoutMinutes: 0,
          sleepHours: null,
          hrvMs: null,
          restingHr: null,
          source: 'healthkit' as const,
        }),
      );
    }
    return out;
  },
};
