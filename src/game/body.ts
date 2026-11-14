/**
 * Körperwerte (Größe, Gewicht, KFA) → Vorschlag für den Körpertyp. Zuständig: game-balance.
 * Reine Funktionen, rein optisch: nichts davon beeinflusst XP, Level oder Stats.
 * Datenschutz: Größe, Gewicht und KFA bleiben auf dem Gerät. In PublicAvatar geht nur der Körpertyp (BodyId):
 * der selbst gewählte, oder – nur wenn der Nutzer „automatisch“ eingeschaltet hat – der aus den Werten abgeleitete.
 */
import type { BodyId } from '../types.ts';

export interface BodyStats {
  heightCm: number;
  weightKg: number;
  /** Körperfettanteil in Prozent */
  bodyFatPct: number;
}

export const BODY_LIMITS = {
  heightCm: { min: 140, max: 210, def: 178 },
  weightKg: { min: 40, max: 160, def: 78 },
  bodyFatPct: { min: 4, max: 45, def: 18 },
} as const;

export const DEFAULT_BODY_STATS: BodyStats = {
  heightCm: BODY_LIMITS.heightCm.def,
  weightKg: BODY_LIMITS.weightKg.def,
  bodyFatPct: BODY_LIMITS.bodyFatPct.def,
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Werte in den erlaubten Bereich bringen (auch für gespeicherte oder fremde Eingaben) */
export function clampStats(s: Partial<BodyStats> | null | undefined): BodyStats {
  const n = (v: unknown, lim: { min: number; max: number; def: number }) =>
    clamp(Number.isFinite(Number(v)) && Number(v) > 0 ? Math.round(Number(v)) : lim.def, lim.min, lim.max);
  return {
    heightCm: n(s?.heightCm, BODY_LIMITS.heightCm),
    weightKg: n(s?.weightKg, BODY_LIMITS.weightKg),
    bodyFatPct: n(s?.bodyFatPct, BODY_LIMITS.bodyFatPct),
  };
}

/** Body-Mass-Index */
export function bmi(s: BodyStats): number {
  const h = s.heightCm / 100;
  return s.weightKg / (h * h);
}

/** Fettfreie Masse pro m² (FFMI), auf 1,8 m Körpergröße normiert */
export function ffmi(s: BodyStats): number {
  const h = s.heightCm / 100;
  const ffm = s.weightKg * (1 - s.bodyFatPct / 100);
  return ffm / (h * h) + 6.1 * (1.8 - h);
}

/** Ab diesem Körperfettanteil (in %) wird der Körpertyp „Stämmig“ */
export const STOCKY_FROM_BODY_FAT = 22;
/** Bis zu diesem Körperfettanteil (in %) wird der Körpertyp „Definiert“ (bei normaler Muskelmasse) */
export const DEFINED_UP_TO_BODY_FAT = 12;
/** Gewichtsverlust-Ziele enden spätestens bei diesem BMI: kein Anreiz, untergewichtig zu werden */
export const MIN_GOAL_BMI = 20;

/** Wie viele kg man höchstens als Ziel abnehmen darf (0 = kein Gewichtsverlust-Ziel sinnvoll), ganze kg */
export function maxWeightLossKg(s: BodyStats): number {
  const h = s.heightCm / 100;
  return Math.max(0, Math.min(30, Math.floor(s.weightKg - MIN_GOAL_BMI * h * h)));
}

export interface BodySuggestion {
  id: BodyId;
  /** kurze Begründung für die Anzeige */
  why: string;
}

/**
 * Welcher Körpertyp (0 Athletisch, 1 Definiert, 2 Schlank, 3 Kraftsport, 4 Stämmig) passt am besten?
 * Grobe Einteilung nach Körperfett und fettfreier Masse; es ist nur ein Vorschlag.
 */
export function suggestBody(s: BodyStats): BodySuggestion {
  const f = ffmi(s);
  if (s.bodyFatPct >= STOCKY_FROM_BODY_FAT) return { id: 4, why: 'höherer Körperfettanteil' };
  if (f >= 22 && s.bodyFatPct <= 18) return { id: 3, why: 'viel Muskelmasse' };
  if (f < 18 && s.bodyFatPct <= 18) return { id: 2, why: 'schlank, wenig Muskelmasse' };
  if (s.bodyFatPct <= DEFINED_UP_TO_BODY_FAT) return { id: 1, why: 'wenig Körperfett, gut sichtbare Muskeln' };
  return { id: 0, why: 'ausgewogen und sportlich' };
}
