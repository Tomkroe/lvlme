/** Onboarding: Idee erklären, Apple Health verbinden, Name und optional Konto. Zuständig: app-ui. */
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getHealthProvider } from '../src/health/index.ts';
import * as social from '../src/social/api.ts';
import { useApp } from '../src/state/AppState.tsx';
import { Avatar } from '../src/avatar/Avatar.tsx';
import { AppleSignIn } from '../src/ui/AppleSignIn.tsx';
import { Button, Card, P } from '../src/ui/components.tsx';
import { C, F } from '../src/ui/theme.ts';

export default function Onboarding() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(app.name);
  const [busy, setBusy] = useState(false);
  const [healthMsg, setHealthMsg] = useState<string | null>(null);

  const connectHealth = async () => {
    setBusy(true); setHealthMsg(null);
    try {
      const hp = getHealthProvider();
      if (!(await hp.isAvailable())) {
        setHealthMsg('Apple Health ist auf diesem Gerät nicht verfügbar. LvlMe zeigt dir stattdessen Beispieldaten.');
      } else {
        await hp.requestAccess();
      }
      setStep(2);
    } catch {
      setHealthMsg('Der Zugriff konnte nicht angefragt werden. Du kannst ihn später in der Health-App erlauben.');
      setStep(2);
    } finally { setBusy(false); }
  };

  const finish = async () => {
    setBusy(true);
    try {
      await app.setName(name);
      await app.finishOnboarding();
      router.replace('/');
    } finally { setBusy(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[st.wrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={st.brand}><Text style={[st.word, F.display]}>Lvl<Text style={{ color: C.ki }}>Me</Text></Text></View>
        <View style={{ alignItems: 'center' }}>
          <Avatar stage={step === 0 ? 0 : 1} mood={step === 2 ? 'proud' : 'charged'} size={180} id="onb" />
        </View>

        {step === 0 && (
          <>
            <Text style={[st.h1, F.display]}>Dein Kämpfer lebt von deinen Daten</Text>
            <P>Gut geschlafen? Dein Avatar strahlt. Hart trainiert? Er wird stärker. Tagelang gesessen? Er wird träge. Du trainierst wie immer, LvlMe macht ein Spiel daraus.</P>
            <Button title="Los geht's" onPress={() => setStep(1)} />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={[st.h1, F.display]}>Apple Health verbinden</Text>
            <P>LvlMe liest Schlaf, Schritte, Workouts, aktive Kalorien, Ruhepuls und Herzfrequenzvariabilität, um deine Tagesform zu berechnen. Die Daten bleiben auf deinem iPhone, LvlMe schreibt nichts in Health.</P>
            <Button title="Apple Health verbinden" onPress={connectHealth} busy={busy} />
            <Button title="Später" kind="ghost" onPress={() => setStep(2)} />
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[st.h1, F.display]}>Wie heißt dein Kämpfer?</Text>
            {healthMsg && <Card style={{ borderColor: C.warn }}><P style={{ color: C.ink }}>{healthMsg}</P></Card>}
            <TextInput value={name} onChangeText={setName} placeholder="Dein Name" placeholderTextColor={C.mute} maxLength={24}
              style={st.input} autoFocus returnKeyType="done" accessibilityLabel="Name deines Kämpfers" />
            {social.isConfigured() && !app.me && (
              <Card>
                <P style={{ color: C.ink, fontWeight: '700' }}>Mit Freunden spielen (optional)</P>
                <P>Mit einem Konto kannst du Freunde einladen. Sie sehen nur deinen Avatar, nie deine Gesundheitsdaten.</P>
                <AppleSignIn />
              </Card>
            )}
            <Button title="Fertig" onPress={finish} busy={busy} disabled={!name.trim()} />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const st = StyleSheet.create({
  wrap: { paddingHorizontal: 20, gap: 16 },
  brand: { alignSelf: 'flex-start', backgroundColor: C.outline, borderColor: C.ki, borderWidth: 2, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 2 },
  word: { color: '#fff', fontSize: 24 },
  h1: { color: C.ink, fontSize: 30, lineHeight: 34 },
  input: { minHeight: 52, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, color: C.ink, paddingHorizontal: 14, fontSize: 18, fontWeight: '700', backgroundColor: C.card2 },
});
