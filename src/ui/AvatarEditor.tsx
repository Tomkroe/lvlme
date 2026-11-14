/** Schnell-Editor für den Charakter: öffnet sich beim Antippen des Avatars auf der Startseite. Zuständig: app-ui. */
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppState.tsx';
import { Avatar } from '../avatar/Avatar.tsx';
import { BODIES, HAIRSTYLES } from '../avatar/assets.ts';
import { isOwned, itemsOf } from '../game/shop.ts';
import { Scene } from './Scene.tsx';
import { C } from './theme.ts';

export function AvatarEditor({ visible, onClose, onWidgets }: { visible: boolean; onClose: () => void; onWidgets: () => void }) {
  const app = useApp();
  const auras = itemsOf('aura').filter(i => isOwned(app.progress, i.id));
  const scenes = itemsOf('scene').filter(i => isOwned(app.progress, i.id));
  const bodies = (kind: 'type' | 'outfit') => BODIES.filter(b => b.kind === kind && isOwned(app.progress, b.id));
  const row = (title: string, children: React.ReactNode) => (
    <View style={{ gap: 6 }}>
      <Text style={st.title}>{title}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 2 }}>{children}</ScrollView>
    </View>
  );
  const opt = (key: string, on: boolean, label: string, onPress: () => void, thumb: React.ReactNode) => (
    <Pressable key={key} onPress={onPress} accessibilityRole="radio" accessibilityState={{ selected: on }} accessibilityLabel={label} style={[st.opt, on && st.optOn]}>
      {thumb}
      <Text style={[st.optText, on && { color: C.ki }]} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={st.backdrop} onPress={onClose} accessibilityLabel="Schließen">
        <Pressable style={st.sheet} onPress={() => {}}>
          <Text style={st.head}>Dein Charakter</Text>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ gap: 14 }}>
            {row('Frisur', HAIRSTYLES.map(h => opt(`h${h.id}`, h.id === app.hair, h.name, () => { app.setHair(h.id); },
              <Avatar stage={app.stage} mood="awake" hair={h.id} body={app.body} size={52} still id={`ehair${h.id}`} />)))}
            {row('Körpertyp', bodies('type').map(b => opt(`b${b.id}`, b.id === app.body, b.name, () => { if (app.autoBody) app.setAutoBody(false); app.setBody(b.id); },
              <Avatar stage={app.stage} mood="awake" hair={app.hair} body={b.id} size={52} still id={`ebody${b.id}`} />)))}
            {row('Outfit', bodies('outfit').map(b => opt(`o${b.id}`, b.id === app.body, b.name, () => { app.setBody(b.id); },
              <Avatar stage={app.stage} mood="awake" hair={app.hair} body={b.id} size={52} still id={`eoutfit${b.id}`} />)))}
            {row('Aura', [
              opt('a-none', !app.cosmetics.aura, 'Stufenfarbe', () => { app.equipCosmetic('aura', null); }, <View style={[st.dot, { backgroundColor: C.card2 }]} />),
              ...auras.map(a => opt(a.id as string, app.cosmetics.aura === a.id, a.name, () => { app.equipCosmetic('aura', a.id as string); }, <View style={[st.dot, { backgroundColor: a.color }]} />)),
            ])}
            {row('Szene', [
              opt('s-none', !app.cosmetics.scene, 'Standard', () => { app.equipCosmetic('scene', null); }, <View style={[st.dot, { backgroundColor: C.card2 }]} />),
              ...scenes.map(s => opt(s.id as string, app.cosmetics.scene === s.id, s.name, () => { app.equipCosmetic('scene', s.id as string); },
                <View style={[st.dot, { overflow: 'hidden' }]}><Scene mood="awake" id={`escene${s.id}`} theme={String(s.id).replace('scene-', '')} /></View>)),
            ])}
            <Pressable onPress={() => { onClose(); router.push('/shop'); }} accessibilityRole="button"><Text style={st.link}>Mehr im Shop</Text></Pressable>
          </ScrollView>
          <View style={st.btns}>
            <Pressable onPress={() => { onClose(); onWidgets(); }} accessibilityRole="button" style={st.btn}><Text style={st.btnText}>Widgets anpassen</Text></Pressable>
            <Pressable onPress={onClose} accessibilityRole="button" style={[st.btn, { backgroundColor: C.ki, borderColor: C.ki }]}><Text style={[st.btnText, { color: C.kiInk }]}>Fertig</Text></Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { alignSelf: 'center', width: '100%', maxWidth: 520, backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderColor: C.line, padding: 16, gap: 12 },
  head: { color: C.ink, fontSize: 18, fontWeight: '800' },
  title: { color: C.mute, fontSize: 12, fontWeight: '800', letterSpacing: 1.1, textTransform: 'uppercase' },
  opt: { alignItems: 'center', gap: 4, padding: 6, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, backgroundColor: C.card2, width: 78 },
  optOn: { borderColor: C.ki, backgroundColor: 'rgba(255,138,31,0.12)' },
  optText: { color: C.mute, fontSize: 11, fontWeight: '700' },
  dot: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, borderColor: C.line },
  link: { color: C.sky, fontWeight: '700', fontSize: 14, textDecorationLine: 'underline', paddingVertical: 4 },
  btns: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, minHeight: 46, borderRadius: 14, borderWidth: 1.5, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: C.ink, fontWeight: '800', fontSize: 15 },
});
