import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreDay, bookDay, NEW_PROGRESS, stageFor, xpNeeded, recoveryScore, strainScore, baselineFrom, toPublic, power, BALANCE } from './rules.ts';
import type { Appearance, DailyMetrics, Progress } from '../types.ts';

const day = (o: Partial<DailyMetrics> = {}): DailyMetrics => ({ date: '2026-11-12', steps: 9000, activeEnergyKcal: 450, workoutMinutes: 40, sleepHours: 7.6, hrvMs: 62, restingHr: 54, source: 'demo', ...o });
const base = { hrvMs: 55, restingHr: 56, sleepHours: 7.2 };
const look: Appearance = { hair: 0, body: 0 };

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

// --- Datenschutz: Tagesform teilen ---
test('toPublic ohne shareMood: keine Stimmung, Kampfkraft unabhängig von der Tagesform', () => {
  const p = bookDay(NEW_PROGRESS, day(), scoreDay(day(), base)).progress;
  const good = scoreDay(day(), base);
  const bad = scoreDay(day({ sleepHours: 4, hrvMs: 30, restingHr: 66 }), base);
  const a = toPublic('A', p, good, { shareMood: false }, look);
  const b = toPublic('A', p, bad, { shareMood: false }, look);
  const c = toPublic('A', p, null, { shareMood: false }, look);
  assert.equal(a.mood, null);
  assert.equal(a.power, b.power);
  assert.equal(a.power, c.power);
  assert.equal(a.power, power(p, BALANCE.neutralEnergy));
});
test('toPublic mit shareMood: Stimmung und Tagesenergie', () => {
  const p = NEW_PROGRESS;
  const d = scoreDay(day(), base);
  const a = toPublic('A', p, d, { shareMood: true }, look);
  assert.equal(a.mood, 'charged');
  assert.equal(a.power, power(p, d.energy));
  assert.equal(toPublic('A', p, null, { shareMood: true }, look).mood, 'awake');
});

// --- Aussehen: Frisur und Körper gehen an Freunde ---
test('toPublic übernimmt Frisur und Körper, mit und ohne geteilte Tagesform', () => {
  const d = scoreDay(day(), base);
  const appearance: Appearance = { hair: 4, body: 7 };
  for (const shareMood of [false, true]) {
    const a = toPublic('A', NEW_PROGRESS, d, { shareMood }, appearance);
    assert.equal(a.hair, 4);
    assert.equal(a.body, 7);
  }
  const std = toPublic('A', NEW_PROGRESS, null, { shareMood: false }, { hair: 0, body: 0 });
  assert.equal(std.hair, 0);
  assert.equal(std.body, 0);
});
test('toPublic: Aussehen ändert weder Kampfkraft noch Stimmung', () => {
  const d = scoreDay(day(), base);
  const x = toPublic('A', NEW_PROGRESS, d, { shareMood: true }, { hair: 0, body: 0 });
  const y = toPublic('A', NEW_PROGRESS, d, { shareMood: true }, { hair: 6, body: 9 });
  assert.equal(x.power, y.power);
  assert.equal(x.mood, y.mood);
});
test('toPublic: nur die erlaubten Felder (wie is_public_avatar)', () => {
  const a = toPublic('A', NEW_PROGRESS, scoreDay(day(), base), { shareMood: true }, { hair: 2, body: 3 });
  const allowed = ['displayName', 'level', 'stage', 'mood', 'power', 'streak', 'updatedAt', 'hair', 'body'];
  assert.deepEqual(Object.keys(a).filter(k => !allowed.includes(k)), []);
});

// --- Serie: Ruhetage ---
const activeDay = (date: string) => day({ date });
const restDay = (date: string) => day({ date, steps: 1500, activeEnergyKcal: 80, workoutMinutes: 0 });
const book = (p: Progress, m: DailyMetrics) => bookDay(p, m, scoreDay(m, base)).progress;
const date = (i: number) => new Date(Date.UTC(2026, 10, 1 + i)).toISOString().slice(0, 10);

test('bis zu 2 Ruhetage pro 7 Tage halten die Serie, zählen aber nicht hoch', () => {
  let p = NEW_PROGRESS;
  for (let i = 0; i < 3; i++) p = book(p, activeDay(date(i)));
  assert.equal(p.streak, 3);
  p = book(p, restDay(date(3)));
  assert.equal(p.streak, 3);
  p = book(p, restDay(date(4)));
  assert.equal(p.streak, 3);
  p = book(p, activeDay(date(5)));
  assert.equal(p.streak, 4);
});
test('dritter Ruhetag im 7-Tage-Fenster beendet die Serie', () => {
  let p = NEW_PROGRESS;
  p = book(p, activeDay(date(0)));
  p = book(p, restDay(date(1)));
  p = book(p, activeDay(date(2)));
  p = book(p, restDay(date(3)));
  p = book(p, activeDay(date(4)));
  assert.equal(p.streak, 3);
  p = book(p, restDay(date(5)));
  assert.equal(p.streak, 0);
});
test('Ruhetage außerhalb des Fensters zählen nicht mehr', () => {
  let p = NEW_PROGRESS;
  p = book(p, activeDay(date(0)));
  p = book(p, restDay(date(1)));
  p = book(p, restDay(date(2)));
  for (let i = 3; i < 9; i++) p = book(p, activeDay(date(i)));
  // date(1) und date(2) liegen bei date(9) außerhalb des 7-Tage-Fensters
  p = book(p, restDay(date(9)));
  assert.equal(p.streak, 7);
});
test('Zweimal pro Woche Ruhetag: Serie wächst über Wochen weiter', () => {
  let p = NEW_PROGRESS;
  for (let i = 0; i < 28; i++) p = book(p, i % 7 === 2 || i % 7 === 5 ? restDay(date(i)) : activeDay(date(i)));
  assert.equal(p.streak, 20);
});
test('alter Fortschritt ohne restDays funktioniert', () => {
  const old = { level: 3, xp: 10, stats: { str: 10, end: 10, rec: 10, dis: 10 }, streak: 5, booked: [] } as Progress;
  const a = book(old, restDay(date(0)));
  assert.equal(a.streak, 5);
  assert.deepEqual(a.restDays, [date(0)]);
  const b = book(old, activeDay(date(0)));
  assert.equal(b.streak, 6);
});
test('Ruhetag wird nie mit Levelverlust oder XP-Abzug bestraft', () => {
  const p = book(NEW_PROGRESS, activeDay(date(0)));
  const r = book(p, restDay(date(1)));
  assert.ok(r.level >= p.level);
  assert.ok(r.level > p.level || r.xp >= p.xp);
});

// --- Übertraining ---
test('Übertraining: Belastungs-XP gedeckelt, mehr Belastung lohnt sich nicht', () => {
  const tired = { sleepHours: 4, hrvMs: 30, restingHr: 66 };
  const hard = scoreDay(day({ ...tired, activeEnergyKcal: 1400, workoutMinutes: 120 }), base);
  const extreme = scoreDay(day({ ...tired, activeEnergyKcal: 3000, workoutMinutes: 240 }), base);
  assert.equal(hard.overtraining, true);
  assert.equal(extreme.overtraining, true);
  assert.equal(extreme.xp - hard.xp, 0, 'gleiche Schritte, mehr Belastung → nicht mehr XP');
  const stepsXp = Math.round(9000 / 220);
  assert.equal(hard.xp, Math.round(BALANCE.overtrainingStrainCap * BALANCE.xpPerStrain + stepsXp));
});
test('Übertraining bringt nicht mehr XP als ein gleich harter Tag mit guter Erholung', () => {
  const load = { activeEnergyKcal: 1400, workoutMinutes: 120 };
  const ot = scoreDay(day({ ...load, sleepHours: 4, hrvMs: 30, restingHr: 66 }), base);
  const ok = scoreDay(day(load), base);
  assert.ok(ot.xp < ok.xp, `${ot.xp} < ${ok.xp}`);
});
