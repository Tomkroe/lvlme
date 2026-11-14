/** Freunde: einladen, Code eingeben, Liste, entfernen. Zuständig: app-ui. */
import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import * as social from '../../src/social/api.ts';
import type { Friend } from '../../src/social/api.ts';
import type { Mood } from '../../src/types.ts';
import { shareInvite } from '../../src/share/index.ts';
import { MOOD_TEXT, STAGES } from '../../src/game/rules.ts';
import { useApp } from '../../src/state/AppState.tsx';
import { Avatar } from '../../src/avatar/Avatar.tsx';
import { miniSkySvg } from '../../src/ui/Scene.tsx';
import { SignIn } from '../../src/ui/SignIn.tsx';
import { confirm } from '../../src/ui/confirm.ts';
import { Button, Card, Chip, H, P } from '../../src/ui/components.tsx';
import { C, F } from '../../src/ui/theme.ts';

/** Darstellung, wenn ein Freund seine Tagesform nicht teilt: ruhiger Standard-Look */
const NEUTRAL_MOOD: Mood = 'awake';

export default function Friends() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [inviting, setInviting] = useState(false);
  const [adding, setAdding] = useState(false);
  const configured = social.isConfigured();

  const load = useCallback(async () => {
    if (!configured || !app.me) return;
    setLoading(true);
    try { setFriends(await social.listFriends()); }
    catch { setMsg({ ok: false, text: 'Deine Freunde konnten gerade nicht geladen werden. Prüfe deine Internetverbindung.' }); }
    finally { setLoading(false); }
  }, [configured, app.me]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const invite = async () => {
    setMsg(null); setInviting(true);
    try {
      const inv = await social.createInvite();
      await shareInvite(inv, app.name || 'Ein Freund');
    } catch {
      setMsg({ ok: false, text: 'Die Einladung konnte nicht erstellt werden. Versuch es gleich noch einmal.' });
    } finally { setInviting(false); }
  };

  const add = async () => {
    const c = code.trim().toUpperCase();
    if (!c) return;
    setMsg(null); setAdding(true);
    try {
      const r = await social.acceptInvite(c);
      if (r.ok) { setCode(''); setMsg({ ok: true, text: `${r.friendName ?? 'Dein Freund'} ist jetzt in deiner Liste.` }); load(); }
      else setMsg({ ok: false, text: r.error ?? 'Dieser Code ist ungültig oder abgelaufen. Lass dir einen neuen schicken.' });
    } catch {
      setMsg({ ok: false, text: 'Das hat nicht geklappt. Prüfe deine Internetverbindung.' });
    } finally { setAdding(false); }
  };

  const remove = async (f: Friend) => {
    if (!(await confirm(`${f.displayName} entfernen?`, 'Ihr seht eure Avatare dann nicht mehr. Ihr könnt euch jederzeit neu einladen.', 'Entfernen'))) return;
    try { await social.removeFriend(f.userId); setFriends(xs => xs.filter(x => x.userId !== f.userId)); }
    catch { setMsg({ ok: false, text: 'Entfernen hat nicht geklappt. Versuch es noch einmal.' }); }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 32, gap: 14 }}
      refreshControl={configured && app.me ? <RefreshControl refreshing={loading} onRefresh={load} tintColor="#fff" /> : undefined}>
      <Text style={[st.title, F.display]}>Freunde</Text>

      {!configured && (
        <Card>
          <P style={{ color: C.ink, fontWeight: '700' }}>Freunde kommen bald</P>
          <P>Für Freunde braucht LvlMe einen Server. In dieser Version ist er noch nicht eingerichtet. Dein Avatar und dein Fortschritt funktionieren trotzdem.</P>
        </Card>
      )}

      {configured && !app.me && (
        <Card>
          <P style={{ color: C.ink, fontWeight: '700' }}>Melde dich an, um Freunde hinzuzufügen</P>
          <P>Freunde sehen Level, Stufe, das Aussehen deines Avatars und – wenn du es erlaubst – deine Tagesform. Schlaf, Puls oder Schritte sehen sie nie.</P>
          <SignIn />
        </Card>
      )}

      {configured && app.me && (
        <>
          <Card>
            <H>Freund einladen</H>
            <P>Schick deinen Einladungslink per WhatsApp, iMessage oder wo du willst.</P>
            <Button title="Einladung teilen" onPress={invite} busy={inviting} />
          </Card>
          <Card>
            <H>Code eingeben</H>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TextInput
                value={code} onChangeText={setCode} placeholder="z. B. K7PQ2M" placeholderTextColor={C.mute}
                autoCapitalize="characters" autoCorrect={false} maxLength={12} returnKeyType="done" onSubmitEditing={add}
                style={st.input} accessibilityLabel="Einladungscode"
              />
              <Button title="Hinzufügen" onPress={add} busy={adding} disabled={!code.trim()} />
            </View>
          </Card>
          {msg && <P style={{ color: msg.ok ? C.good : C.bad }}>{msg.text}</P>}

          {friends.length === 0 && !loading && (
            <P>Noch keine Freunde. Lade jemanden ein – sobald er die Einladung annimmt, erscheint sein Avatar hier.</P>
          )}
          {friends.map(f => {
            // mood === null: Freund teilt seine Tagesform nicht → neutral darstellen
            const priv = f.mood == null;
            const shownMood = f.mood ?? NEUTRAL_MOOD;
            return (
              <View key={f.userId} style={st.friend}>
                <View style={st.mini} accessibilityElementsHidden={priv} importantForAccessibility={priv ? 'no-hide-descendants' : 'auto'}>
                  <View style={StyleSheet.absoluteFill}><SvgXml xml={miniSkySvg(shownMood, `ms${f.userId.slice(0, 8)}`)} width="100%" height="100%" /></View>
                  <Avatar stage={f.stage} mood={shownMood} hair={f.hair} body={f.body} size={74} still id={`f${f.userId.slice(0, 8)}`} />
                </View>
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={st.fname} numberOfLines={1}>{f.displayName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={st.meta}>Lv {f.level}</Text>
                    <Chip text={STAGES[Math.max(0, Math.min(5, f.stage))].name} />
                  </View>
                  <Text style={st.meta}>{f.mood ? MOOD_TEXT[f.mood].label : 'Tagesform privat'} · Serie {f.streak} Tage</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <Button title="Entfernen" kind="ghost" onPress={() => remove(f)} style={{ minHeight: 38 }} />
                  </View>
                </View>
              </View>
            );
          })}
        </>
      )}

    </ScrollView>
  );
}

const st = StyleSheet.create({
  title: { color: C.ink, fontSize: 32 },
  input: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, color: C.ink, paddingHorizontal: 14, fontSize: 17, fontWeight: '700', letterSpacing: 2, backgroundColor: C.card2 },
  friend: { flexDirection: 'row', gap: 12, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 10 },
  mini: { width: 92, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end', paddingTop: 6 },
  fname: { color: C.ink, fontWeight: '800', fontSize: 17 },
  meta: { color: C.mute, fontSize: 13 },
});
