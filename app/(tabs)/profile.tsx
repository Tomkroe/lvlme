/** Profil: Stats, Serie, Verwandlungen, Datenquelle, Konto, Datenschutz. Zuständig: app-ui. */
import React, { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApp } from '../../src/state/AppState.tsx';
import type { BodyId } from '../../src/types.ts';
import { MOOD_TEXT, STAGES } from '../../src/game/rules.ts';
import { STAGE_COLORS } from '../../src/avatar/palette.ts';
import { Avatar } from '../../src/avatar/Avatar.tsx';
import { BODIES, HAIRSTYLES, type BodyOption } from '../../src/avatar/assets.ts';
import * as social from '../../src/social/api.ts';
import { SignIn } from '../../src/ui/SignIn.tsx';
import { confirm, notify } from '../../src/ui/confirm.ts';
import { Bar, Button, Card, H, P, Section } from '../../src/ui/components.tsx';
import { Slider } from '../../src/ui/Slider.tsx';
import { CalorieCard } from '../../src/ui/CalorieCard.tsx';
import { ALL_GOALS_BONUS, GOAL_DEFS, goalDef, type GoalId } from '../../src/game/goals.ts';
import { isOwned, shopItem } from '../../src/game/shop.ts';
import { LONG_GOAL_KINDS, MAX_LONG_GOALS, kindDef, longGoalFrac, longGoalValue, rewardXp, type LongGoalKind } from '../../src/game/longgoals.ts';
import { BODY_LIMITS, DEFAULT_BODY_STATS, DEFINED_UP_TO_BODY_FAT, MIN_GOAL_BMI, STOCKY_FROM_BODY_FAT, bmi, clampStats, ffmi, maxWeightLossKg, suggestBody, type BodyStats } from '../../src/game/body.ts';
import { C, F, PRIVACY_URL } from '../../src/ui/theme.ts';

const SOURCE: Record<string, string> = { healthkit: 'Apple Health', whoop: 'WHOOP', cloud: 'Dein Konto (vom iPhone)', demo: 'Beispieldaten' };
const isIos = Platform.OS === 'ios';

export default function Profile() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(app.name);
  useEffect(() => setName(app.name), [app.name]);

  const [stats, setStats] = useState<BodyStats>(app.bodyStats ?? DEFAULT_BODY_STATS);
  useEffect(() => { if (app.bodyStats) setStats(app.bodyStats); }, [app.bodyStats]);
  // Live-Vorschau oberkörperfrei, solange ein Körperwert verschoben wird (und kurz danach)
  const [preview, setPreview] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current); }, []);
  const upd = (k: keyof BodyStats) => (v: number) => {
    if (hideTimer.current) { clearTimeout(hideTimer.current); hideTimer.current = null; }
    setPreview(true);
    setStats(o => ({ ...o, [k]: v }));
  };
  const save = (k: keyof BodyStats) => (v: number) => {
    app.setBodyStats(clampStats({ ...stats, [k]: v }));
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setPreview(false), 1200);
  };
  const sugg = suggestBody(stats);
  const suggName = BODIES.find(b => b.id === sugg.id)?.name ?? '';
  const toggleAuto = async (on: boolean) => {
    if (on) {
      const ok = await confirm('Körpertyp automatisch?',
        'Dein Avatar-Körper richtet sich dann nach Größe, Gewicht und Körperfettanteil. Freunde sehen die Figur, nie die Zahlen. Wer deinen Körpertyp kennt, kann aber grob auf deinen Körperfettanteil schließen. Du kannst das jederzeit ausschalten.',
        'Einverstanden', false);
      if (!ok) return;
      await app.setBodyStats(stats);
    }
    await app.setAutoBody(on);
  };
  const goalCtx = { weightKg: app.bodyStats?.weightKg };
  const maxLoss = maxWeightLossKg(stats);

  const toggleGoal = (id: GoalId, on: boolean) => {
    const g = { ...app.goals };
    if (on) g[id] = goalDef(id).def; else delete g[id];
    app.setGoals(g);
  };
  const [goalDraft, setGoalDraft] = useState<Record<string, number>>({});

  const [lgKind, setLgKind] = useState<LongGoalKind>('steps_total');
  const [lgTarget, setLgTarget] = useState<number>(kindDef('steps_total').def);
  const [lgTitle, setLgTitle] = useState('');
  const [lgUnit, setLgUnit] = useState('');
  const [lgCurrent, setLgCurrent] = useState('');
  const [lgTargetText, setLgTargetText] = useState('');
  const [lgEdit, setLgEdit] = useState<Record<string, string>>({});
  const num = (s: string) => { const n = Number(s.replace(',', '.')); return Number.isFinite(n) && n >= 0 ? n : 0; };
  const pickKind = (k: LongGoalKind) => { setLgKind(k); setLgTarget(kindDef(k).def); };
  const addLong = async () => {
    const target = lgKind === 'custom' ? num(lgTargetText) : lgTarget;
    if (lgKind === 'custom' && (!lgTitle.trim() || target <= 0)) { notify('Eigenes Ziel', 'Gib dem Ziel einen Namen und eine Zielmarke größer als 0.'); return; }
    // Gewichtsverlust startet beim aktuell eingestellten Gewicht: Körperwerte vorher speichern
    if (lgKind === 'weight_loss') await app.setBodyStats(stats);
    const res = await app.addLongGoal(lgKind, target, lgTitle, lgUnit, num(lgCurrent));
    if (res === 'limit') { notify('Zu viele Ziele', `Du kannst höchstens ${MAX_LONG_GOALS} offene Langzeitziele haben. Schließe eins ab oder entferne es.`); return; }
    if (res === 'weight') { notify('Gewichtsverlust', 'Ein Gewichtsverlust-Ziel geht nur einmal gleichzeitig und höchstens bis BMI ' + MIN_GOAL_BMI + '. Mit deinen Körperwerten ist gerade kein Ziel möglich oder das Ziel ist zu hoch.'); return; }
    setLgTitle(''); setLgUnit(''); setLgCurrent(''); setLgTargetText('');
  };
  const removeLong = async (id: string, title: string) => {
    if (await confirm('Ziel entfernen?', `„${title}“ wird gelöscht. Bereits erhaltene XP bleiben.`, 'Entfernen')) app.removeLongGoal(id);
  };

  const s = app.progress.stats;
  const max = Math.max(100, s.str, s.end, s.rec, s.dis);
  const bars: [string, number, string][] = [['Stärke', s.str, C.ki], ['Ausdauer', s.end, C.sky], ['Erholung', s.rec, C.good], ['Disziplin', s.dis, C.violet]];
  const mood = app.today?.mood ?? 'awake';

  const reset = async () => {
    const ok = await confirm('Fortschritt zurücksetzen?', 'Level, Stats und Serie auf diesem Gerät werden gelöscht. Deine Daten in Apple Health bleiben unberührt.', 'Zurücksetzen');
    if (!ok) return;
    await app.resetLocal();
    router.replace('/onboarding');
  };

  const [syncBusy, setSyncBusy] = useState(false);
  const toggleSync = async (on: boolean) => {
    if (on) {
      const ok = await confirm(
        'Mit dem PC synchronisieren?',
        'LvlMe speichert dann in deinem Konto: Schritte, aktive Kalorien, Trainingsminuten, Schlafdauer, HRV und Ruhepuls der letzten Tage sowie Level, XP, Stats und Serie. '
        + 'Zweck: dieselbe Anzeige in der PC-Version. Gespeichert wird bei unserem Dienstleister Supabase in Frankfurt (EU). Nur du kannst die Daten sehen, Freunde nie. '
        + 'Du kannst das jederzeit ausschalten; dann werden die Daten aus deinem Konto gelöscht. Details in der Datenschutzerklärung (Profil › Daten).',
        'Einverstanden', false);
      if (!ok) return;
    } else {
      const ok = await confirm('Sync ausschalten?', 'Deine Tageswerte und dein Fortschritt werden aus deinem Konto gelöscht. Auf diesem iPhone bleibt alles.', 'Ausschalten und löschen');
      if (!ok) return;
    }
    setSyncBusy(true);
    try { await app.setCloudSync(on); }
    catch (e) { notify('Das hat nicht geklappt', (e as Error).message); }
    finally { setSyncBusy(false); }
  };

  const [deleting, setDeleting] = useState(false);
  const deleteAccount = async () => {
    const ok = await confirm('Konto löschen?', 'Dein Konto, dein Profil, deine Einladungen, alle Freundschaften sowie die im Konto gespeicherten Tageswerte und dein Fortschritt werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.', 'Konto löschen');
    if (!ok) return;
    setDeleting(true);
    try {
      await social.deleteAccount();
      await app.signOut();
    } catch (e) {
      setDeleting(false);
      notify('Konto nicht gelöscht', (e as Error).message);
      return;
    }
    setDeleting(false);
    if (await confirm('Konto gelöscht', 'Auch den Fortschritt auf diesem Gerät löschen?', 'Löschen')) {
      await app.resetLocal();
      router.replace('/onboarding');
    }
  };

  // Typ 0 („Athletisch“) trägt ein Top; oberkörperfrei zeigt dafür Outfit 9
  const previewBody = (sugg.id === 0 ? 9 : sugg.id) as BodyId;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 32, gap: 14 }}>
      <Text style={[st.title, F.display]}>Profil</Text>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar stage={app.stage} mood={mood} hair={app.hair} body={app.body} size={72} still id="prof" />
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput value={name} onChangeText={setName} onEndEditing={() => app.setName(name)} placeholder="Dein Name"
            placeholderTextColor={C.mute} maxLength={24} style={st.name} accessibilityLabel="Name ändern" />
          <Text style={st.meta}>Level {app.progress.level} · {STAGES[app.stage].name}</Text>
          <Text style={st.meta}>Heute: {MOOD_TEXT[mood].label}</Text>
        </View>
      </Card>

      <Section title="Frisur">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
          {HAIRSTYLES.map(h => {
            const on = h.id === app.hair;
            return (
              <Pressable key={h.id} onPress={() => { app.setHair(h.id); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
                accessibilityLabel={`Frisur ${h.name}`} style={[st.hairOpt, on && st.hairOn]}>
                <Avatar stage={app.stage} mood="awake" hair={h.id} body={app.body} size={52} still id={`hair${h.id}`} />
                <Text style={[st.hairName, on && { color: C.ki }]} numberOfLines={1}>{h.name}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </Section>

      <Section title="Körper & Outfit">
        {([['type', 'Körpertyp'], ['outfit', 'Outfit']] as [BodyOption['kind'], string][]).map(([kind, label]) => (
          <View key={kind} style={{ gap: 6 }}>
            <Text style={st.meta}>{label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
              {BODIES.filter(b => b.kind === kind).map(b => {
                const on = b.id === app.body;
                return (
                  <Pressable key={b.id} onPress={() => { if (!isOwned(app.progress, b.id)) { router.push('/shop'); return; } if (app.autoBody && b.kind === 'type') app.setAutoBody(false); app.setBody(b.id); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    accessibilityLabel={`${label} ${b.name}`} style={[st.hairOpt, on && st.hairOn]}>
                    <Avatar stage={app.stage} mood="awake" hair={app.hair} body={b.id} size={52} still id={`body${b.id}`} />
                    <Text style={[st.hairName, on && { color: C.ki }]} numberOfLines={1}>{isOwned(app.progress, b.id) ? b.name : `${shopItem(b.id)?.price} Münzen`}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ))}
        <P style={{ fontSize: 12 }}>Körpertyp und Outfit schließen sich vorerst aus: Outfits gibt es nur mit athletischem Körper. Freunde sehen deine Frisur und deinen Körper, sobald du angemeldet bist.</P>
      </Section>

      <Section title="Körperwerte">
        <Slider label="Größe" unit="cm" value={stats.heightCm} min={BODY_LIMITS.heightCm.min} max={BODY_LIMITS.heightCm.max} onChange={upd('heightCm')} onDone={save('heightCm')} />
        <Slider label="Gewicht" unit="kg" value={stats.weightKg} min={BODY_LIMITS.weightKg.min} max={BODY_LIMITS.weightKg.max} onChange={upd('weightKg')} onDone={save('weightKg')} />
        <Slider label="Körperfettanteil (KFA)" unit="%" value={stats.bodyFatPct} min={BODY_LIMITS.bodyFatPct.min} max={BODY_LIMITS.bodyFatPct.max} onChange={upd('bodyFatPct')} onDone={save('bodyFatPct')} />
        <View style={st.row}>
          <Text style={st.meta}>BMI <Text style={[{ color: C.ink }, F.num]}>{bmi(stats).toFixed(1)}</Text></Text>
          <Text style={st.meta}>FFMI <Text style={[{ color: C.ink }, F.num]}>{ffmi(stats).toFixed(1)}</Text></Text>
        </View>
        <View style={st.switchRow}>
          <Text style={[st.label, { flex: 1 }]}>Körpertyp automatisch{app.autoBody ? ` (${suggName})` : ''}</Text>
          <Switch value={app.autoBody} onValueChange={toggleAuto} trackColor={{ true: C.ki, false: C.line }} ios_backgroundColor={C.line}
            accessibilityLabel="Körpertyp automatisch aus den Körperwerten"
            accessibilityHint="Der Körper deines Avatars richtet sich nach Größe, Gewicht und Körperfettanteil" />
        </View>
        <P style={{ fontSize: 12 }}>Automatisch: Ab {STOCKY_FROM_BODY_FAT} % Körperfett wird der Körper stämmiger, bis {DEFINED_UP_TO_BODY_FAT} % definierter; dazwischen entscheidet die Muskelmasse (Athletisch, Kraftsport, Schlank). Ohne „automatisch“ wählst du den Körpertyp selbst. Outfits haben Vorrang.</P>
        <P style={{ fontSize: 12 }}>Größe, Gewicht und KFA bleiben auf diesem Gerät, werden nicht synchronisiert und ändern weder XP noch Level. Freunde sehen nur den Körpertyp – den du wählst oder, wenn „automatisch“ an ist, den abgeleiteten.</P>
      </Section>

      <CalorieCard draftStats={stats} />

      <Section title="Tagesziele">
        <P>Wähle, was du jeden Tag schaffen willst. Wer ein Ziel erreicht, bekommt Bonus-XP, wenn der Tag verbucht wird. Verfehlte Ziele kosten nichts. Alle gesetzten Ziele an einem Tag: +{ALL_GOALS_BONUS} XP extra.</P>
        {GOAL_DEFS.map(d => {
          const on = app.goals[d.id] !== undefined;
          const val = goalDraft[d.id] ?? app.goals[d.id] ?? d.def;
          return (
            <View key={d.id} style={{ gap: 4 }}>
              <View style={st.switchRow}>
                <Text style={[st.label, { flex: 1 }]}>{d.label} <Text style={st.meta}>(+{d.xp} XP)</Text></Text>
                <Switch value={on} onValueChange={v => toggleGoal(d.id, v)} trackColor={{ true: C.ki, false: C.line }} ios_backgroundColor={C.line}
                  accessibilityLabel={`Ziel ${d.label}`} />
              </View>
              {on && (
                <Slider label="Ziel pro Tag" unit={d.unit} value={val} min={d.min} max={d.max} step={d.step}
                  format={v => v.toLocaleString('de-DE', { maximumFractionDigits: 1 })}
                  onChange={v => setGoalDraft(o => ({ ...o, [d.id]: v }))}
                  onDone={v => { app.setGoals({ ...app.goals, [d.id]: v }); setGoalDraft(o => { const n = { ...o }; delete n[d.id]; return n; }); }} />
              )}
            </View>
          );
        })}
        <P style={{ fontSize: 12 }}>Es gibt kein Tagesziel für Gewicht oder Körperfett, und das Schlafziel beginnt bei 6 Stunden: LvlMe belohnt weder Hungern noch Schlafentzug. Gewichtsverlust findest du unter Langzeitziele, ohne Frist.</P>
      </Section>

      <Section title="Langzeitziele">
        <P>Größere Ziele mit einmaliger XP-Belohnung. Schritte, Trainingstage (ab {20} Min.) und Serie zählt LvlMe ab dem Anlegen automatisch, Gewichtsverlust aus deinen Körperwerten. Eigene Ziele, zum Beispiel Bankdrücken oder ein Lauf, trägst du selbst nach. Nichts wird bestraft, wenn es länger dauert.</P>
        {app.longGoals.map(g => {
          const done = !!g.doneAt;
          const val = longGoalValue(g, app.progress, goalCtx);
          return (
            <View key={g.id} style={{ gap: 4 }}>
              <View style={st.row}>
                <Text style={{ color: done ? C.good : C.ink, fontWeight: '700', fontSize: 14, flexShrink: 1 }} numberOfLines={1}>{done ? '✓ ' : ''}{g.title}</Text>
                <Pressable onPress={() => removeLong(g.id, g.title)} accessibilityRole="button" accessibilityLabel={`Ziel ${g.title} entfernen`} hitSlop={10}><Text style={{ color: C.mute, fontSize: 16 }}>✕</Text></Pressable>
              </View>
              <Bar frac={done ? 1 : longGoalFrac(g, app.progress, goalCtx)} color={done ? C.good : C.violet} height={8} />
              <Text style={st.meta}>{Math.round(val).toLocaleString('de-DE')} / {g.target.toLocaleString('de-DE')} {g.unit} · {done ? ((g.xp ?? 0) > 0 ? `+${g.xp} XP erhalten` : 'erreicht, ohne XP (eigene Ziele: höchstens einmal pro Woche)') : `+${rewardXp(g)} XP bei Erfolg`}</Text>
              {!done && g.kind === 'custom' && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TextInput value={lgEdit[g.id] ?? String(g.current)} onChangeText={v => setLgEdit(o => ({ ...o, [g.id]: v }))} keyboardType="decimal-pad"
                    style={st.numInput} accessibilityLabel={`Aktueller Stand für ${g.title}`} placeholderTextColor={C.mute} />
                  <Button title="Stand speichern" kind="ghost" onPress={() => { app.setLongGoalValue(g.id, num(lgEdit[g.id] ?? String(g.current))); setLgEdit(o => { const n = { ...o }; delete n[g.id]; return n; }); }} />
                </View>
              )}
            </View>
          );
        })}
        <Text style={[st.label, { marginTop: 6 }]}>Neues Ziel</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {LONG_GOAL_KINDS.map(k => {
            const on = k.kind === lgKind;
            return (
              <Pressable key={k.kind} onPress={() => pickKind(k.kind)} accessibilityRole="radio" accessibilityState={{ selected: on }} style={[st.kindChip, on && st.hairOn]}>
                <Text style={[st.hairName, on && { color: C.ki }]}>{k.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {lgKind === 'custom' ? (
          <View style={{ gap: 8 }}>
            <TextInput value={lgTitle} onChangeText={setLgTitle} placeholder="Name, z. B. Bankdrücken" placeholderTextColor={C.mute} maxLength={40} style={st.textInput} accessibilityLabel="Name des Ziels" />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput value={lgTargetText} onChangeText={setLgTargetText} placeholder="Ziel, z. B. 100" placeholderTextColor={C.mute} keyboardType="decimal-pad" style={[st.textInput, { flex: 1 }]} accessibilityLabel="Zielmarke" />
              <TextInput value={lgUnit} onChangeText={setLgUnit} placeholder="Einheit, z. B. kg" placeholderTextColor={C.mute} maxLength={12} style={[st.textInput, { flex: 1 }]} accessibilityLabel="Einheit" />
            </View>
            <TextInput value={lgCurrent} onChangeText={setLgCurrent} placeholder="Aktueller Stand (optional)" placeholderTextColor={C.mute} keyboardType="decimal-pad" style={st.textInput} accessibilityLabel="Aktueller Stand" />
            <P style={{ fontSize: 12 }}>Eigene Ziele geben {100} XP, höchstens einmal pro Woche.</P>
          </View>
        ) : lgKind === 'weight_loss' ? (
          maxLoss < 1 ? (
            <P style={{ fontSize: 12 }}>Mit deinen Körperwerten ist kein Gewichtsverlust-Ziel sinnvoll: Ziele enden spätestens bei BMI {MIN_GOAL_BMI}. Stell oben Größe und Gewicht ein.</P>
          ) : (
            <View style={{ gap: 8 }}>
              <Slider label="Abnehmen um" unit="kg" value={Math.min(lgTarget, maxLoss)} min={1} max={maxLoss} step={1} onChange={setLgTarget} />
              <P style={{ fontSize: 12 }}>Startgewicht ist das Gewicht aus „Körperwerte“ ({stats.weightKg} kg). Trag dort später dein neues Gewicht ein. Keine Frist, kein Tempo-Druck: Du bekommst die XP einmal, wenn du dein Ziel erreichst. Zunahme kostet nichts. Maximal bis BMI {MIN_GOAL_BMI} ({maxLoss} kg bei deinen Werten).</P>
            </View>
          )
        ) : (
          <Slider label="Zielmarke" unit={kindDef(lgKind).unit} value={lgTarget} min={kindDef(lgKind).min} max={kindDef(lgKind).max} step={kindDef(lgKind).step}
            format={v => v.toLocaleString('de-DE')} onChange={setLgTarget} />
        )}
        <Button title="Ziel hinzufügen" onPress={addLong} />
      </Section>

      <Section title="Stats">
        {bars.map(([n, v, c]) => (
          <View key={n} style={{ gap: 4 }}>
            <View style={st.row}><Text style={st.label}>{n}</Text><Text style={[st.val, F.num]}>{v}</Text></View>
            <Bar frac={v / max} color={c} height={8} />
          </View>
        ))}
        <View style={[st.row, { marginTop: 4 }]}>
          <Text style={st.label}>Tage in Folge aktiv</Text>
          <Text style={[st.streak, F.display]}>{app.progress.streak}</Text>
        </View>
      </Section>

      <Section title="Verwandlungen">
        {STAGES.map((stg, i) => {
          const done = i < app.stage, now = i === app.stage;
          const col = STAGE_COLORS[i].aura ?? C.ki;
          return (
            <View key={stg.name} style={st.ladderRow} accessibilityLabel={`${stg.name}, ab Level ${stg.level}${now ? ', aktuelle Stufe' : done ? ', erreicht' : ', noch gesperrt'}`}>
              <View style={[st.dot, { borderColor: col, backgroundColor: done || now ? col : 'transparent' }]} />
              <Text style={[st.ladderName, { color: now ? C.ink : done ? C.mute : 'rgba(152,162,198,0.55)' }, now && { fontWeight: '900' }]}>{stg.name}</Text>
              <Text style={st.meta}>ab Lv {stg.level}</Text>
            </View>
          );
        })}
      </Section>

      <Section title="Daten">
        <P>Quelle: <Text style={{ color: C.ink, fontWeight: '700' }}>{app.source ? SOURCE[app.source] ?? app.source : 'noch keine'}</Text></P>
        {isIos ? (
          <P>LvlMe liest deine Gesundheitsdaten aus Apple Health, um deinen Avatar zu berechnen. Ohne Sync bleiben sie auf deinem iPhone. Freunde sehen Level, Stufe, das Aussehen deines Avatars und – wenn du es erlaubst – deine Tagesform. Deine Messwerte nie.</P>
        ) : (
          <P>Am PC kann LvlMe nicht auf Apple Health zugreifen. Deine Werte kommen von deinem iPhone, wenn du dort „Mit dem PC synchronisieren“ einschaltest und auf beiden Geräten mit demselben Konto angemeldet bist. Ohne Anmeldung siehst du Beispieldaten.</P>
        )}
        {isIos && social.isConfigured() && app.me && app.signInMethod === 'email' && (
          <>
            <View style={st.switchRow}>
              <Text style={[st.label, { flex: 1 }]}>Mit dem PC synchronisieren</Text>
              <Switch value={app.cloudSync} onValueChange={toggleSync} disabled={syncBusy}
                trackColor={{ true: C.ki, false: C.line }} ios_backgroundColor={C.line}
                accessibilityLabel="Mit dem PC synchronisieren"
                accessibilityHint="Speichert deine Tageswerte und deinen Fortschritt in deinem Konto, damit die PC-Version dasselbe zeigt" />
            </View>
            <P>Speichert deine Tageswerte und deinen Fortschritt in deinem Konto, damit die PC-Version dasselbe zeigt. Nur du kannst sie sehen, Freunde nie. Ausschalten löscht sie wieder aus deinem Konto.</P>
          </>
        )}
        {isIos && social.isConfigured() && app.me && app.signInMethod === 'apple' && (
          <P>PC-Sync: Am PC gibt es keine Apple-Anmeldung. Wenn du LvlMe auch am PC nutzen willst, melde dich ab und hier und am PC mit derselben E-Mail an.</P>
        )}
        {isIos && social.isConfigured() && !app.me && (
          <P>PC-Sync: Melde dich unten mit E-Mail an, wenn du LvlMe auch am PC nutzen willst.</P>
        )}
        <View style={st.switchRow}>
          <Text style={[st.label, { flex: 1 }]}>Tagesform mit Freunden teilen</Text>
          <Switch value={app.shareMood} onValueChange={v => { app.setShareMood(v); }}
            trackColor={{ true: C.ki, false: C.line }} ios_backgroundColor={C.line}
            accessibilityLabel="Tagesform mit Freunden teilen"
            accessibilityHint="Freunde sehen dann, ob du aufgeladen, müde usw. bist" />
        </View>
        <P>Freunde sehen dann, ob du aufgeladen, müde usw. bist. Daraus lassen sich Rückschlüsse auf Schlaf und Erholung ziehen. Du kannst das jederzeit wieder ausschalten.</P>
        {isIos && <P>Welche Daten LvlMe lesen darf, änderst du in der Health-App unter Profil › Apps › LvlMe.</P>}
        <Text style={st.link} accessibilityRole="link" accessibilityHint="Öffnet die Datenschutzerklärung im Browser"
          onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>Datenschutzerklärung</Text>
      </Section>

      <Section title="Konto">
        {!social.isConfigured() && <P>Konto und Freunde sind in dieser Version noch nicht eingerichtet.</P>}
        {social.isConfigured() && app.me && (
          <>
            <P>{app.signInMethod === 'apple' ? 'Angemeldet mit Apple.' : 'Angemeldet mit E-Mail.'}</P>
            <Button title="Abmelden" kind="ghost" onPress={app.signOut} />
            <Button title="Konto löschen" kind="danger" busy={deleting} disabled={deleting} onPress={deleteAccount}
              accessibilityHint="Löscht dein Konto, dein Profil und alle Freundschaften endgültig" />
          </>
        )}
        {social.isConfigured() && !app.me && <SignIn />}
        <Button title="Fortschritt zurücksetzen" kind="danger" onPress={reset} />
      </Section>
    </ScrollView>
    {preview && (
      <View pointerEvents="none" style={[st.preview, { top: insets.top + 8 }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Avatar stage={app.stage} mood="awake" hair={app.hair} body={previewBody} size={118} still id="bodyprev" />
        <Text style={st.previewText}>{suggName}</Text>
        <Text style={st.previewSub}>{stats.heightCm} cm · {stats.weightKg} kg · {stats.bodyFatPct} %</Text>
      </View>
    )}
    </View>
  );
}

const st = StyleSheet.create({
  title: { color: C.ink, fontSize: 32 },
  name: { color: C.ink, fontWeight: '800', fontSize: 20, paddingVertical: 2 },
  meta: { color: C.mute, fontSize: 13 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.ink, fontSize: 14 },
  val: { color: C.ink, fontSize: 14 },
  streak: { color: C.ki, fontSize: 28 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  link: { color: C.sky, fontWeight: '700', fontSize: 15, textDecorationLine: 'underline', paddingVertical: 6 },
  ladderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  ladderName: { flex: 1, fontSize: 15 },
  hairOpt: { alignItems: 'center', gap: 4, padding: 6, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card2, width: 78 },
  preview: { position: 'absolute', right: 10, alignItems: 'center', paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8, borderRadius: 18, backgroundColor: 'rgba(9,13,30,0.88)', borderColor: C.line, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  previewText: { color: C.ink, fontWeight: '800', fontSize: 13 },
  previewSub: { color: C.mute, fontSize: 10.5, fontWeight: '700' },
  numInput: { flex: 1, color: C.ink, backgroundColor: C.card2, borderColor: C.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, fontSize: 15 },
  textInput: { color: C.ink, backgroundColor: C.card2, borderColor: C.line, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 15 },
  kindChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card2 },
  hairOn: { borderColor: C.ki, backgroundColor: 'rgba(255,138,31,0.12)' },
  hairName: { color: C.mute, fontSize: 11, fontWeight: '700' },
});
