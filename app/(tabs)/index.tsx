/** Avatar-Startseite: Szene, HUD, Sprechblase, Ringanzeigen, XP, Teilen. Zuständig: app-ui. */
import React, { useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useApp } from '../../src/state/AppState.tsx';
import { MOOD_TEXT, STAGES, xpNeeded } from '../../src/game/rules.ts';
import { Avatar, AVATAR_FEET, AVATAR_RATIO } from '../../src/avatar/Avatar.tsx';
import { Scene } from '../../src/ui/Scene.tsx';
import { Bar, Button, Card, Chip, LevelRing, P, Ring } from '../../src/ui/components.tsx';
import { C, F, energyColor, fmt } from '../../src/ui/theme.ts';
import { shareCard } from '../../src/share/index.ts';

export default function Home() {
  const app = useApp();
  const { width: W, height: Hs } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);
  const [shareErr, setShareErr] = useState<string | null>(null);

  const mood = app.today?.mood ?? 'awake';
  const sceneH = Math.round(Math.min(Math.max(Hs * 0.56, 380), 520));
  // Szene: viewBox 390×452, „slice“ unten ausgerichtet → gleiche Rechnung für die Avatar-Position
  const k = Math.max(W / 390, sceneH / 452);
  const offX = (W - 390 * k) / 2;
  const avSize = Math.min(236 * k, W * 0.66);
  const avH = avSize * AVATAR_RATIO;
  const avLeft = offX + 222 * k - avSize / 2;
  const grassTop = sceneH - (452 - 398) * k;
  const avTop = grassTop - avH * AVATAR_FEET;

  const need = xpNeeded(app.progress.level);
  const name = app.name || 'Du';
  const warn = app.today?.overtraining ?? false;
  const nextStage = STAGES[app.stage + 1];

  const onShare = async () => {
    setShareErr(null);
    try {
      await shareCard(cardRef, `Mein LvlMe-Kämpfer: Level ${app.progress.level}, ${STAGES[app.stage].name}, Kampfkraft ${fmt(app.power)}`);
    } catch {
      setShareErr('Teilen hat gerade nicht geklappt. Versuch es gleich noch einmal.');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={app.loading} onRefresh={app.refresh} tintColor="#fff" />}
    >
      <View style={{ height: sceneH }}>
        {/* Teilbare Karte: Szene mit Avatar und HUD – ohne Sprechblase, die verrät die Tagesform */}
        <View ref={cardRef} collapsable={false} style={[StyleSheet.absoluteFill, { overflow: 'hidden', backgroundColor: C.bg }]}>
          <Scene mood={mood} id="home" />
          <View style={{ position: 'absolute', left: avLeft, top: avTop }}>
            <Avatar stage={app.stage} mood={mood} hair={app.hair} body={app.body} size={avSize} id="me" />
          </View>

          <View style={[st.hud, { top: insets.top + 8 }]}>
            <View style={[st.glass, st.who]}>
              <LevelRing frac={app.progress.xp / need} level={app.progress.level} />
              <View style={{ gap: 2 }}>
                <Text style={st.name} numberOfLines={1}>{name}</Text>
                <Chip text={STAGES[app.stage].name.toUpperCase()} />
              </View>
            </View>
            <View style={[st.glass, st.power]} accessible accessibilityLabel={`Kampfkraft ${fmt(app.power)}`}>
              <Text style={st.powLabel}>KAMPFKRAFT</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Svg width={12} height={15} viewBox="0 0 13 16"><Path d="M8 0 L0 9 H5.5 L4 16 L13 6 H7.5Z" fill="#7fe3ff" /></Svg>
                <Text style={[st.powVal, F.num]}>{fmt(app.power)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Sprechblase liegt über der Karte, gehört aber nicht zum geteilten Bild */}
        <View style={[st.bubble, { top: insets.top + 76 }, warn && { backgroundColor: '#ffd84d' }]} accessibilityLiveRegion="polite">
          <Text style={[st.bubbleLabel, warn && { color: '#6a4b00' }]}>{warn ? 'Achtung: Übertraining' : MOOD_TEXT[mood].label}</Text>
          <Text style={st.bubbleText}>
            {warn ? 'Hohe Belastung bei wenig Erholung. Heute gibt es keinen Bonus, gönn dir Ruhe.' : app.today ? MOOD_TEXT[mood].text : 'Ich warte auf deine Daten aus Apple Health.'}
          </Text>
        </View>
      </View>

      {/* Sheet */}
      <View style={st.sheet}>
        <View style={st.grab} />
        {app.error && <Card style={{ borderColor: C.warn }}><P style={{ color: C.ink }}>{app.error}</P></Card>}

        {app.today ? (
          <View style={st.rings}>
            <Ring frac={app.today.energy / 100} color={energyColor(app.today.energy)} value={String(app.today.energy)} unit="PROZENT" label="Energie" />
            <Ring frac={app.today.strain / 21} color={C.sky} value={app.today.strain.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} unit="VON 21" label="Belastung" />
            <Ring frac={app.today.sleep / 100} color={C.violet} value={String(app.today.sleep)} unit="PROZENT" label="Schlaf" />
          </View>
        ) : !app.loading && (
          <Card>
            <P style={{ color: C.ink, fontWeight: '700' }}>Noch keine Daten für heute</P>
            <P>Trag deine Apple Watch oder nimm dein iPhone mit, dann füllen sich Energie, Belastung und Schlaf. Zum Aktualisieren nach unten ziehen.</P>
          </Card>
        )}

        <View style={{ gap: 6 }}>
          <View style={st.row}>
            <Text style={st.xpTitle}>Level {app.progress.level} → {app.progress.level + 1}</Text>
            <Text style={[st.xpNums, F.num]}>{app.progress.xp} / {need} XP</Text>
          </View>
          <Bar frac={app.progress.xp / need} />
        </View>

        {app.today && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip text={`Heute +${app.today.xp} XP`} color={C.ki} bg="rgba(255,138,31,0.14)" />
            {!warn && app.today.recovery >= 67 && <Chip text="+25 % Erholungsbonus" color={C.good} bg="rgba(79,224,138,0.14)" />}
            {warn && <Chip text="Kein Bonus heute" color={C.warn} bg="rgba(255,204,61,0.14)" />}
          </View>
        )}
        {nextStage && (
          <P>Nächste Verwandlung: <Text style={{ color: C.ink, fontWeight: '800' }}>{nextStage.name}</Text> ab Level {nextStage.level}</P>
        )}
        <P style={{ fontSize: 12 }}>Heutige XP werden morgen früh gutgeschrieben, wenn der Tag abgeschlossen ist.</P>

        <Button title="Avatar teilen" kind="ghost" onPress={onShare} accessibilityHint="Öffnet das Teilen-Menü mit einem Bild deines Avatars" />
        {shareErr && <P style={{ color: C.bad }}>{shareErr}</P>}
      </View>
    </ScrollView>
  );
}

const st = StyleSheet.create({
  hud: { position: 'absolute', left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  glass: { backgroundColor: 'rgba(9,13,30,0.55)', borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderRadius: 20 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 5, paddingRight: 12, flexShrink: 1 },
  name: { color: '#fff', fontWeight: '800', fontSize: 15, maxWidth: 140 },
  power: { paddingHorizontal: 13, paddingVertical: 7, alignItems: 'flex-end' },
  powLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9.5, letterSpacing: 1.6, fontWeight: '700' },
  powVal: { color: '#fff', fontSize: 22, textShadowColor: 'rgba(63,208,255,0.8)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
  bubble: { position: 'absolute', left: 12, maxWidth: 170, backgroundColor: '#fff', borderColor: C.outline, borderWidth: 2.5, borderRadius: 18, paddingHorizontal: 11, paddingVertical: 7 },
  bubbleLabel: { color: '#6b5f84', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  bubbleText: { color: C.outline, fontSize: 13, fontWeight: '600', lineHeight: 17 },
  sheet: { marginTop: -24, backgroundColor: C.sheet, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, gap: 16 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: C.line },
  rings: { flexDirection: 'row', justifyContent: 'space-around' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  xpTitle: { color: C.ink, fontWeight: '800', fontSize: 16 },
  xpNums: { color: C.mute, fontSize: 13 },
});
