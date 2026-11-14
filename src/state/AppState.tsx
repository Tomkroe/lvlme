/**
 * App-Zustand. Zuständig: app-ui.
 * - Fortschritt (Progress) und Profil lokal in AsyncStorage
 * - Health-Daten der letzten 8 Tage über getHealthProvider(); Vortage werden automatisch verbucht
 * - Öffentlicher Avatarzustand geht an das Backend, wenn konfiguriert und angemeldet;
 *   die Tagesform (mood) nur, wenn shareMood an ist (Standard: aus); Frisur und Körper immer
 * - Der Kämpfername aus dem Onboarding wird nach Anmeldung und bei Änderung per setDisplayName gesetzt
 * - Sync iPhone ↔ PC (nur mit Einwilligung `cloudSync` auf dem iPhone): Tageswerte und Fortschritt gehen ins
 *   eigene Konto; die PC-/Web-Version liest sie von dort. Freunde sehen davon nichts.
 * Gesundheitsrohdaten werden sonst weder gespeichert noch gesendet noch geloggt.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { BodyId, CalorieGoal, CalorieTarget, DailyMetrics, DayScore, HairId, Progress, Sex } from '../types.ts';
import { DEFAULT_BODY, DEFAULT_HAIR } from '../avatar/assets.ts';
import { NEW_PROGRESS, awardXp, baselineFrom, bookDay, scoreDay, stageFor, toPublic } from '../game/rules.ts';
import { clampStats, maxWeightLossKg, suggestBody, type BodyStats } from '../game/body.ts';
import { DEFAULT_GOALS, goalXp, sanitizeGoals, type Goals } from '../game/goals.ts';
import { avgActiveKcal, calorieTarget, sanitizeAge, sanitizeCustom, sanitizeGoal, sanitizeSex } from '../game/calories.ts';
import { placeWidget, resolveLayout, DEFAULT_LAYOUT, type SlotId, type WidgetId, type WidgetLayout } from '../game/widgets.ts';
import { awardCoins } from '../game/shop.ts';
import { buyItem as buyShopItem, coinsOf, isOwned, longGoalCoins, shopItem } from '../game/shop.ts';

/** Angelegte Shop-Kosmetik (nur lokal): Aura-Farbe und Szene der Startseite, jeweils eine Shop-ID */
export interface Cosmetics { aura?: string; scene?: string }

export interface CalorieSettings {
  age?: number;
  sex?: Sex;
  useBodyFat?: boolean;
  goal?: CalorieGoal;
  /** Eigener Tageswert in kcal; bleibt, bis der Nutzer auf die Empfehlung zurücksetzt */
  custom?: number;
  noticeSeen?: boolean;
}
import { MAX_LONG_GOALS, checkLongGoals, newLongGoal, sanitizeLongGoals, type LongGoal, type LongGoalKind } from '../game/longgoals.ts';
import { getHealthProvider } from '../health/index.ts';
import * as social from '../social/api.ts';
import type { Me } from '../social/api.ts';

export interface LevelEvent {
  id: string;
  kind: 'level' | 'stage';
  level: number;
  stage: number;
}

interface Profile {
  name: string;
  onboarded: boolean;
  /** Tagesform mit Freunden teilen. Standard: aus (lässt Rückschlüsse auf Schlaf und Erholung zu). */
  shareMood: boolean;
  /** Frisur des Avatars (wird mit dem öffentlichen Avatar an Freunde veröffentlicht) */
  hair: HairId;
  /** Körpertyp oder Outfit des Avatars (wird mit dem öffentlichen Avatar an Freunde veröffentlicht) */
  body: BodyId;
  /** Größe, Gewicht, KFA: nur lokal, wird nie veröffentlicht oder synchronisiert */
  bodyStats?: BodyStats;
  /** Körpertyp automatisch aus den Körperwerten (nur mit Einwilligung; Freunde sehen dann die abgeleitete Figur) */
  autoBody?: boolean;
  /** Angelegte Aura-Farbe und Szene (lokal, nicht veröffentlicht) */
  cosmetics?: Cosmetics;
  /** Kalorienhaushalt (alles lokal, nie synchronisiert): Alter, Geschlecht, KFA verwenden, Ziel, eigener Wert, Hinweis gesehen */
  calorie?: CalorieSettings;
  /** Testphase: welche einmalige Münzen-Gutschrift schon verbucht wurde */
  testGrant?: string;
  testLevel?: boolean;
  /** Widgets der Startseite (lokal): Belegung der Plätze rund um den Avatar */
  widgets?: WidgetLayout;
  /** Selbst gewählte Tagesziele (lokal); fehlt das Feld, gelten die Standardziele */
  goals?: Goals;
  /** Langzeitziele (lokal); die XP daraus stecken im Fortschritt */
  longGoals?: LongGoal[];
  /** iPhone: Tageswerte und Fortschritt ins eigene Konto laden, damit der PC dasselbe zeigt. Standard: aus. */
  cloudSync: boolean;
}

export interface AppState {
  ready: boolean;
  loading: boolean;
  error: string | null;
  name: string;
  onboarded: boolean;
  shareMood: boolean;
  hair: HairId;
  body: BodyId;
  cloudSync: boolean;
  bodyStats: BodyStats | null;
  autoBody: boolean;
  setAutoBody: (on: boolean) => Promise<void>;
  goals: Goals;
  longGoals: LongGoal[];
  /** Neu erreichte Langzeitziele, die noch nicht angezeigt wurden */
  goalEvents: LongGoal[];
  dismissGoalEvent: () => void;
  addLongGoal: (kind: LongGoalKind, target: number, title?: string, unit?: string, current?: number) => Promise<'ok' | 'limit' | 'weight'>;
  removeLongGoal: (id: string) => Promise<void>;
  setLongGoalValue: (id: string, value: number) => Promise<void>;
  /** Heutige Rohwerte – nur zur Anzeige des Ziel-Fortschritts, werden nicht gespeichert */
  todayMetrics: DailyMetrics | null;
  signInMethod: 'apple' | 'email' | null;
  source: DailyMetrics['source'] | null;
  progress: Progress;
  today: DayScore | null;
  /** Schritte heute – nur zur Anzeige, wird nicht gespeichert */
  stepsToday: number;
  stage: number;
  me: Me | null;
  events: LevelEvent[];
  dismissEvent: () => void;
  refresh: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  finishOnboarding: () => Promise<void>;
  setShareMood: (on: boolean) => Promise<void>;
  setHair: (hair: HairId) => Promise<void>;
  setBody: (body: BodyId) => Promise<void>;
  /** `fromImport`: Werte aus Apple Health lösen keine Gewichtsziele aus (kein XP durch automatisch gelesenes Gewicht) */
  setBodyStats: (stats: BodyStats, opts?: { fromImport?: boolean }) => Promise<void>;
  /** Münzen und Shop */
  /** Kalorienhaushalt: Einstellungen, Empfehlung (null ohne gespeicherte Körperwerte) und aktive Kalorien */
  calorieSettings: { age: number; ageSet: boolean; sex: Sex; useBodyFat: boolean; goal: CalorieGoal; custom?: number; noticeSeen: boolean };
  calorie: CalorieTarget | null;
  activeKcalAvg: number | null;
  setCalorieSettings: (patch: Partial<CalorieSettings>) => Promise<void>;
  /** Gewicht, Größe, KFA aus Apple Health übernehmen (nur iPhone). 'none' = nichts gefunden */
  importBodyFromHealth: () => Promise<'ok' | 'none' | 'unavailable'>;
  /** Widgets der Startseite */
  widgetLayout: Record<SlotId, WidgetId | null>;
  setWidget: (slot: SlotId, id: WidgetId | null) => Promise<void>;
  resetWidgets: () => Promise<void>;
  coins: number;
  cosmetics: Cosmetics;
  buyOutfit: (id: number | string) => Promise<'ok' | 'owned' | 'poor' | 'unknown'>;
  equipCosmetic: (kind: 'aura' | 'scene', id: string | null) => Promise<void>;
  setGoals: (goals: Goals) => Promise<void>;
  setCloudSync: (on: boolean) => Promise<void>;
  setMe: (me: Me | null) => void;
  signOut: () => Promise<void>;
  resetLocal: () => Promise<void>;
}

/** Testphase: einmalige Gutschrift zum Ausprobieren des Shops; Kennung ändern = erneute Gutschrift. Vor dem Release entfernen. */
const TEST_GRANT_ID = 'shop-test-1';
const TEST_GRANT_COINS = 10000;
/** Testphase: Tester mit diesem Kämpfernamen bekommen einmalig mindestens Level 25. Vor dem Release entfernen. */
const TEST_LEVEL_NAME = 'bushtiger';
const TEST_LEVEL = 25;
const K_PROGRESS = 'lvlme.progress.v1';
const K_PROFILE = 'lvlme.profile.v1';
const DEFAULT_PROFILE: Profile = { name: '', onboarded: false, shareMood: false, hair: DEFAULT_HAIR, body: DEFAULT_BODY, cloudSync: false };
const IS_IOS = Platform.OS === 'ios';

/** Welcher Fortschritt ist weiter? Mehr verbuchte Tage gewinnt, sonst Level, dann XP. */
function further(a: Progress, b: Progress): Progress {
  if (a.booked.length !== b.booked.length) return a.booked.length > b.booked.length ? a : b;
  if (a.level !== b.level) return a.level > b.level ? a : b;
  return a.xp >= b.xp ? a : b;
}

const Ctx = createContext<AppState | null>(null);

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}

async function writeJson(key: string, value: unknown): Promise<void> {
  try { await AsyncStorage.setItem(key, JSON.stringify(value)); } catch { /* Speichern ist best effort */ }
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [progress, setProgress] = useState<Progress>(NEW_PROGRESS);
  const [today, setToday] = useState<DayScore | null>(null);
  const [stepsToday, setStepsToday] = useState(0);
  const [activeKcalAvg, setActiveKcalAvg] = useState<number | null>(null);
  const [todayMetrics, setTodayMetrics] = useState<DailyMetrics | null>(null);
  const [source, setSource] = useState<DailyMetrics['source'] | null>(null);
  const [me, setMeState] = useState<Me | null>(null);
  const [signInMethod, setSignInMethod] = useState<'apple' | 'email' | null>(null);
  const [events, setEvents] = useState<LevelEvent[]>([]);
  const [goalEvents, setGoalEvents] = useState<LongGoal[]>([]);
  const busy = useRef(false);
  /** Laufender Upload ans Konto – beim Ausschalten des Syncs abwarten, damit danach nichts mehr ankommt */
  const uploadRef = useRef<Promise<void> | null>(null);
  const progressRef = useRef<Progress>(NEW_PROGRESS);
  const profileRef = useRef<Profile>(DEFAULT_PROFILE);
  const meRef = useRef<Me | null>(null);
  const todayRef = useRef<DayScore | null>(null);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { meRef.current = me; }, [me]);

  /** Körpertyp, der gezeigt und veröffentlicht wird: bei „automatisch“ aus den Körperwerten, sonst die Wahl. Outfits haben Vorrang. */
  const effectiveBody = (prof: Profile): BodyId => {
    const chosen = prof.body ?? DEFAULT_BODY;
    if (prof.autoBody === true && prof.bodyStats && chosen <= 4) return suggestBody(clampStats(prof.bodyStats)).id;
    return chosen;
  };

  /** Öffentlichen Avatar veröffentlichen. Ohne Backend oder Anmeldung: nichts tun. */
  const publish = useCallback(async () => {
    if (!social.isConfigured() || !meRef.current) return;
    const prof = profileRef.current;
    const name = prof.name || meRef.current.displayName;
    // Ältere gespeicherte Profile haben noch kein hair/body → Standard
    const appearance = { hair: prof.hair ?? DEFAULT_HAIR, body: effectiveBody(prof) };
    await social.publishAvatar(toPublic(name, progressRef.current, todayRef.current, { shareMood: prof.shareMood === true }, appearance));
  }, []);

  /** Kämpfernamen an den Server geben (der Apple-Name wird dort nicht übernommen). */
  const syncDisplayName = useCallback(async () => {
    const name = profileRef.current.name;
    if (!social.isConfigured() || !meRef.current || !name) return;
    await social.setDisplayName(name);
    meRef.current = { ...meRef.current, displayName: name };
    setMeState(meRef.current);
  }, []);

  /** Darf mit dem Konto synchronisiert werden? PC/Web immer (liest nur), iPhone nur mit Einwilligung. */
  const syncAllowed = useCallback(
    () => social.isConfigured() && meRef.current !== null && (!IS_IOS || profileRef.current.cloudSync === true),
    [],
  );

  /** Fortschritt mit dem Konto abgleichen: der weitere Stand gewinnt auf beiden Seiten. */
  const syncProgress = useCallback(async () => {
    if (!syncAllowed()) return;
    const remote = await social.loadProgress();
    const local = progressRef.current;
    const best = remote ? further(local, remote) : local;
    if (best !== local) {
      progressRef.current = best;
      setProgress(best);
      await writeJson(K_PROGRESS, best);
    }
    if (!remote || best !== remote) await social.saveProgress(best);
  }, [syncAllowed]);

  /** Langzeitziele prüfen, XP gutschreiben, Fortschritt und Ziele speichern. Liefert den neuen Fortschritt. */
  const applyLongGoals = useCallback(async (p: Progress, today: string, goalsIn?: LongGoal[]): Promise<{ progress: Progress; events: LevelEvent[] }> => {
    const list = goalsIn ?? sanitizeLongGoals(profileRef.current.longGoals);
    const ws = profileRef.current.bodyStats;
    const check = checkLongGoals(list, p, today, { weightKg: ws ? clampStats(ws).weightKg : undefined });
    if (check.completed.length === 0) return { progress: p, events: [] };
    const next = { ...profileRef.current, longGoals: check.goals };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    setGoalEvents(ev => [...ev, ...check.completed]);
    const r = awardXp(p, check.xp, longGoalCoins(check.xp));
    const events: LevelEvent[] = r.levelsGained > 0
      ? [{ id: `goal-${today}-${r.progress.level}`, kind: r.stageAfter > r.stageBefore ? 'stage' : 'level', level: r.progress.level, stage: r.stageAfter }]
      : [];
    return { progress: r.progress, events };
  }, []);

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      await syncProgress().catch(() => { /* offline: beim nächsten Mal */ });
      const days = await getHealthProvider().readDays(8);
      if (days.length === 0) { setToday(null); setTodayMetrics(null); setSource('cloud'); return; }
      // iPhone mit Einwilligung: Tageswerte fürs PC ins eigene Konto laden
      if (IS_IOS && syncAllowed()) {
        uploadRef.current = social.uploadHealthDays(days).catch(() => { /* offline: beim nächsten Mal */ });
      }
      const todayM = days[days.length - 1];
      const past = days.slice(0, -1);

      // Abgeschlossene Vortage verbuchen (älteste zuerst); jeder Tag zählt nur einmal
      let p = progressRef.current;
      const newEvents: LevelEvent[] = [];
      // Am PC ohne Anmeldung (Beispieldaten) nichts verbuchen, sonst landet Demo-Fortschritt später im Konto
      const bookable = IS_IOS || todayM.source !== 'demo' ? past : [];
      bookable.forEach((m, i) => {
        const prior = past.slice(0, i);
        const base = baselineFrom(prior.length >= 3 ? prior : past);
        const gx = goalXp(m, profileRef.current.goals !== undefined ? sanitizeGoals(profileRef.current.goals) : DEFAULT_GOALS);
        const r = bookDay(p, m, scoreDay(m, base), gx.xp, gx.coins);
        if (r.levelsGained > 0) {
          newEvents.push({
            id: `${m.date}-${r.progress.level}`,
            kind: r.stageAfter > r.stageBefore ? 'stage' : 'level',
            level: r.progress.level,
            stage: r.stageAfter,
          });
        }
        p = r.progress;
      });

      if (bookable.length > 0) {
        const lg = await applyLongGoals(p, todayM.date);
        p = lg.progress;
        newEvents.push(...lg.events);
      }

      const score = scoreDay(todayM, baselineFrom(past));
      todayRef.current = score;
      setToday(score);
      setStepsToday(todayM.steps);
      setActiveKcalAvg(avgActiveKcal(past));
      setTodayMetrics(todayM);
      setSource(todayM.source);
      if (p !== progressRef.current) {
        progressRef.current = p;
        setProgress(p);
        await writeJson(K_PROGRESS, p);
        if (syncAllowed()) social.saveProgress(p).catch(() => { /* offline: beim nächsten Mal */ });
      }
      if (newEvents.length) {
        // Mehrere Level-ups zusammenfassen: nur das höchste zeigen, Verwandlung hat Vorrang
        const top = newEvents.reduce((a, b) => (b.stage > a.stage || (b.stage === a.stage && b.level > a.level) ? b : a));
        const kind = newEvents.some(e => e.kind === 'stage') ? 'stage' : 'level';
        setEvents(ev => [...ev, { ...top, kind }]);
      }

      publish().catch(() => { /* offline: beim nächsten Mal */ });
    } catch {
      setError(IS_IOS
        ? 'Deine Gesundheitsdaten konnten gerade nicht gelesen werden. Zieh zum Aktualisieren nach unten oder prüfe in den Einstellungen unter Health › Datenzugriff, ob LvlMe lesen darf.'
        : 'Deine Werte konnten gerade nicht aus deinem Konto geladen werden. Prüfe deine Internetverbindung und lade die Seite neu.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [publish, syncProgress, syncAllowed, applyLongGoals]);

  // Start: gespeicherte Daten laden, dann Health lesen
  useEffect(() => {
    let alive = true;
    (async () => {
      const [prof, prog] = await Promise.all([
        readJson<Profile>(K_PROFILE, DEFAULT_PROFILE),
        readJson<Progress>(K_PROGRESS, NEW_PROGRESS),
      ]);
      if (!alive) return;
      // Bestehende Spieler behalten ihr gewähltes Outfit, auch wenn es jetzt im Shop Münzen kostet
      let prog2 = prog;
      const eq = prof.body ?? DEFAULT_BODY;
      if (eq >= 5 && !isOwned(prog, eq) && shopItem(eq)) { prog2 = { ...prog, owned: [...(prog.owned ?? []), eq] }; await writeJson(K_PROGRESS, prog2); }
      // TESTPHASE: einmalig 10.000 Münzen zum Ausprobieren des Shops. Vor dem Release entfernen (TEST_GRANT_COINS).
      let prof2 = prof;
      if (prof.testGrant !== TEST_GRANT_ID) {
        prog2 = awardCoins(prog2, TEST_GRANT_COINS);
        prof2 = { ...prof, testGrant: TEST_GRANT_ID };
        await writeJson(K_PROGRESS, prog2); await writeJson(K_PROFILE, prof2);
      }
      setProfile(prof2); profileRef.current = prof2;
      setProgress(prog2); progressRef.current = prog2;
      await applyTestLevel();
      if (social.isConfigured()) {
        try {
          const m = await social.getMe();
          if (alive) {
            setMeState(m); meRef.current = m;
            if (m) social.signInMethod().then(setSignInMethod).catch(() => {});
            // Server-Name weicht ab (z. B. noch der Apple-Name): Kämpfernamen nachziehen
            if (m && prof.name && m.displayName !== prof.name) syncDisplayName().catch(() => {});
          }
        } catch { /* offline */ }
      }
      if (alive) setReady(true);
      if (prof.onboarded) await refresh();
    })();
    return () => { alive = false; };
  }, [refresh, syncDisplayName]);

  /** Nach Anmeldung: Kämpfernamen setzen und Avatar veröffentlichen. */
  const setMe = useCallback((m: Me | null) => {
    meRef.current = m;
    setMeState(m);
    if (!m) { setSignInMethod(null); return; }
    (async () => {
      social.signInMethod().then(setSignInMethod).catch(() => {});
      try { await syncDisplayName(); } catch { /* offline: beim nächsten Start */ }
      // Nach der Anmeldung: Fortschritt abgleichen und (am PC) die Werte aus dem Konto laden
      if (profileRef.current.onboarded) await refresh();
      else try { await publish(); } catch { /* offline: beim nächsten Aktualisieren */ }
    })();
  }, [syncDisplayName, publish, refresh]);

  /** Testphase: Level 25 für den Tester „bushtiger“ (einmalig, nur hochsetzen) */
  const applyTestLevel = useCallback(async () => {
    const prof = profileRef.current;
    if (prof.testLevel || prof.name.trim().toLowerCase() !== TEST_LEVEL_NAME) return;
    const p = progressRef.current;
    const nextP = p.level >= TEST_LEVEL ? p : { ...p, level: TEST_LEVEL, xp: 0 };
    const next = { ...prof, testLevel: true };
    setProfile(next); profileRef.current = next;
    progressRef.current = nextP; setProgress(nextP);
    await writeJson(K_PROFILE, next); await writeJson(K_PROGRESS, nextP);
  }, []);

  const setName = useCallback(async (name: string) => {
    const next = { ...profileRef.current, name: name.trim().slice(0, 24) };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    await applyTestLevel();
    if (next.name) {
      try { await syncDisplayName(); } catch { /* offline: beim nächsten Start */ }
      publish().catch(() => {});
    }
  }, [syncDisplayName, publish, applyTestLevel]);

  const setShareMood = useCallback(async (on: boolean) => {
    const next = { ...profileRef.current, shareMood: on };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    // Sofort neu veröffentlichen, damit die Tagesform beim Abschalten auch vom Server verschwindet
    try { await publish(); } catch { /* offline: beim nächsten Aktualisieren */ }
  }, [publish]);

  const setHair = useCallback(async (hair: HairId) => {
    const next = { ...profileRef.current, hair };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    // Sofort neu veröffentlichen, damit Freunde die neue Frisur sehen
    try { await publish(); } catch { /* offline: beim nächsten Aktualisieren */ }
  }, [publish]);

  const setBody = useCallback(async (body: BodyId) => {
    if (!isOwned(progressRef.current, body)) return; // nicht gekaufte Outfits lassen sich nicht anziehen
    const next = { ...profileRef.current, body };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    // Sofort neu veröffentlichen, damit Freunde den neuen Körper sehen
    try { await publish(); } catch { /* offline: beim nächsten Aktualisieren */ }
  }, [publish]);

  const localDate = () => {
    const d = new Date();
    const z = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
  };

  /** Fortschritt nach einer Änderung an Langzeitzielen speichern (und ggf. synchronisieren) */
  const commitProgress = useCallback(async (p: Progress, evs: LevelEvent[]) => {
    if (p === progressRef.current) return;
    progressRef.current = p; setProgress(p);
    await writeJson(K_PROGRESS, p);
    if (syncAllowed()) social.saveProgress(p).catch(() => { /* offline: beim nächsten Mal */ });
    if (evs.length) setEvents(ev => [...ev, ...evs]);
    publish().catch(() => { /* offline */ });
  }, [publish, syncAllowed]);

  /** Körperwerte lokal speichern. Die Zahlen werden nie veröffentlicht; nur bei „automatisch“ geht der daraus abgeleitete Körpertyp an Freunde. */
  const setBodyStats = useCallback(async (stats: BodyStats, opts?: { fromImport?: boolean }) => {
    const next = { ...profileRef.current, bodyStats: clampStats(stats) };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    // Gewichtsverlust-Ziele prüfen; bei „automatisch“ hat sich evtl. auch die Figur geändert
    if (!opts?.fromImport) {
      const r = await applyLongGoals(progressRef.current, localDate());
      await commitProgress(r.progress, r.events);
    }
    if (next.autoBody === true) { try { await publish(); } catch { /* offline: beim nächsten Aktualisieren */ } }
  }, [applyLongGoals, commitProgress, publish]);

  const setAutoBody = useCallback(async (on: boolean) => {
    const next = { ...profileRef.current, autoBody: on };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    try { await publish(); } catch { /* offline: beim nächsten Aktualisieren */ }
  }, [publish]);

  const setCalorieSettings = useCallback(async (patch: Partial<CalorieSettings>) => {
    const cur = profileRef.current.calorie ?? {};
    const merged: CalorieSettings = { ...cur, ...patch };
    // „custom: undefined“ im Patch bedeutet bewusst: auf die Empfehlung zurücksetzen
    if ('custom' in patch && patch.custom === undefined) delete merged.custom;
    const next = { ...profileRef.current, calorie: merged };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
  }, []);

  /** Gewicht, Größe und KFA aus Apple Health übernehmen; bleibt auf dem Gerät. */
  const importBodyFromHealth = useCallback(async (): Promise<'ok' | 'none' | 'unavailable'> => {
    const prov = getHealthProvider();
    if (!IS_IOS || !prov.readBody) return 'unavailable';
    let b: Awaited<ReturnType<NonNullable<typeof prov.readBody>>> = null;
    try { b = await prov.readBody(); } catch { b = null; }
    if (!b) return 'none';
    const cur = clampStats(profileRef.current.bodyStats);
    await setBodyStats(clampStats({
      heightCm: b.heightCm ?? cur.heightCm,
      weightKg: b.weightKg ?? cur.weightKg,
      bodyFatPct: b.bodyFatPct ?? cur.bodyFatPct,
    }), { fromImport: true });
    if (b.bodyFatPct != null) await setCalorieSettings({ useBodyFat: true });
    return 'ok';
  }, [setBodyStats, setCalorieSettings]);

  const setWidget = useCallback(async (slot: SlotId, id: WidgetId | null) => {
    const layout = placeWidget(resolveLayout(profileRef.current.widgets), slot, id);
    const next = { ...profileRef.current, widgets: layout };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
  }, []);

  const resetWidgets = useCallback(async () => {
    const next = { ...profileRef.current, widgets: { ...DEFAULT_LAYOUT } };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
  }, []);

  const addLongGoal = useCallback(async (kind: LongGoalKind, target: number, title = '', unit = '', current = 0): Promise<'ok' | 'limit' | 'weight'> => {
    const open = sanitizeLongGoals(profileRef.current.longGoals).filter(g => !g.doneAt);
    if (open.length >= MAX_LONG_GOALS) return 'limit';
    const ws = profileRef.current.bodyStats ? clampStats(profileRef.current.bodyStats) : null;
    // Gewichtsverlust: braucht gespeicherte Körperwerte und endet spätestens bei BMI 20
    if (kind === 'weight_loss' && (!ws || target > maxWeightLossKg(ws) || open.some(o => o.kind === 'weight_loss'))) return 'weight';
    const g = newLongGoal(kind, target, progressRef.current, localDate(), title, unit, current, { weightKg: ws?.weightKg });
    const list = [...sanitizeLongGoals(profileRef.current.longGoals), g];
    const next = { ...profileRef.current, longGoals: list };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    const r = await applyLongGoals(progressRef.current, localDate(), list);
    await commitProgress(r.progress, r.events);
    return 'ok';
  }, [applyLongGoals, commitProgress]);

  const removeLongGoal = useCallback(async (id: string) => {
    const list = sanitizeLongGoals(profileRef.current.longGoals).filter(g => g.id !== id);
    const next = { ...profileRef.current, longGoals: list };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
  }, []);

  const setLongGoalValue = useCallback(async (id: string, value: number) => {
    const list = sanitizeLongGoals(profileRef.current.longGoals).map(g => (g.id === id && g.kind === 'custom' && !g.doneAt ? { ...g, current: Math.max(0, value) } : g));
    const next = { ...profileRef.current, longGoals: list };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    const r = await applyLongGoals(progressRef.current, localDate(), list);
    await commitProgress(r.progress, r.events);
  }, [applyLongGoals, commitProgress]);

  const equipCosmetic = useCallback(async (kind: 'aura' | 'scene', id: string | null) => {
    if (id !== null && (shopItem(id)?.kind !== kind || !isOwned(progressRef.current, id))) return;
    const cos = { ...(profileRef.current.cosmetics ?? {}) };
    if (id === null) delete cos[kind]; else cos[kind] = id;
    const next = { ...profileRef.current, cosmetics: cos };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
  }, []);

  /** Gegenstand kaufen (Outfit, Aura, Szene). Liefert 'ok' oder den Grund, warum es nicht ging. */
  const buyOutfit = useCallback(async (id: number | string): Promise<'ok' | 'owned' | 'poor' | 'unknown'> => {
    const r = buyShopItem(progressRef.current, id);
    if (!r.ok) return r.reason;
    await commitProgress(r.progress, []);
    return 'ok';
  }, [commitProgress]);

  const dismissGoalEvent = useCallback(() => setGoalEvents(ev => ev.slice(1)), []);

  /** Tagesziele speichern (nur lokal) */
  const setGoals = useCallback(async (goals: Goals) => {
    const next = { ...profileRef.current, goals: sanitizeGoals(goals) };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
  }, []);

  /**
   * Einwilligung für den Sync setzen. Die Rückfrage mit allen Infos zeigt der Profil-Screen vorher.
   * Ausschalten = Widerruf: Die hochgeladenen Daten werden im Konto gelöscht (wirft bei Fehler,
   * dann bleibt der Schalter an, damit nichts liegen bleibt, ohne dass der Nutzer es merkt).
   */
  const setCloudSync = useCallback(async (on: boolean) => {
    if (!on && profileRef.current.cloudSync && meRef.current) {
      if (uploadRef.current) await uploadRef.current;
      await social.clearSyncedData();
    }
    const next = { ...profileRef.current, cloudSync: on };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    // Beim Einschalten sofort hochladen
    if (on) await refresh();
  }, [refresh]);

  const finishOnboarding = useCallback(async () => {
    const next = { ...profileRef.current, onboarded: true };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try { await social.signOut(); } catch { /* egal */ }
    setMeState(null); meRef.current = null; setSignInMethod(null);
    // Die Einwilligung gilt für dieses Konto: nach dem Abmelden aus, damit ein anderes Konto nicht automatisch synchronisiert
    if (profileRef.current.cloudSync) {
      const next = { ...profileRef.current, cloudSync: false };
      setProfile(next); profileRef.current = next;
      await writeJson(K_PROFILE, next);
    }
  }, []);

  const resetLocal = useCallback(async () => {
    try { await AsyncStorage.multiRemove([K_PROGRESS, K_PROFILE]); } catch { /* egal */ }
    setProgress(NEW_PROGRESS); progressRef.current = NEW_PROGRESS;
    setProfile(DEFAULT_PROFILE); profileRef.current = DEFAULT_PROFILE;
    setToday(null); setTodayMetrics(null); todayRef.current = null; setEvents([]); setGoalEvents([]);
  }, []);

  const dismissEvent = useCallback(() => setEvents(ev => ev.slice(1)), []);

  const value = useMemo<AppState>(() => ({
    ready, loading, error,
    name: profile.name || me?.displayName || '',
    onboarded: profile.onboarded,
    shareMood: profile.shareMood === true,
    hair: profile.hair ?? DEFAULT_HAIR,
    body: effectiveBody(profile),
    cloudSync: profile.cloudSync === true,
    bodyStats: profile.bodyStats ? clampStats(profile.bodyStats) : null,
    autoBody: profile.autoBody === true && !!profile.bodyStats,
    calorieSettings: {
      age: sanitizeAge(profile.calorie?.age),
      ageSet: profile.calorie?.age !== undefined,
      sex: sanitizeSex(profile.calorie?.sex),
      useBodyFat: profile.calorie?.useBodyFat === true,
      goal: sanitizeGoal(profile.calorie?.goal),
      custom: sanitizeCustom(profile.calorie?.custom),
      noticeSeen: profile.calorie?.noticeSeen === true,
    },
    calorie: profile.bodyStats ? calorieTarget({
      stats: clampStats(profile.bodyStats),
      ageYears: sanitizeAge(profile.calorie?.age),
      ageKnown: profile.calorie?.age !== undefined,
      sex: sanitizeSex(profile.calorie?.sex),
      useBodyFat: profile.calorie?.useBodyFat === true,
      activeKcalAvg,
      goal: sanitizeGoal(profile.calorie?.goal),
      custom: sanitizeCustom(profile.calorie?.custom),
    }) : null,
    activeKcalAvg, setCalorieSettings, importBodyFromHealth,
    widgetLayout: resolveLayout(profile.widgets), setWidget, resetWidgets,
    coins: coinsOf(progress), buyOutfit, equipCosmetic,
    cosmetics: profile.cosmetics ?? {},
    setAutoBody,
    goals: profile.goals !== undefined ? sanitizeGoals(profile.goals) : DEFAULT_GOALS,
    longGoals: sanitizeLongGoals(profile.longGoals),
    goalEvents, dismissGoalEvent, addLongGoal, removeLongGoal, setLongGoalValue,
    todayMetrics,
    signInMethod,
    source, progress, today, stepsToday,
    stage: stageFor(progress.level),
    me, events, dismissEvent, refresh, setName, finishOnboarding, setShareMood, setHair, setBody, setBodyStats, setGoals, setCloudSync, setMe, signOut, resetLocal,
  }), [ready, loading, error, profile, signInMethod, source, progress, today, stepsToday, todayMetrics, goalEvents, dismissGoalEvent, buyOutfit, equipCosmetic, setCalorieSettings, importBodyFromHealth, setWidget, resetWidgets, activeKcalAvg, addLongGoal, removeLongGoal, setLongGoalValue, setAutoBody, me, events, dismissEvent, refresh, setName, finishOnboarding, setShareMood, setHair, setBody, setBodyStats, setGoals, setCloudSync, setMe, signOut, resetLocal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp() außerhalb von <AppStateProvider>');
  return v;
}
