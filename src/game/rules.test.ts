import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreDay, bookDay, NEW_PROGRESS, stageFor, xpNeeded, recoveryScore, strainScore, baselineFrom } from './rules.ts';
import type { DailyMetrics } from '../types.ts';

const day = (o: Partial<DailyMetrics> = {}): DailyMetrics => ({ date: '2026-11-12', steps: 9000, activeEnergyKcal: 450, workoutMinutes: 40, sleepHours: 7.6, hrvMs: 62, restingHr: 54, source: 'demo', ...o });
const base = { hrvMs: 55, restingHr: 56, sleepHours: 7.2 };

test('guter Tag: aufgeladen, Bonus', () => {
  const d = scoreDay(day(), base);
  assert.ok(d.recovery >= 67, `recovery ${d.recovery}`);
  assert.equal(d.mood, 'charged');
  assert.ok(d.xp > 0);
});
test('Couch-Tag: träge', () => {
  assert.equal(scoreDay(day({ steps: 1200, activeEnergyKcal: 60, workoutMinutes: 0 }), base).mood, 'lazy');
});
test('Übertraining: müde, kein Bonus', () => {
  const d = scoreDay(day({ sleepHours: 4, hrvMs: 30, restingHr: 66, activeEnergyKcal: 1400, workoutMinutes: 120 }), base);
  assert.equal(d.overtraining, true);
  assert.equal(d.mood, 'tired');
});
test('Werte bleiben in Grenzen', () => {
  for (const s of [0, 3000, 30000]) for (const k of [0, 500, 4000]) {
    const st = strainScore(day({ steps: s, activeEnergyKcal: k }));
    assert.ok(st >= 0 && st <= 21);
    const r = recoveryScore(day({ hrvMs: k / 10 || null }), base);
    assert.ok(r >= 0 && r <= 100);
  }
});
test('ohne Basiswerte funktioniert die Erholung', () => {
  const r = recoveryScore(day(), baselineFrom([]));
  assert.ok(r > 0 && r <= 100);
});
test('Tag zählt nur einmal, Level steigt', () => {
  const m = day();
  const d = scoreDay(m, base);
  const a = bookDay(NEW_PROGRESS, m, d);
  assert.ok(a.progress.level > 1);
  const b = bookDay(a.progress, m, d);
  assert.deepEqual(b.progress, a.progress);
});
test('erste Verwandlung nach etwa zwei guten Wochen', () => {
  let p = NEW_PROGRESS; let days = 0;
  while (stageFor(p.level) === 0 && days < 200) {
    const m = day({ date: `d${days}` });
    p = bookDay(p, m, scoreDay(m, base)).progress; days++;
  }
  assert.ok(days >= 5 && days <= 30, `Tage bis Stufe 1: ${days}`);
  assert.ok(xpNeeded(1) > 0);
});
