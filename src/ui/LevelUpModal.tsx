/** Vollbild-Overlay für Level-up und Verwandlung. Zuständig: app-ui. */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { STAGES } from '../game/rules.ts';
import { Avatar } from '../avatar/Avatar.tsx';
import { useApp } from '../state/AppState.tsx';
import { C, F } from './theme.ts';

const RAYS = Array.from({ length: 24 }, (_, i) => {
  const a1 = (i * 15 * Math.PI) / 180, a2 = ((i * 15 + 7) * Math.PI) / 180, R = 900;
  return `${Math.cos(a1) * R},${Math.sin(a1) * R} 0,0 ${Math.cos(a2) * R},${Math.sin(a2) * R}`;
});

export function LevelUpModal() {
  const { events, dismissEvent, hair, body } = useApp();
  const ev = events[0];
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!ev) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    spin.setValue(0); pop.setValue(0);
    const a = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 16000, easing: Easing.linear, useNativeDriver: true }));
    a.start();
    Animated.spring(pop, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    return () => a.stop();
  }, [ev, spin, pop]);

  if (!ev) return null;
  const isStage = ev.kind === 'stage';
  const title = isStage ? 'Verwandlung!' : 'Level up!';
  const sub = isStage ? `${STAGES[ev.stage].name} · Level ${ev.level}` : `Level ${ev.level}`;
  const rot = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={dismissEvent}>
      <Pressable style={st.root} onPress={dismissEvent} accessibilityRole="button" accessibilityLabel={`${title} ${sub}. Tippen zum Schließen`}>
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%">
            <Defs>
              <RadialGradient id="lvbg" cx="50%" cy="45%" r="70%">
                <Stop offset="0" stopColor="#ffe9b0" />
                <Stop offset="0.45" stopColor="#ff7a2e" />
                <Stop offset="1" stopColor="#2a0f2e" />
              </RadialGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#lvbg)" />
          </Svg>
        </View>
        <Animated.View style={[st.rays, { transform: [{ rotate: rot }] }]} pointerEvents="none">
          <Svg width={1800} height={1800} viewBox="-900 -900 1800 1800">
            {RAYS.map((p, i) => <Polygon key={i} points={p} fill="#fff" opacity={0.16} />)}
          </Svg>
        </Animated.View>
        <Animated.View style={[st.content, { transform: [{ scale }] }]}>
          {isStage && <Avatar stage={ev.stage} mood="proud" hair={hair} body={body} size={170} id="lvup" />}
          <Text style={[st.title, F.display]}>{title}</Text>
          <View style={st.pill}><Text style={st.pillText}>{sub}</Text></View>
          <Text style={st.hint}>Tippen zum Schließen</Text>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  rays: { position: 'absolute', width: 1800, height: 1800, left: '50%', top: '45%', marginLeft: -900, marginTop: -900 },
  content: { alignItems: 'center', gap: 10, paddingHorizontal: 24 },
  title: { fontSize: 52, color: '#fff', textShadowColor: C.outline, textShadowOffset: { width: 3, height: 3 }, textShadowRadius: 0, textAlign: 'center' },
  pill: { backgroundColor: '#fff', borderColor: C.outline, borderWidth: 2.5, borderRadius: 999, paddingHorizontal: 18, paddingVertical: 6 },
  pillText: { color: C.outline, fontWeight: '900', fontSize: 18 },
  hint: { color: C.outline, fontWeight: '700', marginTop: 8, opacity: 0.8 },
});
