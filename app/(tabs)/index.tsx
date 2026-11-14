/** Avatar-Startseite: Szene, HUD und anpassbare Widgets rund um den Avatar, Teilen. Zuständig: app-ui. */
import React, { useRef, useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/state/AppState.tsx';
import { STAGES, xpNeeded } from '../../src/game/rules.ts';
import { Avatar, AVATAR_FEET, AVATAR_RATIO } from '../../src/avatar/Avatar.tsx';
import { Scene } from '../../src/ui/Scene.tsx';
import { shopItem } from '../../src/game/shop.ts';
import { Chip, LevelRing } from '../../src/ui/components.tsx';
import { Tile, TILE_H, WidgetPicker, widgetView } from '../../src/ui/HomeWidgets.tsx';
import { SLOTS, type SlotId } from '../../src/game/widgets.ts';
import { C, F } from '../../src/ui/theme.ts';
import { shareCard } from '../../src/share/index.ts';
import { useScreenSize } from '../../src/ui/layout.ts';

export default function Home() {
  const app = useApp();
  const { width: W, height: Hs } = useScreenSize();
  const insets = useSafeAreaInsets();
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);
  const [shareErr, setShareErr] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [pickSlot, setPickSlot] = useState<SlotId | null>(null);
  const [areaH, setAreaH] = useState(0);

  const mood = app.today?.mood ?? 'awake';
  const auraColor = app.cosmetics.aura ? shopItem(app.cosmetics.aura)?.color : undefined;
  const sceneTheme = app.cosmetics.scene?.replace('scene-', '');
  // Die Szene füllt den ganzen Bildschirm über der Tab-Leiste
  const sceneH = Math.round(areaH || Math.min(Math.max(Hs * 0.8, 480), 760));
  // Szene: viewBox 390×452, „slice“ unten ausgerichtet → gleiche Rechnung für die Avatar-Position
  const k = Math.max(W / 390, sceneH / 452);
  const offX = (W - 390 * k) / 2;
  // Der Kopf (Haarspitzen bei ca. 4 % der Bildhöhe) darf nie über den Szenenrand oder unter die HUD-Leiste ragen
  const grassTop = sceneH - (452 - 398) * k;
  const headTopFrac = 0.045;
  const minHeadTop = insets.top + 64;
  const maxAvH = (grassTop - minHeadTop) / (AVATAR_FEET - headTopFrac);
  // Etwas schmaler, damit links und rechts Platz für Widgets bleibt
  const avSize = Math.max(120, Math.min(236 * k, W * 0.5, maxAvH / AVATAR_RATIO));
  const avH = avSize * AVATAR_RATIO;
  const avLeft = offX + 222 * k - avSize / 2;
  const avTop = grassTop - avH * AVATAR_FEET;

  // Widget-Spalten: drei Plätze links, drei rechts, über die Höhe des Avatars verteilt
  const tileW = Math.round(Math.max(66, Math.min(96, (W - avSize) / 2 - 8)));
  const y0 = Math.max(minHeadTop + 14, avTop + avH * 0.04);
  const y1 = Math.max(y0, grassTop - TILE_H - 8);
  const slotY = (n: number) => y0 + ((y1 - y0) * n) / 2;
  const slotPos = (s: SlotId) => {
    const row = Number(s[1]) - 1;
    return s[0] === 'l' ? { left: 8, top: slotY(row) } : { right: 8, top: slotY(row) };
  };

  const need = xpNeeded(app.progress.level);
  const name = app.name || 'Du';
  const warn = app.today?.overtraining ?? false;
  const doneGoal = app.goalEvents[0];

  const onShare = async () => {
    setShareErr(null);
    try {
      await shareCard(cardRef, `Mein LvlMe-Kämpfer: Level ${app.progress.level}, ${STAGES[app.stage].name}`);
    } catch {
      setShareErr('Teilen hat gerade nicht geklappt. Versuch es gleich noch einmal.');
    }
  };

  const notes: React.ReactNode[] = [];
  if (Platform.OS !== 'ios' && app.source === 'demo') notes.push(<Text key="demo" style={st.noteText}>Du siehst Beispieldaten. Melde dich unter Profil an, um die Werte von deinem iPhone zu sehen.</Text>);
  if (warn) notes.push(<Text key="warn" style={[st.noteText, { color: C.warn }]}>Übertraining: hohe Belastung bei wenig Erholung. Heute gibt es keinen Bonus, gönn dir Ruhe.</Text>);
  if (app.error) notes.push(<Text key="err" style={st.noteText}>{app.error}</Text>);
  if (!app.today && !app.loading && !app.error) notes.push(<Text key="nodata" style={st.noteText}>{Platform.OS === 'ios' ? 'Noch keine Daten für heute. Zum Aktualisieren nach unten ziehen.' : 'Noch keine Werte in deinem Konto. Schalte in der iPhone-App unter Profil „Mit dem PC synchronisieren“ ein.'}</Text>);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }} onLayout={e => setAreaH(e.nativeEvent.layout.height)}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ height: sceneH }}
        scrollEnabled={!editing}
        refreshControl={<RefreshControl refreshing={app.loading} onRefresh={app.refresh} tintColor="#fff" />}
      >
        <View style={{ height: sceneH }}>
          {/* Teilbare Karte: nur Szene, Avatar und HUD – keine Widgets, die zeigen eigene Werte */}
          <View ref={cardRef} collapsable={false} style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: C.bg }]}>
            <Scene mood={mood} id="home" theme={sceneTheme} />
            <View style={{ position: 'absolute', left: avLeft, top: avTop }}>
              <Avatar stage={app.stage} mood={mood} hair={app.hair} body={app.body} auraColor={auraColor} size={avSize} id="me" />
            </View>
            <View style={[st.hud, { top: insets.top + 8 }]}>
              <View style={[st.glass, st.who]}>
                <LevelRing frac={app.progress.xp / need} level={app.progress.level} />
                <View style={{ gap: 2 }}>
                  <Text style={st.name} numberOfLines={1}>{name}</Text>
                  <Chip text={STAGES[app.stage].name.toUpperCase()} />
                </View>
              </View>
              <View style={[st.glass, st.coins]} accessible accessibilityLabel={`${app.coins} Münzen`}>
                <Text style={st.coinsLabel}>MÜNZEN</Text>
                <Text style={[st.coinsVal, F.num]}>{app.coins.toLocaleString('de-DE')}</Text>
              </View>
            </View>
          </View>

          {/* Widgets rund um den Avatar */}
          {SLOTS.map(s => {
            const id = app.widgetLayout[s];
            return (
              <View key={s} style={[{ position: 'absolute' }, slotPos(s)]}>
                <Tile view={id ? widgetView(id, app) : null} width={tileW} editing={editing} onEdit={() => setPickSlot(s)} />
              </View>
            );
          })}

          {doneGoal && (
            <View style={[st.note, st.goalNote, { top: insets.top + 66 }]}>
              <Text style={[st.noteText, { color: C.good, fontWeight: '900' }]}>Ziel erreicht!</Text>
              <Text style={st.noteText}>{doneGoal.title}: {doneGoal.target.toLocaleString('de-DE')} {doneGoal.unit}{(doneGoal.xp ?? 0) > 0 ? ` · +${doneGoal.xp} XP` : ''}</Text>
              <Pressable onPress={app.dismissGoalEvent} accessibilityRole="button"><Text style={[st.noteText, { color: C.sky, fontWeight: '800' }]}>Weiter</Text></Pressable>
            </View>
          )}

          <View style={st.bottom}>
            {notes.length > 0 && !editing && <View style={st.note}>{notes}</View>}
            {shareErr && <View style={st.note}><Text style={st.noteText}>{shareErr}</Text></View>}
            {editing && <View style={st.note}><Text style={st.noteText}>Tippe auf eine Kachel oder ein „+“, um zu wählen, was dort stehen soll.</Text></View>}
            <View style={st.btnRow}>
              {editing ? (
                <>
                  <Pressable onPress={() => app.resetWidgets()} accessibilityRole="button" style={[st.glass, st.pill]}><Text style={st.pillText}>Standard</Text></Pressable>
                  <Pressable onPress={() => setEditing(false)} accessibilityRole="button" style={[st.pill, { backgroundColor: C.ki }]}><Text style={[st.pillText, { color: C.kiInk }]}>Fertig</Text></Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityHint="Widgets rund um den Avatar hinzufügen, ändern oder entfernen" style={[st.glass, st.pill]}><Text style={st.pillText}>Anpassen</Text></Pressable>
                  <Pressable onPress={onShare} accessibilityRole="button" accessibilityHint="Öffnet das Teilen-Menü mit einem Bild deines Avatars" style={[st.glass, st.pill]}><Text style={st.pillText}>Teilen</Text></Pressable>
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <WidgetPicker slot={pickSlot} layout={app.widgetLayout} onClose={() => setPickSlot(null)}
        onPick={id => { if (pickSlot) app.setWidget(pickSlot, id); setPickSlot(null); }} />
    </View>
  );
}

const st = StyleSheet.create({
  hud: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  glass: { backgroundColor: 'rgba(9,13,30,0.55)', borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderRadius: 20 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 5, paddingRight: 12, flexShrink: 1 },
  coins: { paddingHorizontal: 13, paddingVertical: 7, alignItems: 'flex-end' },
  coinsLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9.5, letterSpacing: 1.6, fontWeight: '700' },
  coinsVal: { color: C.warn, fontSize: 22 },
  name: { color: '#fff', fontWeight: '800', fontSize: 15, maxWidth: 140 },
  bottom: { position: 'absolute', left: 12, right: 12, bottom: 12, gap: 8 },
  btnRow: { flexDirection: 'row', justifyContent: 'center', gap: 10 },
  pill: { minHeight: 40, paddingHorizontal: 20, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  pillText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  note: { backgroundColor: 'rgba(9,13,30,0.78)', borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderRadius: 14, padding: 10, gap: 4 },
  goalNote: { position: 'absolute', left: 12, right: 12, borderColor: C.good },
  noteText: { color: C.ink, fontSize: 12.5, lineHeight: 17 },
});
