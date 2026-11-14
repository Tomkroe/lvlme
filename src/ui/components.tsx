/** Kleine Bausteine der Oberfläche. Zuständig: app-ui. */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C, F } from './theme.ts';

export function Ring({ frac, color, value, unit, label, size = 78 }: { frac: number; color: string; value: string; unit: string; label: string; size?: number }) {
  const r = 30, circ = 2 * Math.PI * r, f = Math.max(0, Math.min(1, frac));
  return (
    <View style={{ alignItems: 'center', gap: 4 }} accessible accessibilityLabel={`${label}: ${value} ${unit}`}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox="0 0 76 76">
          <Circle cx={38} cy={38} r={r} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={8} />
          <Circle cx={38} cy={38} r={r} fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
            strokeDasharray={`${circ * f} ${circ}`} transform="rotate(-90 38 38)" />
        </Svg>
        <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={[{ color: C.ink, fontSize: 18 }, F.num]}>{value}</Text>
          <Text style={{ color: C.mute, fontSize: 8.5, letterSpacing: 1, fontWeight: '700' }}>{unit}</Text>
        </View>
      </View>
      <Text style={{ color: C.ink, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function LevelRing({ frac, level, size = 46 }: { frac: number; level: number; size?: number }) {
  const r = 19, circ = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 46 46">
        <Circle cx={23} cy={23} r={r} fill="rgba(0,0,0,0.35)" stroke="rgba(255,255,255,0.18)" strokeWidth={4} />
        <Circle cx={23} cy={23} r={r} fill="none" stroke={C.ki} strokeWidth={4} strokeLinecap="round"
          strokeDasharray={`${circ * Math.max(0, Math.min(1, frac))} ${circ}`} transform="rotate(-90 23 23)" />
      </Svg>
      <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={[{ color: '#fff', fontSize: 19 }, F.display]}>{level}</Text>
      </View>
    </View>
  );
}

export function Bar({ frac, color = C.ki, height = 10 }: { frac: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%` as `${number}%`, height: '100%', borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

/** Aufklappbarer Abschnitt (Akkordeon): zu Beginn zu, damit lange Seiten kurz bleiben */
export function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <View style={[s.card, { gap: open ? 10 : 0, paddingVertical: open ? 16 : 6 }]}>
      <Pressable onPress={() => setOpen(o => !o)} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={title}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 }}>
        <Text style={s.h}>{title}</Text>
        <Text style={{ color: C.mute, fontSize: 16, fontWeight: '800' }}>{open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && children}
    </View>
  );
}

export function H({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.h, style]}>{children}</Text>;
}

export function P({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[s.p, style]}>{children}</Text>;
}

export function Button({ title, onPress, kind = 'primary', busy = false, disabled = false, style, accessibilityHint }: {
  title: string; onPress: () => void; kind?: 'primary' | 'ghost' | 'danger'; busy?: boolean; disabled?: boolean;
  style?: StyleProp<ViewStyle>; accessibilityHint?: string;
}) {
  const bg = kind === 'primary' ? C.ki : 'transparent';
  const fg = kind === 'primary' ? C.kiInk : kind === 'danger' ? C.bad : C.ink;
  return (
    <Pressable onPress={onPress} disabled={disabled || busy} accessibilityRole="button" accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, borderColor: kind === 'primary' ? C.ki : C.line, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Chip({ text, color = C.ink, bg = 'rgba(255,255,255,0.12)' }: { text: string; color?: string; bg?: string }) {
  return <View style={[s.chip, { backgroundColor: bg }]}><Text style={{ color, fontSize: 11, fontWeight: '800', letterSpacing: 0.6 }}>{text}</Text></View>;
}

export const s = StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 },
  h: { color: C.ink, fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase' },
  p: { color: C.mute, fontSize: 14, lineHeight: 20 },
  btn: { minHeight: 48, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 16, fontWeight: '800' },
  chip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
});
