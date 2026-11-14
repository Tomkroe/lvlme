/**
 * Avatar-Komponente. Zuständig: avatar-art.
 * Ebenen übereinander: Schatten (statisch), Aura (flackert, SVG), Körper + Kopf (Bilder, wippen).
 * Körper und Kopf kommen aus assets.ts; `body` wählt Körpertyp/Outfit, `hair` den Kopf. Stimmung wirkt derzeit nur auf
 * Aura und Bewegung, nicht auf das Gesicht (dafür fehlen noch Bildvarianten).
 * Respektiert „Bewegung reduzieren“.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Ellipse } from 'react-native-svg';
import { SvgXml } from 'react-native-svg';
import type { BodyId, HairId, Mood } from '../types.ts';
import { MOOD_TEXT, STAGES } from '../game/rules.ts';
import { avatarSvg } from './avatarSvg.ts';
import { AVATAR_FEET, AVATAR_H, AVATAR_W, DEFAULT_BODY, DEFAULT_HAIR, bodyOption, hairstyle } from './assets.ts';

export { AVATAR_FEET };

export interface AvatarProps {
  /** Verwandlungsstufe 0–5 */
  stage: number;
  mood: Mood;
  /** Breite in pt; Höhe ergibt sich (AVATAR_W:AVATAR_H) */
  size: number;
  /** Frisur (Kopf-Ebene); fehlt sie, der Originalkopf */
  hair?: HairId;
  /** Körpertyp oder Outfit (Körper-Ebene); fehlt er, der Originalkörper */
  body?: BodyId;
  /** Aura-Farbe aus dem Shop (ersetzt die Stufenfarbe) */
  auraColor?: string;
  flip?: boolean;
  /** eindeutige Kennung, wenn mehrere Avatare gleichzeitig sichtbar sind */
  id?: string;
  /** Animation abschalten (z. B. in Listen) */
  still?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AVATAR_RATIO = AVATAR_H / AVATAR_W;

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

export function Avatar({ stage, mood, size, hair = DEFAULT_HAIR, body = DEFAULT_BODY, auraColor, flip = false, id = 'av', still = false, style }: AvatarProps) {
  const reduce = useReduceMotion();
  const animate = !still && !reduce;
  const h = size * AVATAR_RATIO;
  const head = hairstyle(hair);
  const torso = bodyOption(body);

  // Aura aus der SVG-Zeichnung; sie ist für ein 240×280-Feld entworfen und wird auf das Bildfeld gestreckt
  const auraXml = useMemo(() => avatarSvg(stage, mood, `${id}a`, { flip, layer: 'aura', auraColor }), [stage, mood, id, flip, auraColor]);

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

  const bobY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -size * 0.012] });
  const auraScaleY = flick.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  const auraOpacity = flick.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  // Skalierung um die Unterkante: verschieben, skalieren, zurückschieben
  const auraShift = flick.interpolate({ inputRange: [0, 1], outputRange: [0, -h * 0.025] });

  const layer = { position: 'absolute' as const, left: 0, top: 0, width: size, height: h };
  const mirror = flip ? [{ scaleX: -1 }] : [];
  const label = `Avatar, ${MOOD_TEXT[mood].label}, Stufe ${STAGES[Math.max(0, Math.min(5, stage))].name}, Frisur ${head.name}, ${torso.name}`;

  return (
    <View style={[{ width: size, height: h }, style]} accessible accessibilityRole="image" accessibilityLabel={label}>
      <View style={layer} pointerEvents="none">
        <Svg width={size} height={h} viewBox={`0 0 ${AVATAR_W} ${AVATAR_H}`}>
          <Ellipse cx={AVATAR_W / 2} cy={AVATAR_H * AVATAR_FEET} rx={AVATAR_W * 0.24} ry={AVATAR_H * 0.018} fill="#000" opacity={0.32} />
        </Svg>
      </View>
      <Animated.View style={[layer, { opacity: auraOpacity, transform: [{ translateY: auraShift }, { scaleY: auraScaleY }] }]} pointerEvents="none">
        <SvgXml xml={auraXml} width={size} height={h} preserveAspectRatio="none" />
      </Animated.View>
      <Animated.View style={[layer, { transform: [{ translateY: bobY }, ...mirror] }]} pointerEvents="none">
        <Image source={torso.image} style={layer} resizeMode="contain" fadeDuration={0} />
        <Image source={head.image} style={layer} resizeMode="contain" fadeDuration={0} />
      </Animated.View>
    </View>
  );
}
