/** Einfacher Regler mit Zahlenfeld, funktioniert auf iPhone und im Web (kein Zusatzpaket nötig). Zuständig: app-ui. */
import React, { useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { C, F } from './theme.ts';

interface Props {
  label: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  onDone?: (v: number) => void;
}

export function Slider({ label, unit, value, min, max, onChange, onDone }: Props) {
  const [w, setW] = useState(0);
  const wRef = useRef(0);
  const live = useRef(value);
  live.current = value;
  const props = useRef({ min, max, onChange, onDone });
  props.current = { min, max, onChange, onDone };

  const at = (x: number) => {
    const { min: lo, max: hi } = props.current;
    const f = Math.max(0, Math.min(1, x / Math.max(1, wRef.current)));
    return Math.round(lo + f * (hi - lo));
  };
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: e => { const v = at(e.nativeEvent.locationX); live.current = v; props.current.onChange(v); },
    onPanResponderMove: e => { const v = at(e.nativeEvent.locationX); live.current = v; props.current.onChange(v); },
    onPanResponderRelease: () => props.current.onDone?.(live.current),
  })).current;

  const step = (d: number) => {
    const v = Math.max(min, Math.min(max, value + d));
    onChange(v); onDone?.(v);
  };
  const frac = (value - min) / (max - min);

  return (
    <View style={s.wrap}>
      <View style={s.head}>
        <Text style={s.label}>{label}</Text>
        <View style={s.valRow}>
          <Pressable onPress={() => step(-1)} style={s.btn} accessibilityRole="button" accessibilityLabel={`${label} verringern`}><Text style={s.btnT}>−</Text></Pressable>
          <Text style={[s.val, F.num]} accessibilityLabel={`${label} ${value} ${unit}`}>{value} {unit}</Text>
          <Pressable onPress={() => step(1)} style={s.btn} accessibilityRole="button" accessibilityLabel={`${label} erhöhen`}><Text style={s.btnT}>+</Text></Pressable>
        </View>
      </View>
      <View style={s.touch} onLayout={e => { wRef.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); }} {...pan.panHandlers}
        accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value, text: `${value} ${unit}` }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={e => step(e.nativeEvent.actionName === 'increment' ? 1 : -1)}>
        <View style={s.track}><View style={[s.fill, { width: frac * w }]} /></View>
        <View style={[s.knob, { left: Math.max(0, frac * w - 12) }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { color: C.ink, fontSize: 14, fontWeight: '700' },
  valRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  val: { color: C.ki, fontSize: 16, minWidth: 74, textAlign: 'center' },
  btn: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card2, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  btnT: { color: C.ink, fontSize: 18, fontWeight: '800', lineHeight: 20 },
  touch: { height: 34, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  fill: { height: 8, backgroundColor: C.ki },
  knob: { position: 'absolute', top: 5, width: 24, height: 24, borderRadius: 12, backgroundColor: C.ink, borderWidth: 3, borderColor: C.ki },
});
