/**
 * Tagesziele: Wer ein selbst gewähltes Ziel erreicht, bekommt Bonus-XP. Zuständig: game-balance.
 * Reine Funktionen. Regeln aus CLAUDE.md: Nicht erreichte Ziele kosten nie etwas (Ruhetage und schlechte Tage
 * werden nicht bestraft), und es gibt keine Belohnung für wenig Essen oder Schlafentzug – deshalb gibt es kein
 * Gewichts-/Körperfettziel, und das Schlafziel hat eine Untergrenze von 6 Stunden.
 */
import type { DailyMetrics } from '../types.ts';
import { goalCoins } from './shop.ts';

export type GoalId = 'steps' | 'workout' | 'sleep' | 'kcal';

export interface GoalDef {
  id: GoalId;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  def: number;
  /** Bonus-XP für das Erreichen an einem Tag */
  xp: number;
}

export const GOAL_DEFS: readonly GoalDef[] = [
  { id: 'steps', label: 'Schritte', unit: 'Schritte', min: 3000, max: 20000, step: 500, def: 8000, xp: 20 },
  { id: 'workout', label: 'Training', unit: 'Min.', min: 10, max: 120, step: 5, def: 30, xp: 25 },
  { id: 'kcal', label: 'Aktive Kalorien', unit: 'kcal', min: 100, max: 1500, step: 50, def: 400, xp: 20 },
  { id: 'sleep', label: 'Schlaf', unit: 'Std.', min: 6, max: 9, step: 0.5, def: 7.5, xp: 20 },
];

/** Gesetzte Ziele: ein Eintrag = Ziel aktiv, der Wert ist die Zielmarke pro Tag */
export type Goals = Partial<Record<GoalId, number>>;

export const DEFAULT_GOALS: Goals = { steps: 8000, workout: 30 };

/** Zusatz-XP, wenn mindestens zwei Ziele gesetzt sind und an einem Tag alle erreicht werden */
export const ALL_GOALS_BONUS = 15;

export function goalDef(id: GoalId): GoalDef {
  return GOAL_DEFS.find(g => g.id === id)!;
}

/** Gespeicherte oder fremde Werte bereinigen: nur bekannte Ziele, Zielmarke in den erlaubten Grenzen */
export function sanitizeGoals(g: unknown): Goals {
  const out: Goals = {};
  if (!g || typeof g !== 'object') return out;
  for (const d of GOAL_DEFS) {
    const v = Number((g as Record<string, unknown>)[d.id]);
    if (Number.isFinite(v) && v > 0) out[d.id] = Math.max(d.min, Math.min(d.max, Math.round(v / d.step) * d.step));
  }
  return out;
}

/** Messwert des Tages für ein Ziel (null = nicht gemessen) */
export function goalValue(id: GoalId, m: DailyMetrics): number | null {
  switch (id) {
    case 'steps': return m.steps;
    case 'workout': return m.workoutMinutes;
    case 'kcal': return m.activeEnergyKcal;
    case 'sleep': return m.sleepHours;
  }
}

export interface GoalStatus {
  id: GoalId;
  target: number;
  value: number | null;
  /** 0–1 */
  frac: number;
  hit: boolean;
}

export function goalStatus(m: DailyMetrics, goals: Goals): GoalStatus[] {
  const out: GoalStatus[] = [];
  for (const d of GOAL_DEFS) {
    const target = goals[d.id];
    if (target == null) continue;
    const value = goalValue(d.id, m);
    out.push({ id: d.id, target, value, frac: value == null ? 0 : Math.max(0, Math.min(1, value / target)), hit: value != null && value >= target });
  }
  return out;
}

/** Bonus-XP, die ein abgeschlossener Tag durch erreichte Ziele bringt */
export function goalXp(m: DailyMetrics, goals: Goals): { xp: number; hit: GoalId[]; coins: number } {
  const st = goalStatus(m, goals);
  const hit = st.filter(s => s.hit).map(s => s.id);
  let xp = hit.reduce((sum, id) => sum + goalDef(id).xp, 0);
  if (st.length >= 2 && hit.length === st.length) xp += ALL_GOALS_BONUS;
  return { xp, hit, coins: goalCoins(hit.length, st.length >= 2 && hit.length === st.length) };
}
