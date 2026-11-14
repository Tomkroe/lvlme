/**
 * Karte „Kalorienhaushalt“ im Profil. Zuständig: app-ui.
 * Reine Information: kein XP, keine Belohnung, keine rote Anzeige fürs Überschreiten. Alles bleibt lokal auf dem Gerät.
 */
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useApp } from '../state/AppState.tsx';
import { AGE_LIMITS, BASE_ACTIVITY, CALORIE_NOTICE, CUSTOM_LIMITS, GOAL_LABEL, LOSE_FACTOR, GAIN_FACTOR, MIN_LOSE_AGE, MIN_LOSE_BMI, SEX_LABEL } from '../game/calories.ts';
import type { BodyStats } from '../game/body.ts';
import type { CalorieGoal, Sex } from '../types.ts';
import { Button, P, Section } from './components.tsx';
import { Slider } from './Slider.tsx';
import { confirm, notify } from './confirm.ts';
import { C, F } from './theme.ts';

const GOALS: CalorieGoal[] = ['lose', 'maintain', 'gain'];
const SEXES: Sex[] = ['female', 'male', 'unspecified'];
const kcal = (n: number) => `${Math.round(n).toLocaleString('de-DE')} kcal`;

/** Der Hinweistext, gut sichtbar */
export function CalorieNotice() {
  return (
    <View style={st.notice} accessibilityRole="alert">
      <Text style={st.noticeHead}>Wichtiger Hinweis</Text>
      <Text style={st.noticeText}>{CALORIE_NOTICE}</Text>
    </View>
  );
}

export function CalorieCard({ draftStats }: { draftStats: BodyStats }) {
  const app = useApp();
  const s = app.calorieSettings;
  const t = app.calorie;
  const [custom, setCustom] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [age, setAge] = useState(s.age);
  useEffect(() => setAge(s.age), [s.age]);

  // Hinweis einmal beim ersten Öffnen
  useEffect(() => {
    if (!app.ready || s.noticeSeen) return;
    notify('Wichtiger Hinweis zum Kalorienbedarf', CALORIE_NOTICE);
    app.setCalorieSettings({ noticeSeen: true });
  }, [app.ready, s.noticeSeen]); // eslint-disable-line react-hooks/exhaustive-deps

  const fromHealth = async () => {
    setBusy(true);
    try {
      const r = await app.importBodyFromHealth();
      if (r === 'none') notify('Apple Health', 'In Apple Health habe ich kein Gewicht, keine Größe und keinen Körperfettanteil gefunden. Trag die Werte hier von Hand ein.');
    } finally { setBusy(false); }
  };

  const resetCustom = async () => {
    if (!(await confirm('Auf Empfehlung zurücksetzen?', 'Dein eigener Wert wird entfernt, es gilt wieder die berechnete Empfehlung.', 'Zurücksetzen', false))) return;
    setCustom(null);
    await app.setCalorieSettings({ custom: undefined });
  };

  const shown = custom ?? t?.custom ?? t?.recommended ?? 2000;
  const belowBmr = t != null && shown < t.bmr;
  const activeToday = app.todayMetrics ? Math.round(app.todayMetrics.activeEnergyKcal) : null;

  return (
    <Section title="Kalorienhaushalt">
      <P>Eine grobe Schätzung, wie viel du am Tag brauchst. Nur zur Information: Sie ändert weder Energie noch XP oder Stimmung deines Avatars.</P>

      {!t && (
        <>
          <P style={{ color: C.ink }}>Speichere zuerst deine Körperwerte (Größe, Gewicht), dann berechne ich die Empfehlung.</P>
          <Button title="Körperwerte speichern" onPress={() => app.setBodyStats(draftStats)} />
        </>
      )}
      {Platform.OS === 'ios' && <Button title="Aus Apple Health übernehmen" kind="ghost" busy={busy} onPress={fromHealth} accessibilityHint="Liest Gewicht, Größe und Körperfett aus Apple Health. Die Werte bleiben auf deinem iPhone." />}

      <Slider label="Alter" unit="Jahre" value={age} min={AGE_LIMITS.min} max={AGE_LIMITS.max} onChange={setAge} onDone={v => app.setCalorieSettings({ age: v })} />
      {!s.ageSet && <Button title={`Alter ${age} übernehmen`} kind="ghost" onPress={() => app.setCalorieSettings({ age })} accessibilityHint="Ohne gesetztes Alter gibt es keine Empfehlung zum Abnehmen" />}
      <Text style={st.label}>Geschlecht (nur für die Formel)</Text>
      <View style={st.chips}>
        {SEXES.map(x => (
          <Pressable key={x} onPress={() => app.setCalorieSettings({ sex: x })} accessibilityRole="button" accessibilityState={{ selected: s.sex === x }}
            style={[st.chip, s.sex === x && st.chipOn]}><Text style={[st.chipText, s.sex === x && { color: C.ink }]}>{SEX_LABEL[x]}</Text></Pressable>
        ))}
      </View>
      <View style={st.switchRow}>
        <Text style={[st.label, { flex: 1 }]}>Körperfettanteil in der Rechnung nutzen</Text>
        <Switch value={s.useBodyFat} onValueChange={v => app.setCalorieSettings({ useBodyFat: v })} trackColor={{ true: C.ki, false: C.line }} ios_backgroundColor={C.line}
          accessibilityLabel="Körperfettanteil in der Kalorienrechnung nutzen" />
      </View>

      <Text style={st.label}>Ziel</Text>
      <View style={st.chips}>
        {GOALS.map(g => (
          <Pressable key={g} onPress={() => app.setCalorieSettings({ goal: g })} accessibilityRole="button" accessibilityState={{ selected: s.goal === g }}
            style={[st.chip, s.goal === g && st.chipOn]}><Text style={[st.chipText, s.goal === g && { color: C.ink }]}>{GOAL_LABEL[g]}</Text></Pressable>
        ))}
      </View>
      {t?.limitedBy && (
        <P style={{ fontSize: 12 }}>
          {t.limitedBy === 'noage' ? 'Stell zuerst dein Alter ein: ohne Altersangabe gibt LvlMe keine Empfehlung zum Abnehmen, es gilt „Halten“.' : t.limitedBy === 'age' ? `Unter ${MIN_LOSE_AGE} Jahren gibt LvlMe keine Empfehlung zum Abnehmen, es gilt „Halten“.` : `Bei einem BMI unter ${MIN_LOSE_BMI.toString().replace('.', ',')} gibt LvlMe keine Empfehlung zum Abnehmen, es gilt „Halten“.`}
        </P>
      )}

      {t && (
        <>
          <View style={st.big} accessible accessibilityLabel={`Empfehlung ${t.recommended} Kilokalorien pro Tag`}>
            <Text style={st.bigLabel}>EMPFEHLUNG PRO TAG</Text>
            <Text style={[st.bigVal, F.num]}>{kcal(t.recommended)}</Text>
            <Text style={st.bigSub}>Grundumsatz {kcal(t.bmr)} · Gesamtbedarf {kcal(t.tdee)}</Text>
          </View>

          <Slider label="Eigener Wert" unit="kcal" value={shown} min={CUSTOM_LIMITS.min} max={CUSTOM_LIMITS.max} step={10}
            format={v => Math.round(v).toLocaleString('de-DE')}
            onChange={v => setCustom(v)} onDone={v => { setCustom(null); app.setCalorieSettings({ custom: v }); }} />
          <Button title="Auf Empfehlung zurücksetzen" kind="ghost" disabled={t.custom == null && custom == null} onPress={resetCustom} />
          {t.custom != null && <P style={{ fontSize: 12 }}>Dein eigener Wert gilt, bis du zurücksetzt. Ändert sich dein Gewicht, passt sich nur die Empfehlung an.</P>}
          {belowBmr && (
            <View style={st.warn} accessibilityRole="alert">
              <Text style={st.warnHead}>Achtung: unter deinem Grundumsatz</Text>
              <Text style={st.warnText}>Dein Wert liegt unter {kcal(t.bmr)}, dem Grundumsatz. Dauerhaft so wenig zu essen kann deiner Gesundheit schaden. Sprich bitte mit einer Ärztin, einem Arzt oder einer Ernährungsfachkraft, bevor du so planst.</Text>
            </View>
          )}

          <View style={st.rowBetween}>
            <Text style={st.label}>Aktive Kalorien heute</Text>
            <Text style={[st.val, F.num]}>{activeToday == null ? '–' : kcal(activeToday)}</Text>
          </View>
          <P style={{ fontSize: 12 }}>
            So kommt die Zahl zustande: Grundumsatz ({t.method === 'katch' ? 'Katch-McArdle, mit deinem Körperfettanteil' : 'Mifflin-St Jeor aus Größe, Gewicht, Alter und Geschlecht'}) × {BASE_ACTIVITY.toString().replace('.', ',')} für den Alltag
            {app.activeKcalAvg != null ? ` + deine aktiven Kalorien (Ø ${kcal(app.activeKcalAvg)} der letzten Tage)` : ' (noch keine aktiven Kalorien gemessen)'} = Gesamtbedarf.
            {t.goalApplied === 'lose' ? ` Abnehmen: ${Math.round((1 - LOSE_FACTOR) * 100)} % weniger, nie unter dem Grundumsatz.` : t.goalApplied === 'gain' ? ` Aufbauen: ${(Math.round((GAIN_FACTOR - 1) * 1000) / 10).toString().replace('.', ',')} % mehr.` : ' Halten: der Gesamtbedarf.'}
          </P>
        </>
      )}

      <CalorieNotice />
      <P style={{ fontSize: 12 }}>Alter, Geschlecht, Körperwerte und dein eigener Wert bleiben auf diesem Gerät. Es gibt dafür keine XP und keine Belohnung, weder für ein Defizit noch fürs Treffen der Zahl.</P>
    </Section>
  );
}

const st = StyleSheet.create({
  label: { color: C.ink, fontSize: 14 },
  val: { color: C.ink, fontSize: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card2 },
  chipOn: { borderColor: C.ki, backgroundColor: 'rgba(255,138,31,0.12)' },
  chipText: { color: C.mute, fontWeight: '700', fontSize: 13 },
  big: { alignItems: 'center', gap: 2, paddingVertical: 12, borderRadius: 16, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line },
  bigLabel: { color: C.mute, fontSize: 10.5, letterSpacing: 1.6, fontWeight: '700' },
  bigVal: { color: C.ink, fontSize: 32 },
  bigSub: { color: C.mute, fontSize: 12 },
  warn: { borderWidth: 2, borderColor: C.warn, borderRadius: 14, padding: 12, gap: 4, backgroundColor: 'rgba(255,204,61,0.10)' },
  warnHead: { color: C.warn, fontWeight: '900', fontSize: 14 },
  warnText: { color: C.ink, fontSize: 13, lineHeight: 19 },
  notice: { borderWidth: 1.5, borderColor: C.sky, borderRadius: 14, padding: 12, gap: 4, backgroundColor: 'rgba(63,208,255,0.08)' },
  noticeHead: { color: C.sky, fontWeight: '900', fontSize: 13, letterSpacing: 0.6 },
  noticeText: { color: C.ink, fontSize: 13, lineHeight: 19 },
});
