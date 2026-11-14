/** Deep Link lvlme://invite/CODE: Einladung annehmen. Zuständig: app-ui. */
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as social from '../../src/social/api.ts';
import { useApp } from '../../src/state/AppState.tsx';
import { SignIn } from '../../src/ui/SignIn.tsx';
import { Button, Card, P } from '../../src/ui/components.tsx';
import { C, F } from '../../src/ui/theme.ts';

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'ok'; name: string } | { kind: 'error'; text: string };

export default function InviteScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const app = useApp();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const clean = String(code ?? '').trim().toUpperCase();

  useEffect(() => {
    if (!app.ready || !social.isConfigured() || !app.me || !clean || status.kind !== 'idle') return;
    setStatus({ kind: 'busy' });
    social.acceptInvite(clean)
      .then(r => setStatus(r.ok ? { kind: 'ok', name: r.friendName ?? 'Dein Freund' } : { kind: 'error', text: r.error ?? 'Dieser Code ist ungültig oder abgelaufen.' }))
      .catch(() => setStatus({ kind: 'error', text: 'Das hat nicht geklappt. Prüfe deine Internetverbindung und öffne den Link noch einmal.' }));
  }, [app.ready, app.me, clean, status.kind]);

  const goFriends = () => router.replace(app.onboarded ? '/friends' : '/onboarding');

  return (
    <View style={st.root}>
      <Text style={[st.h1, F.display]}>Einladung</Text>
      <P>Code: <Text style={{ color: C.ink, fontWeight: '800', letterSpacing: 2 }}>{clean || '—'}</Text></P>

      {!social.isConfigured() && <Card><P>Freunde sind in dieser Version noch nicht eingerichtet.</P></Card>}
      {social.isConfigured() && !app.me && (
        <Card>
          <P style={{ color: C.ink, fontWeight: '700' }}>Melde dich an, um die Einladung anzunehmen</P>
          <SignIn />
        </Card>
      )}
      {status.kind === 'busy' && <ActivityIndicator color={C.ki} />}
      {status.kind === 'ok' && <Card style={{ borderColor: C.good }}><P style={{ color: C.ink }}>{status.name} ist jetzt dein Freund.</P></Card>}
      {status.kind === 'error' && <Card style={{ borderColor: C.bad }}><P style={{ color: C.ink }}>{status.text}</P></Card>}

      <Button title={app.onboarded ? 'Zu deinen Freunden' : 'LvlMe einrichten'} onPress={goFriends} />
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, padding: 20, paddingTop: 40, gap: 14 },
  h1: { color: C.ink, fontSize: 30 },
});
