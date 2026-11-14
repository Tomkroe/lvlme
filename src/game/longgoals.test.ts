import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkLongGoals, longGoalFrac, longGoalValue, newLongGoal, rewardXp, sanitizeLongGoals, CUSTOM_XP } from './longgoals.ts';
import { NEW_PROGRESS, awardXp, bookDay, scoreDay } from './rules.ts';
import type { DailyMetrics, Progress } from '../types.ts';

const base = { hrvMs: 55, restingHr: 56, sleepHours: 7.2 };
const day = (date: string, o: Partial<DailyMetrics> = {}): DailyMetrics => ({ date, steps: 9000, activeEnergyKcal: 450, workoutMinutes: 40, sleepHours: 7.6, hrvMs: 62, restingHr: 54, source: 'demo', ...o });
const book = (p: Progress, m: DailyMetrics) => bookDay(p, m, scoreDay(m, base)).progress;

test('Verbuchte Tage zählen Schritte und Trainingstage mit', () => {
  let p = book(NEW_PROGRESS, day('2026-11-01'));
  p = book(p, day('2026-11-02', { workoutMinutes: 5, steps: 4000 }));
  assert.equal(p.totalSteps, 13000);
  assert.equal(p.workoutDays, 1);
  assert.equal(book(p, day('2026-11-02')).totalSteps, 13000); // Tag zählt nur einmal
});

test('Automatische Ziele zählen erst ab dem Anlegen', () => {
  let p = book(NEW_PROGRESS, day('2026-11-01'));
  const g = newLongGoal('steps_total', 50_000, p, '2026-11-02');
  assert.equal(longGoalValue(g, p), 0);
  p = book(p, day('2026-11-02'));
  assert.equal(longGoalValue(g, p), 9000);
  assert.ok(longGoalFrac(g, p) > 0.17 && longGoalFrac(g, p) < 0.19);
});

test('Ziel wird einmal erreicht und gibt einmal XP', () => {
  let p = NEW_PROGRESS;
  const g = newLongGoal('workout_days', 5, p, '2026-11-01');
  for (let i = 1; i <= 5; i++) p = book(p, day(`2026-11-0${i}`));
  const c = checkLongGoals([g], p, '2026-11-06');
  assert.equal(c.completed.length, 1);
  assert.equal(c.xp, rewardXp(g));
  const again = checkLongGoals(c.goals, p, '2026-11-07');
  assert.equal(again.xp, 0);
  assert.equal(again.completed.length, 0);
});

test('Eigene Ziele: XP nur einmal pro Woche', () => {
  const p = NEW_PROGRESS;
  const a = { ...newLongGoal('custom', 100, p, '2026-11-01', 'Bankdrücken', 'kg', 100) };
  const b = { ...newLongGoal('custom', 10, p, '2026-11-01', 'Klimmzüge', '', 10) };
  const c = checkLongGoals([a, b], p, '2026-11-08');
  assert.equal(c.completed.length, 2);
  assert.equal(c.xp, CUSTOM_XP);
  assert.equal(c.goals.filter(g => g.xp === 0).length, 1);
});

test('awardXp steigt im Level auf und ändert bei 0 nichts', () => {
  const r = awardXp(NEW_PROGRESS, 100000);
  assert.ok(r.levelsGained > 0);
  assert.equal(awardXp(NEW_PROGRESS, 0).progress, NEW_PROGRESS);
});

test('Gespeicherte Ziele werden bereinigt', () => {
  const l = sanitizeLongGoals([{ kind: 'streak', target: 9999, id: 'x' }, { kind: 'quatsch', target: 3 }, null, { kind: 'custom', target: -1 }]);
  assert.equal(l.length, 1);
  assert.equal(l[0].target, 100);
});
