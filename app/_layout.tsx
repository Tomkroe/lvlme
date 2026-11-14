import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from '../src/state/AppState.tsx';
import { LevelUpModal } from '../src/ui/LevelUpModal.tsx';
import { C } from '../src/ui/theme.ts';
import { WEB_MAX_WIDTH, isWeb } from '../src/ui/layout.ts';

export default function RootLayout() {
  return (
    <SafeAreaProvider style={{ backgroundColor: C.bg }}>
      <AppStateProvider>
        <StatusBar style="light" />
        {/* Im Browser/PC-Fenster: mittige Spalte in Handy-Breite */}
        <View style={isWeb ? { flex: 1, width: '100%', maxWidth: WEB_MAX_WIDTH, alignSelf: 'center' } : { flex: 1 }}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="invite/[code]" options={{ presentation: 'modal' }} />
        </Stack>
        </View>
        <LevelUpModal />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
