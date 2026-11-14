import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL_GOALS_BONUS, GOAL_DEFS, goalStatus, goalXp, sanitizeGoals } from './goals.ts';
import { NEW_PROGRESS, bookDay, scoreDay } from './rules.ts';
import type { DailyMetrics } from '../types.ts';

const day = (o: Partial<DailyMetrics> = {}): DailyMetrics => ({ date: '2026-11-12', steps: 9000, activeEnergyKcal: 450, workoutMinutes: 40, sleepHours: 7.6, hrvMs: 62, restingHr: 54, source: 'demo', ...o });
const base = { hrvMs: 55, restingHr: 56, sleepHours: 7.2 };

test('erreichte Ziele geben XP, verfehlte nichts', () => {
  const g = { steps: 8000, workout: 30 };
  assert.equal(goalXp(day(), g).xp, 20 + 25 + ALL_GOALS_BONUS);
  assert.equal(goalXp(day({ steps: 5000 }), g).xp, 25);
  assert.equal(goalXp(day({ steps: 100, workoutMinutes: 0 }), g).xp, 0);
});

test('ohne Ziele keine Bonus-XP, ein einzelnes Ziel gibt keinen Gesamtbonus', () => {
  assert.equal(goalXp(day(), {}).xp, 0);
  assert.equal(goalXp(day(), { steps: 8000 }).xp, 20);
});

test('Schlafziel ohne Messwert zählt nicht als erreicht', () => {
  const s = goalStatus(day({ sleepHours: null }), { sleep: 7.5 });
  assert.equal(s[0].hit, false);
  assert.equal(s[0].value, null);
});

test('Schlafziel hat eine Untergrenze von 6 Stunden, Ziele bleiben in den Grenzen', () => {
  const g = sanitizeGoals({ sleep: 3, steps: 999999, workout: 'x', foo: 5, kcal: 433 });
  assert.equal(g.sleep, 6);
  assert.equal(g.steps, 20000);
  assert.equal(g.workout, undefined);
  assert.equal(g.kcal, 450);
  assert.ok(!('foo' in g));
  assert.equal(GOAL_DEFS.find(d => d.id === 'sleep')!.min, 6);
});

test('Ziel-XP werden mit dem Tag verbucht, aber nur einmal', () => {
  const m = day();
  const d = scoreDay(m, base);
  const { xp } = goalXp(m, { steps: 8000, workout: 30 });
  const plain = bookDay(NEW_PROGRESS, m, d);
  const withGoals = bookDay(NEW_PROGRESS, m, d, xp);
  const total = (p: typeof plain.progress) => p.xp;
  assert.ok(withGoals.progress.level > plain.progress.level || total(withGoals.progress) > total(plain.progress));
  const again = bookDay(withGoals.progress, m, d, xp);
  assert.equal(again.progress, withGoals.progress);
});
