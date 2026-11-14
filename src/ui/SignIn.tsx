/**
 * Anmeldung auf allen Geräten. Zuständig: app-ui.
 * - iPhone: „Mit Apple anmelden“ im offiziellen Apple-Stil (App-Review-Vorgabe) und zusätzlich E-Mail
 * - PC/Web: E-Mail und Passwort (dasselbe Konto wie in der Webversion)
 * Wer auf iPhone und PC dieselben Daten sehen will, nutzt auf beiden Geräten dieselbe E-Mail.
 */
import React, { useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import * as social from '../social/api.ts';
import { useApp } from '../state/AppState.tsx';
import { Button } from './components.tsx';
// Ohne Dateiendung: Metro nimmt im Web AppleButton.web.tsx (das native Modul wird dort nie geladen)
import { AppleButton } from './AppleButton';
import { C } from './theme.ts';

export function SignIn({ onDone }: { onDone?: () => void }) {
  const { setMe } = useApp();
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState<'in' | 'up' | null>(null);
  if (!social.isConfigured()) return null;

  const valid = /\S+@\S+\.\S+/.test(email.trim()) && password.length >= 6;

  const signIn = async () => {
    setErr(null); setInfo(null); setBusy('in');
    try {
      const me = await social.signInWithEmail(email, password);
      if (me) { setMe(me); onDone?.(); }
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(null); }
  };

  const signUp = async () => {
    setErr(null); setInfo(null); setBusy('up');
    try {
      const r = await social.signUpWithEmail(email, password);
      if (r === 'signed-in') {
        const me = await social.getMe();
        if (me) { setMe(me); onDone?.(); }
      } else {
        setInfo('Fast geschafft: Wir haben dir eine E-Mail geschickt. Bestätige den Link und melde dich dann hier an.');
      }
    } catch (e) {
      setErr((e as Error).message);
    } finally { setBusy(null); }
  };

  return (
    <View style={{ gap: 8 }}>
      {Platform.OS === 'ios' && (
        <>
          <AppleButton
            onPress={async () => {
              setErr(null);
              try {
                const me = await social.signInWithApple();
                if (me) { setMe(me); onDone?.(); }
              } catch {
                setErr('Die Anmeldung hat nicht geklappt. Prüfe deine Internetverbindung und versuch es noch einmal.');
              }
            }}
          />
          <Text style={st.or}>oder mit E-Mail (gleiches Konto wie am PC)</Text>
        </>
      )}
      <TextInput value={email} onChangeText={setEmail} placeholder="E-Mail" placeholderTextColor={C.mute}
        autoCapitalize="none" autoCorrect={false} keyboardType="email-address" autoComplete="email" textContentType="emailAddress"
        style={st.input} accessibilityLabel="E-Mail" />
      <TextInput value={password} onChangeText={setPassword} placeholder="Passwort (mind. 6 Zeichen)" placeholderTextColor={C.mute}
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="password" textContentType="password"
        returnKeyType="go" onSubmitEditing={() => { if (valid) signIn(); }}
        style={st.input} accessibilityLabel="Passwort" />
      <Button title="Anmelden" onPress={signIn} busy={busy === 'in'} disabled={!valid || busy !== null} />
      <Button title="Neues Konto erstellen" kind="ghost" onPress={signUp} busy={busy === 'up'} disabled={!valid || busy !== null} />
      {info && <Text style={{ color: C.good, fontSize: 13 }}>{info}</Text>}
      {err && <Text style={{ color: C.bad, fontSize: 13 }}>{err}</Text>}
    </View>
  );
}

const st = StyleSheet.create({
  input: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, color: C.ink, paddingHorizontal: 14, fontSize: 16, backgroundColor: C.card2 },
  or: { color: C.mute, fontSize: 12, textAlign: 'center', paddingTop: 2 },
});
