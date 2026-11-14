import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_LAYOUT, SLOTS, WIDGET_IDS, WIDGET_LABEL, placeWidget, resolveLayout, unplaced } from './widgets.ts';

test('Ohne gespeichertes Layout gilt die Standardbelegung', () => {
  assert.deepEqual(resolveLayout(undefined), DEFAULT_LAYOUT);
  assert.deepEqual(resolveLayout('x'), DEFAULT_LAYOUT);
});

test('Bereinigen: unbekannte Plätze/Widgets raus, Doppelte nur einmal, null bleibt leer', () => {
  const l = resolveLayout({ l1: 'energy', l2: 'energy', l3: 'quatsch', r1: null, zz: 'xp' });
  assert.equal(l.l1, 'energy'); assert.equal(l.l2, null); assert.equal(l.l3, null); assert.equal(l.r1, null);
  assert.equal(Object.keys(l).length, SLOTS.length);
});

test('Platzieren verschiebt ein Widget und lässt es nie doppelt stehen', () => {
  const a = placeWidget(DEFAULT_LAYOUT, 'r3', 'energy');
  assert.equal(a.r3, 'energy'); assert.equal(a.l1, null);
  assert.equal(SLOTS.filter(s => a[s] === 'energy').length, 1);
  const b = placeWidget(a, 'r3', null);
  assert.equal(b.r3, null);
});

test('Nicht platzierte Widgets sind auswählbar; jedes hat eine Beschriftung', () => {
  const u = unplaced(DEFAULT_LAYOUT);
  assert.ok(u.includes('calories') && !u.includes('energy'));
  assert.equal(u.length + SLOTS.filter(s => DEFAULT_LAYOUT[s]).length, WIDGET_IDS.length);
  assert.ok(WIDGET_IDS.every(w => WIDGET_LABEL[w]));
});
