/** Widgets der Startseite: kleine Glas-Kacheln rund um den Avatar. Zuständig: app-ui. Zeigen nur eigene Werte, nie in der teilbaren Karte. */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { AppState } from '../state/AppState.tsx';
import { STAGES, xpNeeded } from '../game/rules.ts';
import { goalStatus } from '../game/goals.ts';
import { longGoalFrac } from '../game/longgoals.ts';
import { WIDGET_IDS, WIDGET_LABEL, SLOTS, type SlotId, type WidgetId } from '../game/widgets.ts';
import { Bar } from './components.tsx';
import { C, F, energyColor } from './theme.ts';

export interface WidgetView { label: string; value: string; sub?: string; frac?: number; color?: string; onPress?: () => void }

const n0 = (v: number) => Math.round(v).toLocaleString('de-DE');

export function widgetView(id: WidgetId, app: AppState): WidgetView {
  const t = app.today;
  const m = app.todayMetrics;
  switch (id) {
    case 'energy': return { label: 'ENERGIE', value: t ? `${t.energy}%` : '–', sub: 'Tagesform', frac: t ? t.energy / 100 : 0, color: t ? energyColor(t.energy) : C.mute };
    case 'strain': return { label: 'BELASTUNG', value: t ? t.strain.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–', sub: 'von 21', frac: t ? t.strain / 21 : 0, color: C.sky };
    case 'sleep': return { label: 'SCHLAF', value: t ? `${t.sleep}%` : '–', sub: 'letzte Nacht', frac: t ? t.sleep / 100 : 0, color: C.violet };
    case 'xp': return { label: `LEVEL ${app.progress.level}`, value: `${n0(app.progress.xp)}`, sub: `von ${n0(xpNeeded(app.progress.level))} XP`, frac: app.progress.xp / xpNeeded(app.progress.level), color: C.ki };
    case 'steps': {
      const goal = app.goals.steps;
      return { label: 'SCHRITTE', value: n0(app.stepsToday), sub: goal ? `Ziel ${n0(goal)}` : 'heute', frac: goal ? Math.min(1, app.stepsToday / goal) : undefined, color: C.good };
    }
    case 'workout': {
      const goal = app.goals.workout;
      const min = m?.workoutMinutes ?? 0;
      return { label: 'TRAINING', value: `${n0(min)} min`, sub: goal ? `Ziel ${n0(goal)} min` : 'heute', frac: goal ? Math.min(1, min / goal) : undefined, color: C.ki };
    }
    case 'goals': {
      const rows = m ? goalStatus(m, app.goals) : [];
      const hit = rows.filter(r => r.hit).length;
      return rows.length
        ? { label: 'TAGESZIELE', value: `${hit}/${rows.length}`, sub: 'erreicht', frac: hit / rows.length, color: C.good, onPress: () => router.push('/profile') }
        : { label: 'TAGESZIELE', value: '–', sub: 'im Profil setzen', onPress: () => router.push('/profile') };
    }
    case 'longgoal': {
      const g = app.longGoals.find(x => !x.doneAt);
      if (!g) return { label: 'LANGZEIT', value: '–', sub: 'im Profil setzen', onPress: () => router.push('/profile') };
      const f = longGoalFrac(g, app.progress, { weightKg: app.bodyStats?.weightKg });
      return { label: 'LANGZEIT', value: `${Math.round(f * 100)}%`, sub: g.title, frac: f, color: C.violet, onPress: () => router.push('/profile') };
    }
    case 'streak': return { label: 'SERIE', value: String(app.progress.streak), sub: app.progress.streak === 1 ? 'Tag' : 'Tage', color: C.ki };
    case 'calories': {
      const c = app.calorie;
      if (!c) return { label: 'KALORIEN', value: '–', sub: 'Körperwerte eintragen', onPress: () => router.push('/profile') };
      const active = m ? Math.round(m.activeEnergyKcal) : null;
      return { label: 'KALORIEN', value: n0(c.custom ?? c.recommended), sub: c.belowBmr ? 'Schätzung · unter Grundumsatz' : `${c.custom != null ? 'dein Wert' : 'Schätzung'}${active != null ? ` · aktiv ${n0(active)}` : ''}`, color: c.belowBmr ? C.warn : C.sky, onPress: () => router.push('/profile') };
    }
    case 'coins': return { label: 'MÜNZEN', value: n0(app.coins), sub: 'zum Shop', color: C.warn, onPress: () => router.push('/shop') };
    case 'stage': {
      const next = STAGES[app.stage + 1];
      return next ? { label: 'NÄCHSTE FORM', value: `Lv ${next.level}`, sub: next.name } : { label: 'VERWANDLUNG', value: 'Max', sub: STAGES[app.stage].name };
    }
  }
}

export const TILE_H = 70;

/** Eine Kachel; leerer Platz erscheint nur im Anpassen-Modus als „+“ */
export function Tile({ view, width, editing, onEdit }: { view: WidgetView | null; width: number; editing: boolean; onEdit: () => void }) {
  if (!view) {
    if (!editing) return null;
    return (
      <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel="Widget hinzufügen" style={[st.tile, st.empty, { width }]}>
        <Text style={st.plus}>+</Text>
      </Pressable>
    );
  }
  const body = (
    <>
      <Text style={st.label} numberOfLines={1}>{view.label}</Text>
      <Text style={[st.value, F.num]} numberOfLines={1} adjustsFontSizeToFit>{view.value}</Text>
      {view.sub != null && <Text style={st.sub} numberOfLines={1}>{view.sub}</Text>}
      {view.frac != null && <View style={{ marginTop: 3 }}><Bar frac={view.frac} color={view.color ?? C.ki} height={4} /></View>}
    </>
  );
  const press = editing ? onEdit : view.onPress;
  return (
    <Pressable disabled={!press} onPress={press} accessibilityRole={press ? 'button' : 'text'} accessibilityLabel={`${view.label}: ${view.value} ${view.sub ?? ''}`}
      style={[st.tile, { width }, editing && st.editing]}>
      {body}
      {editing && <Text style={st.pen}>✎</Text>}
    </Pressable>
  );
}

/** Auswahl, was auf einem Platz stehen soll */
export function WidgetPicker({ slot, layout, onPick, onClose }: { slot: SlotId | null; layout: Record<SlotId, WidgetId | null>; onPick: (id: WidgetId | null) => void; onClose: () => void }) {
  const current = slot ? layout[slot] : null;
  const where = (id: WidgetId) => SLOTS.some(s => layout[s] === id && s !== slot);
  return (
    <Modal visible={slot !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Schließen">
        <Pressable style={st.sheet} onPress={() => {}}>
          <Text style={st.sheetTitle}>Widget wählen</Text>
          <ScrollView style={{ maxHeight: 380 }} contentContainerStyle={{ gap: 6 }}>
            {WIDGET_IDS.map(id => (
              <Pressable key={id} onPress={() => onPick(id)} accessibilityRole="button" accessibilityState={{ selected: current === id }}
                style={[st.opt, current === id && st.optOn]}>
                <Text style={st.optText}>{WIDGET_LABEL[id]}</Text>
                {where(id) && <Text style={st.optHint}>zieht hierher um</Text>}
                {current === id && <Text style={st.optHint}>hier</Text>}
              </Pressable>
            ))}
          </ScrollView>
          {current && <Pressable onPress={() => onPick(null)} accessibilityRole="button" style={[st.opt, { justifyContent: 'center' }]}><Text style={[st.optText, { color: C.mute }]}>Platz leeren</Text></Pressable>}
          <Pressable onPress={onClose} accessibilityRole="button" style={[st.opt, { justifyContent: 'center' }]}><Text style={st.optText}>Abbrechen</Text></Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  tile: { height: TILE_H, borderRadius: 16, paddingHorizontal: 9, paddingVertical: 7, backgroundColor: 'rgba(9,13,30,0.58)', borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1, justifyContent: 'center', gap: 1 },
  empty: { alignItems: 'center', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.4)', backgroundColor: 'rgba(9,13,30,0.3)' },
  editing: { borderColor: C.ki },
  plus: { color: '#fff', fontSize: 28, fontWeight: '300' },
  pen: { position: 'absolute', top: 3, right: 7, color: C.ki, fontSize: 11 },
  label: { color: 'rgba(255,255,255,0.72)', fontSize: 8.5, letterSpacing: 1.1, fontWeight: '700' },
  value: { color: '#fff', fontSize: 19 },
  sub: { color: 'rgba(255,255,255,0.7)', fontSize: 9.5, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  sheet: { alignSelf: 'center', width: '100%', maxWidth: 420, backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 },
  sheetTitle: { color: C.ink, fontSize: 17, fontWeight: '800' },
  opt: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card2 },
  optOn: { borderColor: C.ki },
  optText: { color: C.ink, fontWeight: '700', fontSize: 15 },
  optHint: { color: C.mute, fontSize: 12 },
});
