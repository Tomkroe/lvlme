/**
 * Kampf als Overlay: geteilter Bildschirm, VS, Ergebnis.
 * Der Ausgang ergibt sich aus der Kampfkraft beider Avatare plus etwas Glück (lokal berechnet, keine XP – siehe Übergabe).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../avatar/Avatar.tsx';
import { Button } from './components.tsx';
import { C, F, fmt } from './theme.ts';

export interface Fighter { name: string; stage: number; power: number }

export function FightModal({ me, foe, onClose }: { me: Fighter; foe: Fighter | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const [shown, setShown] = useState(false);
  const win = useMemo(() => {
    if (!foe) return false;
    const a = me.power * (0.85 + Math.random() * 0.3);
    const b = foe.power * (0.85 + Math.random() * 0.3);
    return a >= b;
  }, [foe, me.power]);

  useEffect(() => {
    setShown(false);
    if (!foe) return;
    const t = setTimeout(() => setShown(true), 1300);
    return () => clearTimeout(t);
  }, [foe]);

  if (!foe) return null;
  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View style={st.root}>
        <View style={StyleSheet.absoluteFill}>
          <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
            <Polygon points="0,0 62,0 38,100 0,100" fill="#2f73c9" />
            <Polygon points="62,0 100,0 100,100 38,100" fill="#c23a5e" />
          </Svg>
        </View>
        <View style={[st.foe, { top: insets.top + 20 }]}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={st.name}>{foe.name}</Text>
            <Text style={[st.pow, F.num]}>{fmt(foe.power)}</Text>
          </View>
          <Avatar stage={foe.stage} mood="charged" size={170} flip id="foe" />
        </View>
        <View style={[st.me, { bottom: insets.bottom + 20 }]}>
          <Avatar stage={me.stage} mood="charged" size={170} id="mefight" />
          <View>
            <Text style={st.name}>{me.name}</Text>
            <Text style={[st.pow, F.num]}>{fmt(me.power)}</Text>
          </View>
        </View>
        {!shown && <Text style={[st.vs, F.display]} accessibilityLabel="gegen">VS</Text>}
        {shown && (
          <View style={st.res} accessibilityLiveRegion="polite">
            <Text style={[st.resTitle, F.display, { color: win ? '#1d8a4a' : C.bad }]}>{win ? 'Sieg!' : 'Niederlage'}</Text>
            <Text style={st.resText}>
              {win ? `Du schlägst ${foe.name}.` : `${foe.name} war diesmal stärker. Guter Schlaf und ein harter Trainingstag, dann klappt die Revanche.`}
            </Text>
            <Button title="Weiter" onPress={onClose} style={{ alignSelf: 'center', minWidth: 140 }} />
          </View>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, justifyContent: 'center' },
  foe: { position: 'absolute', right: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  me: { position: 'absolute', left: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  name: { color: '#fff', fontWeight: '900', fontSize: 18 },
  pow: { color: '#fff', fontSize: 22 },
  vs: { alignSelf: 'center', fontSize: 84, color: '#fff', textShadowColor: C.outline, textShadowOffset: { width: 4, height: 4 }, textShadowRadius: 0 },
  res: { backgroundColor: '#fff', borderTopWidth: 4, borderBottomWidth: 4, borderColor: C.outline, paddingVertical: 18, paddingHorizontal: 20, gap: 10 },
  resTitle: { fontSize: 44, textAlign: 'center' },
  resText: { color: C.outline, textAlign: 'center', fontSize: 15, fontWeight: '600' },
});
