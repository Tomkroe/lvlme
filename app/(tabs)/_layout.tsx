import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { useApp } from '../../src/state/AppState.tsx';
import { C } from '../../src/ui/theme.ts';

const icon = (kind: 'home' | 'friends' | 'profile') => ({ color }: { color: string }) => (
  <Svg width={26} height={26} viewBox="0 0 26 26" fill="none" stroke={color} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
    {kind === 'home' && (<>
      <Path d="M13 3.5 L10 7 L7 5.5 L8 9.5" /><Circle cx={13} cy={11} r={4.5} />
      <Path d="M4.5 23 C5 17.5 8.5 15.5 13 15.5 C17.5 15.5 21 17.5 21.5 23" /><Path d="M17 9 L20.5 6.5" />
    </>)}
    {kind === 'friends' && (<>
      <Circle cx={9.5} cy={9} r={3.6} /><Circle cx={18} cy={10} r={3} />
      <Path d="M2.5 21.5 C3 16.8 5.8 15 9.5 15 C13.2 15 16 16.8 16.5 21.5" /><Path d="M16.5 15.2 C20 15 23 16.5 23.5 20.5" />
    </>)}
    {kind === 'profile' && (<>
      <Path d="M5 22 V14" /><Path d="M11 22 V8" /><Path d="M17 22 V11" /><Path d="M23 22 V4" /><Path d="M3 22 H24" />
    </>)}
  </Svg>
);

export default function TabsLayout() {
  const { ready, onboarded } = useApp();
  if (!ready) {
    return <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={C.ki} /></View>;
  }
  if (!onboarded) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ki,
        tabBarInactiveTintColor: C.mute,
        tabBarStyle: { backgroundColor: '#0a0d19', borderTopColor: C.line },
        tabBarLabelStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Avatar', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="friends" options={{ title: 'Freunde', tabBarIcon: icon('friends') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: icon('profile') }} />
    </Tabs>
  );
}
