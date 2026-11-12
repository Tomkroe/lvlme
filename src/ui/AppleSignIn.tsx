/** „Mit Apple anmelden“ im offiziellen Apple-Stil (App-Review-Vorgabe). Zuständig: app-ui. */
import React, { useState } from 'react';
import { Platform, Text, View } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as social from '../social/api.ts';
import { useApp } from '../state/AppState.tsx';
import { C } from './theme.ts';

export function AppleSignIn({ onDone }: { onDone?: () => void }) {
  const { setMe } = useApp();
  const [err, setErr] = useState<string | null>(null);
  if (Platform.OS !== 'ios' || !social.isConfigured()) return null;
  return (
    <View style={{ gap: 6 }}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
        cornerRadius={14}
        style={{ height: 48, width: '100%' }}
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
      {err && <Text style={{ color: C.bad, fontSize: 13 }}>{err}</Text>}
    </View>
  );
}
