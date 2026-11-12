import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppStateProvider } from '../src/state/AppState.tsx';
import { LevelUpModal } from '../src/ui/LevelUpModal.tsx';
import { C } from '../src/ui/theme.ts';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
          <Stack.Screen name="invite/[code]" options={{ presentation: 'modal' }} />
        </Stack>
        <LevelUpModal />
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
