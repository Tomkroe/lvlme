/** Shop: Outfits mit Münzen kaufen und anziehen. Zuständig: app-ui. */
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/state/AppState.tsx';
import { Avatar } from '../../src/avatar/Avatar.tsx';
import { COINS, COIN_NAME, SHOP_ITEMS, isOwned } from '../../src/game/shop.ts';
import { confirm, notify } from '../../src/ui/confirm.ts';
import { Button, Card, H, P } from '../../src/ui/components.tsx';
import { C, F } from '../../src/ui/theme.ts';
import type { BodyId } from '../../src/types.ts';

export default function Shop() {
  const app = useApp();
  const insets = useSafeAreaInsets();
  const mood = app.today?.mood ?? 'awake';

  const buy = async (id: number, name: string, price: number) => {
    if (app.coins < price) { notify('Zu wenig ' + COIN_NAME, `Dir fehlen noch ${price - app.coins} ${COIN_NAME}. Du bekommst welche für aktive Tage, Level-ups und erreichte Ziele.`); return; }
    if (!(await confirm(`${name} kaufen?`, `Das kostet ${price} ${COIN_NAME}. Du hast danach ${app.coins - price}.`, 'Kaufen', false))) return;
    const r = await app.buyOutfit(id);
    if (r === 'ok') { await app.setBody(id as BodyId); }
    else notify('Kauf nicht möglich', r === 'poor' ? 'Zu wenig ' + COIN_NAME + '.' : 'Das hast du schon.');
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

      <Card>
        <H>{COIN_NAME} verdienen</H>
        <P>• Jeder abgeschlossene Tag: +{COINS.restDay} {COIN_NAME}, an aktiven Tagen +{COINS.activeDay}. Ruhetage zählen auch.</P>
        <P>• Level-up: +{COINS.level} je Level, bei einer neuen Verwandlung zusätzlich +{COINS.stage}.</P>
        <P>• Tagesziele: +{COINS.goal} je erreichtem Ziel, +{COINS.allGoals} extra, wenn du alle schaffst.</P>
        <P>• Langzeitziele: einmalig {COINS.longGoalPerXp * 100} % ihrer XP als {COIN_NAME}.</P>
        <P style={{ fontSize: 12 }}>Du kannst {COIN_NAME} nicht verlieren. Gutgeschrieben werden sie, wenn der Tag abgeschlossen ist.</P>
      </Card>

      <Card>
        <H>Outfits</H>
        {SHOP_ITEMS.map(item => {
          const owned = isOwned(app.progress, item.id);
          const worn = app.body === item.id;
          return (
            <View key={item.id} style={st.item}>
              <Avatar stage={app.stage} mood={mood} hair={app.hair} body={item.id} size={78} still id={`shop${item.id}`} />
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={st.itemName}>{item.name}</Text>
                <Text style={st.meta}>{item.price === 0 ? 'Gratis' : owned ? 'Gekauft' : `${item.price} ${COIN_NAME}`}</Text>
                {owned ? (
                  <Button title={worn ? 'Angezogen' : 'Anziehen'} kind="ghost" disabled={worn} onPress={() => { app.setBody(item.id as BodyId); }} style={{ minHeight: 40 }} />
                ) : (
                  <Button title={`Kaufen · ${item.price}`} onPress={() => buy(item.id, item.name, item.price)} style={{ minHeight: 40, opacity: app.coins < item.price ? 0.55 : 1 }}
                    accessibilityHint={app.coins < item.price ? `Dir fehlen ${item.price - app.coins} ${COIN_NAME}` : undefined} />
                )}
              </View>
            </View>
          );
        })}
        <P style={{ fontSize: 12 }}>Ein Outfit ersetzt den Körpertyp, solange du es trägst. Neue Kleidung kommt nach und nach dazu.</P>
      </Card>
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
});
