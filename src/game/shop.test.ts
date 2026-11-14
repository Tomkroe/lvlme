import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COINS, SHOP_ITEMS, awardCoins, buyItem, coinsOf, dayCoins, goalCoins, isOwned, itemsOf, levelCoins, longGoalCoins } from './shop.ts';
import { NEW_PROGRESS, awardXp, bookDay, scoreDay } from './rules.ts';
import { goalXp } from './goals.ts';
import type { DailyMetrics, Progress } from '../types.ts';

const base = { hrvMs: 55, restingHr: 56, sleepHours: 7.2 };
const day = (date: string, o: Partial<DailyMetrics> = {}): DailyMetrics => ({ date, steps: 9000, activeEnergyKcal: 450, workoutMinutes: 40, sleepHours: 7.6, hrvMs: 62, restingHr: 54, source: 'demo', ...o });

test('Jeder verbuchte Tag gibt Münzen, Ruhetage auch (keine Bestrafung)', () => {
  const rest = day('2026-11-01', { steps: 500, activeEnergyKcal: 30, workoutMinutes: 0 });
  const r = bookDay(NEW_PROGRESS, rest, scoreDay(rest, base)).progress;
  assert.equal(coinsOf(r), COINS.restDay);
  const a = bookDay(NEW_PROGRESS, day('2026-11-01'), scoreDay(day('2026-11-01'), base)).progress;
  assert.ok(coinsOf(a) >= COINS.activeDay);
  assert.equal(dayCoins(true), COINS.activeDay);
});

test('Level-ups und Verwandlungen geben Münzen', () => {
  assert.equal(levelCoins(0, 0, 0), 0);
  assert.equal(levelCoins(2, 0, 0), 2 * COINS.level);
  assert.equal(levelCoins(1, 0, 1), COINS.level + COINS.stage);
  const r = awardXp(NEW_PROGRESS, 100000);
  assert.ok(coinsOf(r.progress) >= r.levelsGained * COINS.level);
});

test('Ziele geben Münzen', () => {
  const m = day('2026-11-02');
  const g = goalXp(m, { steps: 8000, workout: 30 });
  assert.equal(g.coins, goalCoins(2, true));
  assert.equal(goalXp(m, { steps: 8000 }).coins, COINS.goal);
  assert.equal(goalXp(m, {}).coins, 0);
  assert.equal(longGoalCoins(100), 50);
  const p = bookDay(NEW_PROGRESS, m, scoreDay(m, base), g.xp, g.coins).progress;
  assert.ok(coinsOf(p) >= COINS.activeDay + g.coins);
});

test('Kaufen: zu wenig Münzen, gekauft, schon besessen', () => {
  const item = SHOP_ITEMS.find(i => i.price > 0)!;
  const poor = buyItem(NEW_PROGRESS, item.id);
  assert.deepEqual(poor, { ok: false, reason: 'poor' });
  const rich: Progress = awardCoins(NEW_PROGRESS, 1000);
  const bought = buyItem(rich, item.id);
  assert.ok(bought.ok);
  if (bought.ok) {
    assert.equal(coinsOf(bought.progress), 1000 - item.price);
    assert.ok(isOwned(bought.progress, item.id));
    assert.deepEqual(buyItem(bought.progress, item.id), { ok: false, reason: 'owned' });
  }
  assert.deepEqual(buyItem(rich, 999), { ok: false, reason: 'unknown' });
});

test('Auren und Szenen: kaufen, besitzen, richtige Art', () => {
  const rich = awardCoins(NEW_PROGRESS, 1000);
  for (const id of ['aura-ice', 'scene-night']) {
    assert.ok(!isOwned(rich, id));
    const b = buyItem(rich, id);
    assert.ok(b.ok);
    if (b.ok) assert.ok(isOwned(b.progress, id));
  }
  assert.equal(itemsOf('aura').length, 5);
  assert.equal(itemsOf('scene').length, 5);
  assert.ok(itemsOf('aura').every(i => /^#[0-9a-f]{6}$/i.test(i.color ?? '')));
  assert.equal(new Set(SHOP_ITEMS.map(i => i.id)).size, SHOP_ITEMS.length); // keine doppelten IDs
});

test('Kostenlose Outfits und Körpertypen sind immer verfügbar; Gekauftes geht beim Verbuchen nicht verloren', () => {
  assert.ok(isOwned(NEW_PROGRESS, 5));
  assert.ok(isOwned(NEW_PROGRESS, 3));
  assert.ok(!isOwned(NEW_PROGRESS, 6));
  const b = buyItem(awardCoins(NEW_PROGRESS, 500), 6);
  assert.ok(b.ok);
  if (b.ok) {
    const after = bookDay(b.progress, day('2026-11-03'), scoreDay(day('2026-11-03'), base)).progress;
    assert.ok(isOwned(after, 6));
    assert.ok(coinsOf(after) > coinsOf(b.progress));
  }
});
