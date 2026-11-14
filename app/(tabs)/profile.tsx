/** Profil: Stats, Serie, Verwandlungen, Datenquelle, Konto, Datenschutz. Zuständig: app-ui. */
import React, { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApp } from '../../src/state/AppState.tsx';
import { MOOD_TEXT, STAGES } from '../../src/game/rules.ts';
import { STAGE_COLORS } from '../../src/avatar/palette.ts';
import { Avatar } from '../../src/avatar/Avatar.tsx';
import { BODIES, HAIRSTYLES, type BodyOption } from '../../src/avatar/assets.ts';
import * as social from '../../src/social/api.ts';
import { SignIn } from '../../src/ui/SignIn.tsx';
import { confirm, notify } from '../../src/ui/confirm.ts';
import { Bar, Button, Card, H, P } from '../../src/ui/components.tsx';
import { Slider } from '../../src/ui/Slider.tsx';
import { ALL_GOALS_BONUS, GOAL_DEFS, goalDef, type GoalId } from '../../src/game/goals.ts';
import { BODY_LIMITS, DEFAULT_BODY_STATS, bmi, clampStats, ffmi, suggestBody, type BodyStats } from '../../src/game/body.ts';
import { C, F, PRIVACY_URL, fmt } from '../../src/ui/theme.ts';

const SOURCE: Record<string, string> = { healthkit: 'Apple Health', whoop: 'WHOOP', cloud: 'Dein Konto (vom iPhone)', demo: 'Beispieldaten' };
const isIos = Platform.OS === 'ios';

export default function Profile() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(app.name);
  useEffect(() => setName(app.name), [app.name]);

  const [stats, setStats] = useState<BodyStats>(app.bodyStats ?? DEFAULT_BODY_STATS);
  useEffect(() => { if (app.bodyStats) setStats(app.bodyStats); }, [app.bodyStats]);
  const upd = (k: keyof BodyStats) => (v: number) => setStats(o => ({ ...o, [k]: v }));
  const save = (k: keyof BodyStats) => (v: number) => { app.setBodyStats(clampStats({ ...stats, [k]: v })); };
  const sugg = suggestBody(stats);
  const suggName = BODIES.find(b => b.id === sugg.id)?.name ?? '';

  const toggleGoal = (id: GoalId, on: boolean) => {
    const g = { ...app.goals };
    if (on) g[id] = goalDef(id).def; else delete g[id];
    app.setGoals(g);
  };
  const [goalDraft, setGoalDraft] = useState<Record<string, number>>({});

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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 32, gap: 14 }}>
      <Text style={[st.title, F.display]}>Profil</Text>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Avatar stage={app.stage} mood={mood} hair={app.hair} body={app.body} size={72} still id="prof" />
        <View style={{ flex: 1, gap: 4 }}>
          <TextInput value={name} onChangeText={setName} onEndEditing={() => app.setName(name)} placeholder="Dein Name"
            placeholderTextColor={C.mute} maxLength={24} style={st.name} accessibilityLabel="Name ändern" />
          <Text style={st.meta}>Level {app.progress.level} · {STAGES[app.stage].name}</Text>
          <Text style={st.meta}>Kampfkraft <Text style={[{ color: C.sky }, F.num]}>{fmt(app.power)}</Text></Text>
          <Text style={st.meta}>Heute: {MOOD_TEXT[mood].label}</Text>
        </View>
      </Card>

      <Card>
        <H>Frisur</H>
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
      </Card>

      <Card>
        <H>Körper & Outfit</H>
        {([['type', 'Körpertyp'], ['outfit', 'Outfit']] as [BodyOption['kind'], string][]).map(([kind, label]) => (
          <View key={kind} style={{ gap: 6 }}>
            <Text style={st.meta}>{label}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>
              {BODIES.filter(b => b.kind === kind).map(b => {
                const on = b.id === app.body;
                return (
                  <Pressable key={b.id} onPress={() => { app.setBody(b.id); }} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    accessibilityLabel={`${label} ${b.name}`} style={[st.hairOpt, on && st.hairOn]}>
                    <Avatar stage={app.stage} mood="awake" hair={app.hair} body={b.id} size={52} still id={`body${b.id}`} />
                    <Text style={[st.hairName, on && { color: C.ki }]} numberOfLines={1}>{b.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ))}
        <P style={{ fontSize: 12 }}>Körpertyp und Outfit schließen sich vorerst aus: Outfits gibt es nur mit athletischem Körper. Freunde sehen deine Frisur und deinen Körper, sobald du angemeldet bist.</P>
      </Card>

      <Card>
        <H>Körperwerte</H>
        <Slider label="Größe" unit="cm" value={stats.heightCm} min={BODY_LIMITS.heightCm.min} max={BODY_LIMITS.heightCm.max} onChange={upd('heightCm')} onDone={save('heightCm')} />
        <Slider label="Gewicht" unit="kg" value={stats.weightKg} min={BODY_LIMITS.weightKg.min} max={BODY_LIMITS.weightKg.max} onChange={upd('weightKg')} onDone={save('weightKg')} />
        <Slider label="Körperfettanteil (KFA)" unit="%" value={stats.bodyFatPct} min={BODY_LIMITS.bodyFatPct.min} max={BODY_LIMITS.bodyFatPct.max} onChange={upd('bodyFatPct')} onDone={save('bodyFatPct')} />
        <View style={st.row}>
          <Text style={st.meta}>BMI <Text style={[{ color: C.ink }, F.num]}>{bmi(stats).toFixed(1)}</Text></Text>
          <Text style={st.meta}>FFMI <Text style={[{ color: C.ink }, F.num]}>{ffmi(stats).toFixed(1)}</Text></Text>
        </View>
        {app.body <= 4 && app.body !== sugg.id && (
          <Button title={`Körpertyp „${suggName}“ übernehmen`} kind="ghost" onPress={() => { app.setBody(sugg.id); }}
            accessibilityHint={`Passt zu deinen Werten: ${sugg.why}`} />
        )}
        <P style={{ fontSize: 12 }}>Größe, Gewicht und KFA bleiben auf diesem Gerät. Sie werden weder mit Freunden geteilt noch synchronisiert und ändern weder XP noch Level. Freunde sehen nur den Körpertyp, den du oben wählst. Die Werte sind nur ein Vorschlag für die Figur.</P>
      </Card>

      <Card>
        <H>Tagesziele</H>
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
        <P style={{ fontSize: 12 }}>Es gibt bewusst kein Ziel für Gewicht oder Körperfett, und das Schlafziel beginnt bei 6 Stunden: LvlMe belohnt weder Hungern noch Schlafentzug.</P>
      </Card>

      <Card>
        <H>Stats</H>
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
      </Card>

      <Card>
        <H>Verwandlungen</H>
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
      </Card>

      <Card>
        <H>Daten</H>
        <P>Quelle: <Text style={{ color: C.ink, fontWeight: '700' }}>{app.source ? SOURCE[app.source] ?? app.source : 'noch keine'}</Text></P>
        {isIos ? (
          <P>LvlMe liest deine Gesundheitsdaten aus Apple Health, um deinen Avatar zu berechnen. Ohne Sync bleiben sie auf deinem iPhone. Freunde sehen Level, Stufe, Kampfkraft, das Aussehen deines Avatars und – wenn du es erlaubst – deine Tagesform. Deine Messwerte nie.</P>
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
      </Card>

      <Card>
        <H>Konto</H>
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
      </Card>
    </ScrollView>
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
  hairOn: { borderColor: C.ki, backgroundColor: 'rgba(255,138,31,0.12)' },
  hairName: { color: C.mute, fontSize: 11, fontWeight: '700' },
});
