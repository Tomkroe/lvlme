/**
 * Langzeitziele: größere, selbst gewählte Ziele mit einmaliger XP-Belohnung. Zuständig: game-balance.
 * Reine Funktionen. Automatisch gemessen werden Schritte insgesamt, Trainingstage und Serie; „eigene“
 * Ziele (z. B. Bankdrücken 100 kg) trägst du selbst nach. Regeln aus CLAUDE.md: kein Gewichts-/KFA-Ziel
 * (keine Belohnung fürs Hungern), nichts wird bestraft, nicht erreichte Ziele kosten nichts.
 */
import type { Progress } from '../types.ts';

export type LongGoalKind = 'steps_total' | 'workout_days' | 'streak' | 'custom';

export interface LongGoal {
  id: string;
  kind: LongGoalKind;
  title: string;
  target: number;
  unit: string;
  /** Zählerstand beim Anlegen (automatische Ziele zählen ab dann) */
  start: number;
  /** Stand bei eigenen Zielen (von Hand eingetragen) */
  current: number;
  createdAt: string;
  doneAt?: string;
  /** tatsächlich gutgeschriebene XP */
  xp?: number;
}

export interface LongGoalKindDef {
  kind: LongGoalKind;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  def: number;
}

export const LONG_GOAL_KINDS: readonly LongGoalKindDef[] = [
  { kind: 'steps_total', label: 'Schritte insgesamt', unit: 'Schritte', min: 50_000, max: 2_000_000, step: 50_000, def: 300_000 },
  { kind: 'workout_days', label: 'Trainingstage', unit: 'Tage', min: 5, max: 200, step: 5, def: 30 },
  { kind: 'streak', label: 'Serie (Tage in Folge)', unit: 'Tage', min: 7, max: 100, step: 1, def: 14 },
  { kind: 'custom', label: 'Eigenes Ziel', unit: '', min: 1, max: 100_000, step: 1, def: 100 },
];

export const MAX_LONG_GOALS = 8;
/** Eigene Ziele geben höchstens so oft XP, damit sich niemand mit Mini-Zielen hochschaukelt */
export const CUSTOM_XP_COOLDOWN_DAYS = 7;
export const CUSTOM_XP = 100;

export function kindDef(kind: LongGoalKind): LongGoalKindDef {
  return LONG_GOAL_KINDS.find(k => k.kind === kind)!;
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Belohnung (XP) für das Erreichen eines Ziels, ohne Cooldown */
export function rewardXp(g: Pick<LongGoal, 'kind' | 'target'>): number {
  switch (g.kind) {
    case 'steps_total': return clamp(Math.round(g.target / 2000), 20, 300);
    case 'workout_days': return clamp(g.target * 6, 30, 300);
    case 'streak': return clamp(g.target * 5, 35, 300);
    case 'custom': return CUSTOM_XP;
  }
}

/** Aktueller Stand eines Ziels */
export function longGoalValue(g: LongGoal, p: Progress): number {
  switch (g.kind) {
    case 'steps_total': return Math.max(0, (p.totalSteps ?? 0) - g.start);
    case 'workout_days': return Math.max(0, (p.workoutDays ?? 0) - g.start);
    case 'streak': return p.streak;
    case 'custom': return g.current;
  }
}

export function longGoalFrac(g: LongGoal, p: Progress): number {
  return g.target > 0 ? clamp(longGoalValue(g, p) / g.target, 0, 1) : 0;
}

/** Neues Ziel anlegen (Zählerstand wird festgehalten, damit nur ab jetzt gezählt wird) */
export function newLongGoal(kind: LongGoalKind, target: number, p: Progress, today: string, title = '', unit = '', current = 0): LongGoal {
  const d = kindDef(kind);
  const t = clamp(Math.round(target), d.min, d.max);
  return {
    id: `${kind}-${today}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    title: kind === 'custom' ? title.trim().slice(0, 40) || 'Eigenes Ziel' : d.label,
    target: t,
    unit: kind === 'custom' ? unit.trim().slice(0, 12) : d.unit,
    start: kind === 'steps_total' ? (p.totalSteps ?? 0) : kind === 'workout_days' ? (p.workoutDays ?? 0) : 0,
    current: kind === 'custom' ? Math.max(0, current) : 0,
    createdAt: today,
  };
}

/** Gespeicherte oder fremde Werte bereinigen */
export function sanitizeLongGoals(list: unknown): LongGoal[] {
  if (!Array.isArray(list)) return [];
  const out: LongGoal[] = [];
  for (const g of list) {
    if (!g || typeof g !== 'object') continue;
    const o = g as Record<string, unknown>;
    const kind = o.kind as LongGoalKind;
    if (!LONG_GOAL_KINDS.some(k => k.kind === kind)) continue;
    const d = kindDef(kind);
    const target = Number(o.target);
    if (!Number.isFinite(target) || target <= 0) continue;
    out.push({
      id: typeof o.id === 'string' ? o.id.slice(0, 60) : `${kind}-${out.length}`,
      kind,
      title: typeof o.title === 'string' ? o.title.slice(0, 40) : d.label,
      target: clamp(Math.round(target), d.min, d.max),
      unit: typeof o.unit === 'string' ? o.unit.slice(0, 12) : d.unit,
      start: Number.isFinite(Number(o.start)) ? Math.max(0, Number(o.start)) : 0,
      current: Number.isFinite(Number(o.current)) ? Math.max(0, Number(o.current)) : 0,
      createdAt: typeof o.createdAt === 'string' ? o.createdAt : '',
      doneAt: typeof o.doneAt === 'string' ? o.doneAt : undefined,
      xp: Number.isFinite(Number(o.xp)) ? Number(o.xp) : undefined,
    });
  }
  return out.slice(0, MAX_LONG_GOALS * 4);
}

function daysBetween(a: string, b: string): number {
  const ta = Date.parse(`${a}T00:00:00Z`);
  const tb = Date.parse(`${b}T00:00:00Z`);
  return Number.isNaN(ta) || Number.isNaN(tb) ? 0 : Math.round((tb - ta) / 86_400_000);
}

export interface LongGoalCheck {
  goals: LongGoal[];
  /** neu erreichte Ziele */
  completed: LongGoal[];
  xp: number;
}

/**
 * Prüft, welche offenen Ziele jetzt erreicht sind, markiert sie und rechnet die XP aus.
 * Jedes Ziel gibt nur einmal XP. Eigene Ziele geben nur XP, wenn in den letzten
 * CUSTOM_XP_COOLDOWN_DAYS Tagen kein anderes eigenes Ziel XP gegeben hat; sonst zählt es als erreicht, ohne XP.
 */
export function checkLongGoals(goals: LongGoal[], p: Progress, today: string): LongGoalCheck {
  let xp = 0;
  const completed: LongGoal[] = [];
  const next = goals.map(g => ({ ...g }));
  for (const g of next) {
    if (g.doneAt || longGoalValue(g, p) < g.target) continue;
    let gain = rewardXp(g);
    if (g.kind === 'custom') {
      const recent = next.some(o => o !== g && o.kind === 'custom' && o.doneAt && (o.xp ?? 0) > 0 && daysBetween(o.doneAt, today) < CUSTOM_XP_COOLDOWN_DAYS);
      if (recent) gain = 0;
    }
    g.doneAt = today;
    g.xp = gain;
    xp += gain;
    completed.push(g);
  }
  return { goals: next, completed, xp };
}
