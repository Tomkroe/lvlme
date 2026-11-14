/** Avatar-Startseite: Szene, HUD, Sprechblase, Ringanzeigen, XP, Teilen. Zuständig: app-ui. */
import React, { useRef, useState } from 'react';
import { Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../../src/state/AppState.tsx';
import { STAGES, xpNeeded } from '../../src/game/rules.ts';
import { Avatar, AVATAR_FEET, AVATAR_RATIO } from '../../src/avatar/Avatar.tsx';
import { Scene } from '../../src/ui/Scene.tsx';
import { Bar, Button, Card, Chip, LevelRing, P, Ring } from '../../src/ui/components.tsx';
import { C, F, energyColor } from '../../src/ui/theme.ts';
import { shareCard } from '../../src/share/index.ts';
import { useScreenSize } from '../../src/ui/layout.ts';
import { ALL_GOALS_BONUS, goalDef, goalStatus, goalXp } from '../../src/game/goals.ts';
import { longGoalFrac, longGoalValue, rewardXp } from '../../src/game/longgoals.ts';

export default function Home() {
  const app = useApp();
  const { width: W, height: Hs } = useScreenSize();
  const insets = useSafeAreaInsets();
  const cardRef = useRef<React.ComponentRef<typeof View>>(null);
  const [shareErr, setShareErr] = useState<string | null>(null);

  const mood = app.today?.mood ?? 'awake';
  const sceneH = Math.round(Math.min(Math.max(Hs * 0.56, 380), 520));
  // Szene: viewBox 390×452, „slice“ unten ausgerichtet → gleiche Rechnung für die Avatar-Position
  const k = Math.max(W / 390, sceneH / 452);
  const offX = (W - 390 * k) / 2;
  // Der Kopf (Haarspitzen bei ca. 4 % der Bildhöhe) darf nie über den Szenenrand oder unter die HUD-Leiste ragen
  const grassTop = sceneH - (452 - 398) * k;
  const headTopFrac = 0.045;
  const minHeadTop = insets.top + 64;
  const maxAvH = (grassTop - minHeadTop) / (AVATAR_FEET - headTopFrac);
  const avSize = Math.max(120, Math.min(236 * k, W * 0.66, maxAvH / AVATAR_RATIO));
  const avH = avSize * AVATAR_RATIO;
  const avLeft = offX + 222 * k - avSize / 2;
  const avTop = grassTop - avH * AVATAR_FEET;

  const need = xpNeeded(app.progress.level);
  const name = app.name || 'Du';
  const warn = app.today?.overtraining ?? false;
  const nextStage = STAGES[app.stage + 1];
  const openLong = app.longGoals.filter(g => !g.doneAt).slice(0, 3);
  const goalCtx = { weightKg: app.bodyStats?.weightKg };
  const doneGoal = app.goalEvents[0];
  const goalRows = app.todayMetrics ? goalStatus(app.todayMetrics, app.goals) : [];
  const goalBonus = app.todayMetrics ? goalXp(app.todayMetrics, app.goals).xp : 0;
  const fmtGoal = (id: string, v: number | null) => (v == null ? '–' : id === 'sleep' ? v.toLocaleString('de-DE', { maximumFractionDigits: 1 }) : Math.round(v).toLocaleString('de-DE'));

  const onShare = async () => {
    setShareErr(null);
    try {
      await shareCard(cardRef, `Mein LvlMe-Kämpfer: Level ${app.progress.level}, ${STAGES[app.stage].name}`);
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
            <View style={[st.glass, st.coins]} accessible accessibilityLabel={`${app.coins} Münzen`}>
              <Text style={st.coinsLabel}>MÜNZEN</Text>
              <Text style={[st.coinsVal, F.num]}>{app.coins.toLocaleString('de-DE')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Sheet */}
      <View style={st.sheet}>
        {Platform.OS !== 'ios' && app.source === 'demo' && (
          <Card><P style={{ color: C.ink }}>Du siehst Beispieldaten. Melde dich unter Profil an, um die Werte von deinem iPhone zu sehen.</P></Card>
        )}
        {warn && (
          <Card style={{ borderColor: C.warn }}>
            <Text style={{ color: C.warn, fontWeight: '900', fontSize: 15 }}>Achtung: Übertraining</Text>
            <P style={{ color: C.ink }}>Hohe Belastung bei wenig Erholung. Heute gibt es keinen Bonus, gönn dir Ruhe.</P>
          </Card>
        )}
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
            <P>{Platform.OS === 'ios'
              ? 'Trag deine Apple Watch oder nimm dein iPhone mit, dann füllen sich Energie, Belastung und Schlaf. Zum Aktualisieren nach unten ziehen.'
              : 'Noch keine Werte in deinem Konto. Schalte in der iPhone-App unter Profil „Mit dem PC synchronisieren“ ein und öffne dort einmal die App.'}</P>
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
        {doneGoal && (
          <Card style={{ borderColor: C.good }}>
            <Text style={{ color: C.good, fontWeight: '900', fontSize: 16 }}>Ziel erreicht!</Text>
            <P style={{ color: C.ink }}>{doneGoal.title}: {doneGoal.target.toLocaleString('de-DE')} {doneGoal.unit}{(doneGoal.xp ?? 0) > 0 ? ` · +${doneGoal.xp} XP` : ' · diesmal ohne XP (eigene Ziele geben höchstens einmal pro Woche XP)'}</P>
            <Button title="Weiter" kind="ghost" onPress={app.dismissGoalEvent} />
          </Card>
        )}
        {goalRows.length > 0 && (
          <Card>
            <View style={st.row}>
              <Text style={st.xpTitle}>Tagesziele</Text>
              <Text style={[st.xpNums, F.num]}>{goalBonus > 0 ? `+${goalBonus} XP` : 'Bonus-XP'}</Text>
            </View>
            {goalRows.map(g => {
              const d = goalDef(g.id);
              return (
                <View key={g.id} style={{ gap: 4 }} accessible accessibilityLabel={`${d.label}: ${fmtGoal(g.id, g.value)} von ${fmtGoal(g.id, g.target)} ${d.unit}${g.hit ? ', erreicht' : ''}`}>
                  <View style={st.row}>
                    <Text style={{ color: g.hit ? C.good : C.ink, fontWeight: '700', fontSize: 14 }}>{g.hit ? '✓ ' : ''}{d.label}</Text>
                    <Text style={[st.xpNums, F.num]}>{fmtGoal(g.id, g.value)} / {fmtGoal(g.id, g.target)} {d.unit} · +{d.xp} XP</Text>
                  </View>
                  <Bar frac={g.frac} color={g.hit ? C.good : C.sky} height={8} />
                </View>
              );
            })}
            {goalRows.length >= 2 && <P style={{ fontSize: 12 }}>Alle Ziele an einem Tag: +{ALL_GOALS_BONUS} XP extra. Verfehlte Ziele kosten nichts, Ruhetage sind in Ordnung. Ziele änderst du im Profil.</P>}
          </Card>
        )}
        {openLong.length > 0 && (
          <Card>
            <Text style={st.xpTitle}>Langzeitziele</Text>
            {openLong.map(g => (
              <View key={g.id} style={{ gap: 4 }} accessible accessibilityLabel={`${g.title}: ${Math.round(longGoalValue(g, app.progress, goalCtx))} von ${g.target} ${g.unit}`}>
                <View style={st.row}>
                  <Text style={{ color: C.ink, fontWeight: '700', fontSize: 14, flexShrink: 1 }} numberOfLines={1}>{g.title}</Text>
                  <Text style={[st.xpNums, F.num]}>{Math.round(longGoalValue(g, app.progress, goalCtx)).toLocaleString('de-DE')} / {g.target.toLocaleString('de-DE')} {g.unit} · +{rewardXp(g)} XP</Text>
                </View>
                <Bar frac={longGoalFrac(g, app.progress, goalCtx)} color={C.violet} height={8} />
              </View>
            ))}
          </Card>
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
  coins: { paddingHorizontal: 13, paddingVertical: 7, alignItems: 'flex-end' },
  coinsLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9.5, letterSpacing: 1.6, fontWeight: '700' },
  coinsVal: { color: C.warn, fontSize: 22 },
  name: { color: '#fff', fontWeight: '800', fontSize: 15, maxWidth: 140 },
  sheet: { marginTop: -24, backgroundColor: C.sheet, borderTopLeftRadius: 26, borderTopRightRadius: 26, paddingHorizontal: 18, paddingTop: 10, gap: 16 },
  rings: { flexDirection: 'row', justifyContent: 'space-around' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  xpTitle: { color: C.ink, fontWeight: '800', fontSize: 16 },
  xpNums: { color: C.mute, fontSize: 13 },
});
