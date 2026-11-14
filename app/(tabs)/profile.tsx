/** Profil: Stats, Serie, Verwandlungen, Datenquelle, Konto, Datenschutz. Zuständig: app-ui. */
import React, { useEffect, useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useApp } from '../../src/state/AppState.tsx';
import { MOOD_TEXT, STAGES } from '../../src/game/rules.ts';
import { STAGE_COLORS } from '../../src/avatar/palette.ts';
import { Avatar } from '../../src/avatar/Avatar.tsx';
import { BODIES, HAIRSTYLES, type BodyOption } from '../../src/avatar/assets.ts';
import * as social from '../../src/social/api.ts';
import { AppleSignIn } from '../../src/ui/AppleSignIn.tsx';
import { Bar, Button, Card, H, P } from '../../src/ui/components.tsx';
import { C, F, PRIVACY_URL, fmt } from '../../src/ui/theme.ts';

const SOURCE: Record<string, string> = { healthkit: 'Apple Health', whoop: 'WHOOP', demo: 'Beispieldaten' };

export default function Profile() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(app.name);
  useEffect(() => setName(app.name), [app.name]);

  const s = app.progress.stats;
  const max = Math.max(100, s.str, s.end, s.rec, s.dis);
  const bars: [string, number, string][] = [['Stärke', s.str, C.ki], ['Ausdauer', s.end, C.sky], ['Erholung', s.rec, C.good], ['Disziplin', s.dis, C.violet]];
  const mood = app.today?.mood ?? 'awake';

  const reset = () => Alert.alert('Fortschritt zurücksetzen?', 'Level, Stats und Serie auf diesem iPhone werden gelöscht. Deine Daten in Apple Health bleiben unberührt.', [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Zurücksetzen', style: 'destructive', onPress: async () => { await app.resetLocal(); router.replace('/onboarding'); } },
  ]);

  const [deleting, setDeleting] = useState(false);
  const deleteAccount = () => Alert.alert('Konto löschen?', 'Dein Konto, dein Profil, deine Einladungen und alle Freundschaften werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.', [
    { text: 'Abbrechen', style: 'cancel' },
    { text: 'Konto löschen', style: 'destructive', onPress: async () => {
      setDeleting(true);
      try {
        await social.deleteAccount();
        await app.signOut();
      } catch (e) {
        setDeleting(false);
        Alert.alert('Konto nicht gelöscht', (e as Error).message);
        return;
      }
      setDeleting(false);
      Alert.alert('Konto gelöscht', 'Auch Fortschritt auf diesem iPhone löschen?', [
        { text: 'Behalten', style: 'cancel' },
        { text: 'Löschen', style: 'destructive', onPress: async () => { await app.resetLocal(); router.replace('/onboarding'); } },
      ]);
    } },
  ]);

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
        <P>Deine Gesundheitsdaten bleiben auf deinem iPhone. LvlMe liest sie nur, um deinen Avatar zu berechnen. Freunde sehen Level, Stufe, Kampfkraft, das Aussehen deines Avatars und – wenn du es erlaubst – deine Tagesform. Deine Messwerte nie.</P>
        <View style={st.switchRow}>
          <Text style={[st.label, { flex: 1 }]}>Tagesform mit Freunden teilen</Text>
          <Switch value={app.shareMood} onValueChange={v => { app.setShareMood(v); }}
            trackColor={{ true: C.ki, false: C.line }} ios_backgroundColor={C.line}
            accessibilityLabel="Tagesform mit Freunden teilen"
            accessibilityHint="Freunde sehen dann, ob du aufgeladen, müde usw. bist" />
        </View>
        <P>Freunde sehen dann, ob du aufgeladen, müde usw. bist. Daraus lassen sich Rückschlüsse auf Schlaf und Erholung ziehen. Du kannst das jederzeit wieder ausschalten.</P>
        <P>Welche Daten LvlMe lesen darf, änderst du in der Health-App unter Profil › Apps › LvlMe.</P>
        <Text style={st.link} accessibilityRole="link" accessibilityHint="Öffnet die Datenschutzerklärung im Browser"
          onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}>Datenschutzerklärung</Text>
      </Card>

      <Card>
        <H>Konto</H>
        {!social.isConfigured() && <P>Konto und Freunde sind in dieser Version noch nicht eingerichtet.</P>}
        {social.isConfigured() && app.me && (
          <>
            <P>Angemeldet mit Apple.</P>
            <Button title="Abmelden" kind="ghost" onPress={app.signOut} />
            <Button title="Konto löschen" kind="danger" busy={deleting} disabled={deleting} onPress={deleteAccount}
              accessibilityHint="Löscht dein Konto, dein Profil und alle Freundschaften endgültig" />
          </>
        )}
        {social.isConfigured() && !app.me && <AppleSignIn />}
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
