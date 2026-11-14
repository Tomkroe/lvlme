/**
 * App-Zustand. Zuständig: app-ui.
 * - Fortschritt (Progress) und Profil lokal in AsyncStorage
 * - Health-Daten der letzten 8 Tage über getHealthProvider(); Vortage werden automatisch verbucht
 * - Öffentlicher Avatarzustand geht an das Backend, wenn konfiguriert und angemeldet;
 *   die Tagesform (mood) nur, wenn shareMood an ist (Standard: aus); Frisur und Körper immer
 * - Der Kämpfername aus dem Onboarding wird nach Anmeldung und bei Änderung per setDisplayName gesetzt
 * Gesundheitsrohdaten werden weder gespeichert noch gesendet noch geloggt.
 */
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BodyId, DailyMetrics, DayScore, HairId, Progress } from '../types.ts';
import { DEFAULT_BODY, DEFAULT_HAIR } from '../avatar/assets.ts';
import { NEW_PROGRESS, baselineFrom, bookDay, power as powerOf, scoreDay, stageFor, toPublic } from '../game/rules.ts';
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
  source: DailyMetrics['source'] | null;
  progress: Progress;
  today: DayScore | null;
  /** Schritte heute – nur zur Anzeige, wird nicht gespeichert */
  stepsToday: number;
  stage: number;
  power: number;
  me: Me | null;
  events: LevelEvent[];
  dismissEvent: () => void;
  refresh: () => Promise<void>;
  setName: (name: string) => Promise<void>;
  finishOnboarding: () => Promise<void>;
  setShareMood: (on: boolean) => Promise<void>;
  setHair: (hair: HairId) => Promise<void>;
  setBody: (body: BodyId) => Promise<void>;
  setMe: (me: Me | null) => void;
  signOut: () => Promise<void>;
  resetLocal: () => Promise<void>;
}

const K_PROGRESS = 'lvlme.progress.v1';
const K_PROFILE = 'lvlme.profile.v1';
const DEFAULT_PROFILE: Profile = { name: '', onboarded: false, shareMood: false, hair: DEFAULT_HAIR, body: DEFAULT_BODY };

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
  const [source, setSource] = useState<DailyMetrics['source'] | null>(null);
  const [me, setMeState] = useState<Me | null>(null);
  const [events, setEvents] = useState<LevelEvent[]>([]);
  const busy = useRef(false);
  const progressRef = useRef<Progress>(NEW_PROGRESS);
  const profileRef = useRef<Profile>(DEFAULT_PROFILE);
  const meRef = useRef<Me | null>(null);
  const todayRef = useRef<DayScore | null>(null);

  useEffect(() => { progressRef.current = progress; }, [progress]);
  useEffect(() => { profileRef.current = profile; }, [profile]);
  useEffect(() => { meRef.current = me; }, [me]);

  /** Öffentlichen Avatar veröffentlichen. Ohne Backend oder Anmeldung: nichts tun. */
  const publish = useCallback(async () => {
    if (!social.isConfigured() || !meRef.current) return;
    const prof = profileRef.current;
    const name = prof.name || meRef.current.displayName;
    // Ältere gespeicherte Profile haben noch kein hair/body → Standard
    const appearance = { hair: prof.hair ?? DEFAULT_HAIR, body: prof.body ?? DEFAULT_BODY };
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

  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError(null);
    try {
      const days = await getHealthProvider().readDays(8);
      if (days.length === 0) { setToday(null); return; }
      const todayM = days[days.length - 1];
      const past = days.slice(0, -1);

      // Abgeschlossene Vortage verbuchen (älteste zuerst); jeder Tag zählt nur einmal
      let p = progressRef.current;
      const newEvents: LevelEvent[] = [];
      past.forEach((m, i) => {
        const prior = past.slice(0, i);
        const base = baselineFrom(prior.length >= 3 ? prior : past);
        const r = bookDay(p, m, scoreDay(m, base));
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

      const score = scoreDay(todayM, baselineFrom(past));
      todayRef.current = score;
      setToday(score);
      setStepsToday(todayM.steps);
      setSource(todayM.source);
      if (p !== progressRef.current) {
        progressRef.current = p;
        setProgress(p);
        await writeJson(K_PROGRESS, p);
      }
      if (newEvents.length) {
        // Mehrere Level-ups zusammenfassen: nur das höchste zeigen, Verwandlung hat Vorrang
        const top = newEvents.reduce((a, b) => (b.stage > a.stage || (b.stage === a.stage && b.level > a.level) ? b : a));
        const kind = newEvents.some(e => e.kind === 'stage') ? 'stage' : 'level';
        setEvents(ev => [...ev, { ...top, kind }]);
      }

      publish().catch(() => { /* offline: beim nächsten Mal */ });
    } catch {
      setError('Deine Gesundheitsdaten konnten gerade nicht gelesen werden. Zieh zum Aktualisieren nach unten oder prüfe in den Einstellungen unter Health › Datenzugriff, ob LvlMe lesen darf.');
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [publish]);

  // Start: gespeicherte Daten laden, dann Health lesen
  useEffect(() => {
    let alive = true;
    (async () => {
      const [prof, prog] = await Promise.all([
        readJson<Profile>(K_PROFILE, DEFAULT_PROFILE),
        readJson<Progress>(K_PROGRESS, NEW_PROGRESS),
      ]);
      if (!alive) return;
      setProfile(prof); profileRef.current = prof;
      setProgress(prog); progressRef.current = prog;
      if (social.isConfigured()) {
        try {
          const m = await social.getMe();
          if (alive) {
            setMeState(m); meRef.current = m;
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
    if (!m) return;
    (async () => {
      try { await syncDisplayName(); } catch { /* offline: beim nächsten Start */ }
      try { await publish(); } catch { /* offline: beim nächsten Aktualisieren */ }
    })();
  }, [syncDisplayName, publish]);

  const setName = useCallback(async (name: string) => {
    const next = { ...profileRef.current, name: name.trim().slice(0, 24) };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    if (next.name) {
      try { await syncDisplayName(); } catch { /* offline: beim nächsten Start */ }
      publish().catch(() => {});
    }
  }, [syncDisplayName, publish]);

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
    const next = { ...profileRef.current, body };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    // Sofort neu veröffentlichen, damit Freunde den neuen Körper sehen
    try { await publish(); } catch { /* offline: beim nächsten Aktualisieren */ }
  }, [publish]);

  const finishOnboarding = useCallback(async () => {
    const next = { ...profileRef.current, onboarded: true };
    setProfile(next); profileRef.current = next;
    await writeJson(K_PROFILE, next);
    await refresh();
  }, [refresh]);

  const signOut = useCallback(async () => {
    try { await social.signOut(); } catch { /* egal */ }
    setMeState(null); meRef.current = null;
  }, []);

  const resetLocal = useCallback(async () => {
    try { await AsyncStorage.multiRemove([K_PROGRESS, K_PROFILE]); } catch { /* egal */ }
    setProgress(NEW_PROGRESS); progressRef.current = NEW_PROGRESS;
    setProfile(DEFAULT_PROFILE); profileRef.current = DEFAULT_PROFILE;
    setToday(null); todayRef.current = null; setEvents([]);
  }, []);

  const dismissEvent = useCallback(() => setEvents(ev => ev.slice(1)), []);

  const value = useMemo<AppState>(() => ({
    ready, loading, error,
    name: profile.name || me?.displayName || '',
    onboarded: profile.onboarded,
    shareMood: profile.shareMood === true,
    hair: profile.hair ?? DEFAULT_HAIR,
    body: profile.body ?? DEFAULT_BODY,
    source, progress, today, stepsToday,
    stage: stageFor(progress.level),
    power: powerOf(progress, today?.energy ?? 60),
    me, events, dismissEvent, refresh, setName, finishOnboarding, setShareMood, setHair, setBody, setMe, signOut, resetLocal,
  }), [ready, loading, error, profile, source, progress, today, stepsToday, me, events, dismissEvent, refresh, setName, finishOnboarding, setShareMood, setHair, setBody, setMe, signOut, resetLocal]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp() außerhalb von <AppStateProvider>');
  return v;
}
