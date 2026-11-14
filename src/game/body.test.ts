import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bmi, clampStats, ffmi, suggestBody, BODY_LIMITS } from './body.ts';

const s = (heightCm: number, weightKg: number, bodyFatPct: number) => ({ heightCm, weightKg, bodyFatPct });

test('BMI und FFMI sind plausibel', () => {
  assert.ok(Math.abs(bmi(s(180, 81, 15)) - 25) < 0.01);
  const f = ffmi(s(180, 80, 15));
  assert.ok(f > 20 && f < 23, `ffmi ${f}`);
});

test('Eingaben werden begrenzt, Unsinn fällt auf den Standard zurück', () => {
  const c = clampStats({ heightCm: 500, weightKg: -3, bodyFatPct: Number.NaN });
  assert.equal(c.heightCm, BODY_LIMITS.heightCm.max);
  assert.equal(c.weightKg, BODY_LIMITS.weightKg.def);
  assert.equal(c.bodyFatPct, BODY_LIMITS.bodyFatPct.def);
  assert.equal(clampStats(null).heightCm, BODY_LIMITS.heightCm.def);
});

test('Körpertyp-Vorschlag', () => {
  assert.equal(suggestBody(s(178, 95, 30)).id, 4);   // stämmig
  assert.equal(suggestBody(s(180, 92, 12)).id, 3);   // Kraftsport
  assert.equal(suggestBody(s(182, 62, 12)).id, 2);   // schlank
  assert.equal(suggestBody(s(178, 70, 11)).id, 1);   // definiert
  assert.equal(suggestBody(s(178, 78, 18)).id, 0);   // athletisch
});

test('Vorschlag liefert immer eine gültige Körpertyp-Id (0–4)', () => {
  for (let h = 140; h <= 210; h += 10) for (let w = 40; w <= 160; w += 20) for (let k = 4; k <= 45; k += 5) {
    const id = suggestBody(s(h, w, k)).id;
    assert.ok(id >= 0 && id <= 4);
  }
});
