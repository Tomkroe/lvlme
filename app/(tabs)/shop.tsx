/** Shop: Outfits mit Münzen kaufen und anziehen. Zuständig: app-ui. */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/state/AppState.tsx';
import { Avatar } from '../../src/avatar/Avatar.tsx';
import { COINS, COIN_NAME, isOwned, itemsOf, type ShopItem } from '../../src/game/shop.ts';
import { Scene } from '../../src/ui/Scene.tsx';
import { confirm, notify } from '../../src/ui/confirm.ts';
import { Button, P, Section } from '../../src/ui/components.tsx';
import { C, F } from '../../src/ui/theme.ts';
import type { BodyId } from '../../src/types.ts';

export default function Shop() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const mood = app.today?.mood ?? 'awake';

  const buy = async (item: ShopItem) => {
    const { price, name } = item;
    if (app.coins < price) { notify('Zu wenig ' + COIN_NAME, `Dir fehlen noch ${price - app.coins} ${COIN_NAME}. Du bekommst welche für aktive Tage, Level-ups und erreichte Ziele.`); return; }
    if (!(await confirm(`${name} kaufen?`, `Das kostet ${price} ${COIN_NAME}. Du hast danach ${app.coins - price}.`, 'Kaufen', false))) return;
    const r = await app.buyOutfit(item.id);
    if (r !== 'ok') { notify('Kauf nicht möglich', r === 'poor' ? 'Zu wenig ' + COIN_NAME + '.' : 'Das hast du schon.'); return; }
    if (item.kind === 'outfit') await app.setBody(item.id as BodyId);
    else await app.equipCosmetic(item.kind, item.id as string);
  };

  const row = (item: ShopItem) => {
    const owned = isOwned(app.progress, item.id);
    const worn = item.kind === 'outfit' ? app.body === item.id : app.cosmetics[item.kind] === item.id;
    const wear = () => (item.kind === 'outfit' ? app.setBody(item.id as BodyId) : app.equipCosmetic(item.kind, item.id as string));
    return (
      <View key={String(item.id)} style={st.item}>
        {item.kind === 'outfit' && <Avatar stage={app.stage} mood={mood} hair={app.hair} body={item.id as BodyId} size={78} still id={`shop${item.id}`} />}
        {item.kind === 'aura' && <Avatar stage={Math.max(1, app.stage)} mood="charged" hair={app.hair} body={app.body} auraColor={item.color} size={78} still id={`shop${item.id}`} />}
        {item.kind === 'scene' && (
          <View style={st.sceneThumb}><Scene mood="awake" id={`shop${item.id}`} theme={String(item.id).replace('scene-', '')} /></View>
        )}
        <View style={{ flex: 1, gap: 6 }}>
          <Text style={st.itemName}>{item.name}</Text>
          <Text style={st.meta}>{item.price === 0 ? 'Gratis' : owned ? 'Gekauft' : `${item.price} ${COIN_NAME}`}</Text>
          {owned ? (
            worn && item.kind !== 'outfit'
              ? <Button title="Ablegen" kind="ghost" onPress={() => { app.equipCosmetic(item.kind as 'aura' | 'scene', null); }} style={{ minHeight: 40 }} />
              : <Button title={worn ? 'Angezogen' : item.kind === 'outfit' ? 'Anziehen' : 'Anlegen'} kind="ghost" disabled={worn} onPress={() => { wear(); }} style={{ minHeight: 40 }} />
          ) : (
            <Button title={`Kaufen · ${item.price}`} onPress={() => buy(item)} style={{ minHeight: 40, opacity: app.coins < item.price ? 0.55 : 1 }}
              accessibilityHint={app.coins < item.price ? `Dir fehlen ${item.price - app.coins} ${COIN_NAME}` : undefined} />
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 32, gap: 14 }}>
      <View style={st.head}>
        <Text style={[st.title, F.display]}>Shop</Text>
        <View style={st.coinPill} accessible accessibilityLabel={`${app.coins} ${COIN_NAME}`}>
          <Text style={st.coinIcon}>●</Text>
          <Text style={[st.coinVal, F.num]}>{app.coins.toLocaleString('de-DE')}</Text>
        </View>
      </View>

      <Section title={`${COIN_NAME} verdienen`}>
        <P>• Jeder abgeschlossene Tag: +{COINS.restDay} {COIN_NAME}, an aktiven Tagen +{COINS.activeDay}. Ruhetage zählen auch.</P>
        <P>• Level-up: +{COINS.level} je Level, bei einer neuen Verwandlung zusätzlich +{COINS.stage}.</P>
        <P>• Tagesziele: +{COINS.goal} je erreichtem Ziel, +{COINS.allGoals} extra, wenn du alle schaffst.</P>
        <P>• Langzeitziele: einmalig {COINS.longGoalPerXp * 100} % ihrer XP als {COIN_NAME}.</P>
        <P style={{ fontSize: 12 }}>Du kannst {COIN_NAME} nicht verlieren. Gutgeschrieben werden sie, wenn der Tag abgeschlossen ist.</P>
      </Section>

      <Section title="Outfits" defaultOpen>
        {itemsOf('outfit').map(row)}
        <P style={{ fontSize: 12 }}>Ein Outfit ersetzt den Körpertyp, solange du es trägst. Neue Kleidung kommt nach und nach dazu.</P>
      </Section>

      <Section title="Aura-Farben">
        <P>Die Aura leuchtet in deiner Farbe, auf jeder Stufe. Nur du siehst sie, Freunde sehen weiter die Stufenfarbe.</P>
        {itemsOf('aura').map(row)}
      </Section>

      <Section title="Szenen">
        <P>Ein anderer Hintergrund für deine Startseite. Nur du siehst ihn.</P>
        {itemsOf('scene').map(row)}
      </Section>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: C.ink, fontSize: 32 },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,204,61,0.14)', borderColor: C.warn, borderWidth: 1.5, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  coinIcon: { color: C.warn, fontSize: 14 },
  coinVal: { color: C.warn, fontSize: 20 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.line },
  itemName: { color: C.ink, fontWeight: '800', fontSize: 16 },
  meta: { color: C.mute, fontSize: 13 },
  sceneThumb: { width: 78, height: 78, borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: C.line },
});
