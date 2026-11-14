import { test } from 'node:test';
import assert from 'node:assert/strict';
import { avgActiveKcal, basalRate, calorieTarget, sanitizeAge, sanitizeCustom, sanitizeSex, type CalorieInput } from './calories.ts';

const base: CalorieInput = { stats: { heightCm: 180, weightKg: 80, bodyFatPct: 20 }, ageYears: 30, sex: 'male', useBodyFat: false, activeKcalAvg: 400, goal: 'maintain' };

test('Mifflin-St Jeor: männlich, weiblich, Mittelwert', () => {
  assert.equal(basalRate(base).bmr, 1780);
  assert.equal(basalRate({ ...base, sex: 'female' }).bmr, 1614);
  assert.equal(basalRate({ ...base, sex: 'unspecified' }).bmr, 1697);
  assert.equal(basalRate(base).method, 'mifflin');
});

test('Katch-McArdle mit KFA, unabhängig vom Geschlecht', () => {
  const a = basalRate({ ...base, useBodyFat: true });
  assert.equal(a.method, 'katch');
  assert.equal(a.bmr, Math.round(370 + 21.6 * 64));
  assert.equal(basalRate({ ...base, useBodyFat: true, sex: 'female' }).bmr, a.bmr);
});

test('Gesamtbedarf: Grundumsatz × 1,2 + aktive Kalorien', () => {
  const t = calorieTarget(base);
  assert.equal(t.tdee, Math.round(1780 * 1.2 + 400));
  assert.equal(t.recommended, Math.round(t.tdee / 10) * 10);
  assert.equal(calorieTarget({ ...base, activeKcalAvg: null }).tdee, Math.round(1780 * 1.2));
});

test('Abnehmen höchstens −20 %, Aufbauen +5 bis +10 %', () => {
  const m = calorieTarget(base), l = calorieTarget({ ...base, goal: 'lose' }), g = calorieTarget({ ...base, goal: 'gain' });
  assert.ok(l.recommended >= m.tdee * 0.8 - 5 && l.recommended < m.tdee);
  assert.ok(g.recommended >= m.tdee * 1.05 && g.recommended <= m.tdee * 1.1 + 5);
});

test('Empfehlung fällt nie unter den Grundumsatz', () => {
  const t = calorieTarget({ ...base, activeKcalAvg: 0, goal: 'lose', stats: { heightCm: 190, weightKg: 90, bodyFatPct: 20 }, useBodyFat: true });
  assert.ok(t.recommended >= t.bmr);
  for (const w of [40, 60, 100, 160]) for (const goal of ['lose', 'maintain', 'gain'] as const) {
    const r = calorieTarget({ ...base, stats: { heightCm: 170, weightKg: w, bodyFatPct: 25 }, goal, activeKcalAvg: null });
    assert.ok(r.recommended >= r.bmr);
  }
});

test('Unter 18 oder BMI unter 18,5: kein Abnehmen, sondern Halten', () => {
  const y = calorieTarget({ ...base, ageYears: 16, goal: 'lose' });
  assert.equal(y.goalApplied, 'maintain'); assert.equal(y.limitedBy, 'age'); assert.equal(y.goal, 'lose');
  const lean = calorieTarget({ ...base, stats: { heightCm: 180, weightKg: 55, bodyFatPct: 12 }, goal: 'lose' });
  assert.equal(lean.goalApplied, 'maintain'); assert.equal(lean.limitedBy, 'bmi');
});

test('Eigener Wert bleibt, unter Grundumsatz gibt es die Warnung', () => {
  const t = calorieTarget({ ...base, custom: 1500 });
  assert.equal(t.custom, 1500); assert.ok(t.belowBmr);
  assert.ok(!calorieTarget({ ...base, custom: 2200 }).belowBmr);
  assert.equal(calorieTarget(base).custom, undefined); assert.equal(calorieTarget(base).belowBmr, false);
  // Gewicht ändert die Empfehlung, den eigenen Wert nicht
  const a = calorieTarget({ ...base, custom: 2000 }), b = calorieTarget({ ...base, custom: 2000, stats: { ...base.stats, weightKg: 70 } });
  assert.notEqual(a.recommended, b.recommended); assert.equal(b.custom, 2000);
});

test('Eingaben bereinigen, Schnitt der aktiven Kalorien', () => {
  assert.equal(sanitizeAge('abc'), 30); assert.equal(sanitizeAge(5), 14); assert.equal(sanitizeAge(150), 100);
  assert.equal(sanitizeSex('x'), 'unspecified'); assert.equal(sanitizeSex('male'), 'male');
  assert.equal(sanitizeCustom(''), undefined); assert.equal(sanitizeCustom(null), undefined); assert.equal(sanitizeCustom(100), 800); assert.equal(sanitizeCustom(2100.4), 2100);
  assert.equal(avgActiveKcal([]), null);
  assert.equal(avgActiveKcal([{ activeEnergyKcal: 0 }, { activeEnergyKcal: 300 }, { activeEnergyKcal: 500 }]), 400);
});
