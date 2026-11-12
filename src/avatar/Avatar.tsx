/**
 * Avatar-Komponente. Zuständig: avatar-art.
 * Drei SVG-Ebenen übereinander: Schatten (statisch), Aura (flackert), Körper (wippt).
 * Respektiert „Bewegung reduzieren“.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, View, type StyleProp, type ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import type { Mood } from '../types.ts';
import { MOOD_TEXT, STAGES } from '../game/rules.ts';
import { avatarSvg } from './avatarSvg.ts';

export interface AvatarProps {
  /** Verwandlungsstufe 0–5 */
  stage: number;
  mood: Mood;
  /** Breite in pt; Höhe ergibt sich (240:280) */
  size: number;
  flip?: boolean;
  /** eindeutige Kennung, wenn mehrere Avatare gleichzeitig sichtbar sind */
  id?: string;
  /** Animation abschalten (z. B. in Listen) */
  still?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AVATAR_RATIO = 280 / 240;

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then(v => { if (alive) setReduce(v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  return reduce;
}

export function Avatar({ stage, mood, size, flip = false, id = 'av', still = false, style }: AvatarProps) {
  const reduce = useReduceMotion();
  const animate = !still && !reduce;
  const h = size * AVATAR_RATIO;

  const xml = useMemo(() => ({
    ground: avatarSvg(stage, mood, `${id}g`, { flip, layer: 'ground' }),
    aura: avatarSvg(stage, mood, `${id}a`, { flip, layer: 'aura' }),
    body: avatarSvg(stage, mood, `${id}b`, { flip, layer: 'body' }),
  }), [stage, mood, id, flip]);

  const bob = useRef(new Animated.Value(0)).current;
  const flick = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    bob.setValue(0); flick.setValue(0);
    if (!animate) return;
    const period = mood === 'charged' ? 1200 : mood === 'tired' || mood === 'lazy' ? 4000 : 2400;
    const loopBob = Animated.loop(Animated.sequence([
      Animated.timing(bob, { toValue: 1, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(bob, { toValue: 0, duration: period / 2, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    const loopFlick = Animated.loop(Animated.sequence([
      Animated.timing(flick, { toValue: 1, duration: 330, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(flick, { toValue: 0.4, duration: 260, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(flick, { toValue: 0, duration: 510, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]));
    loopBob.start(); loopFlick.start();
    return () => { loopBob.stop(); loopFlick.stop(); };
  }, [animate, mood, bob, flick]);

  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.017] });
  const auraScaleY = flick.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const auraOpacity = flick.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  // Skalierung um die Unterkante: verschieben, skalieren, zurückschieben
  const auraShift = flick.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.03] });

  const layer = { position: 'absolute' as const, left: 0, top: 0, width: size, height: h };
  const label = `Avatar, ${MOOD_TEXT[mood].label}, Stufe ${STAGES[Math.max(0, Math.min(5, stage))].name}`;

  return (
    <View style={[{ width: size, height: h }, style]} accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={layer} pointerEvents="none"><SvgXml xml={xml.ground} width={size} height={h} /></View>
      <Animated.View style={[layer, { opacity: auraOpacity, transform: [{ translateY: auraShift }, { scaleY: auraScaleY }] }]} pointerEvents="none">
        <SvgXml xml={xml.aura} width={size} height={h} />
      </Animated.View>
      <Animated.View style={[layer, { transform: [{ translateY: bobY }] }]} pointerEvents="none">
        <SvgXml xml={xml.body} width={size} height={h} />
      </Animated.View>
    </View>
  );
}
